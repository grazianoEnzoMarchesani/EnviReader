// Accesso ai risultati ENVI-met: selezione cartella, parsing EDX (XML) ed
// estrazione di slice dai binari EDT. Nessuna dipendenza esterna.
// I valori -999 dei file EDT sono il "no data" di ENVI-met e diventano NaN.

const FILE_PAIR_REGEX = /^(.+?)_((?:BIO_)?[A-Z]+)_(\d{4}-\d{2}-\d{2})(?:_(\d{2}\.\d{2}\.\d{2}))?\.(EDT|EDX)$/i;
const NO_DATA = -999;

// I float dei file EDT sono little-endian (vedi i `true` passati a
// getFloat32/getInt32 in tutto il file). Su hardware little-endian (praticamente
// tutti i browser: x86/x86_64/ARM in modalità LE) una Float32Array può leggere
// direttamente la stessa memoria del buffer senza ricopiarla/decodificarla
// elemento per elemento — molto più veloce di un loop di DataView.getFloat32
// su griglie grandi (vedi readVolumeVar, che ricarica l'intero volume vento
// ad ogni cambio di istante).
const IS_LITTLE_ENDIAN = new Int16Array(new Int8Array([1, 0]).buffer)[0] === 1;

/* ---------- selezione della cartella dei risultati ---------- */

// onGranted viene chiamato quando l'utente ha scelto la cartella e concesso il
// permesso, prima della scansione dei file: è il momento di mostrare il caricamento.
export async function pickDirectory(onGranted) {
  if ('showDirectoryPicker' in window) {
    try {
      const handle = await window.showDirectoryPicker();
      onGranted?.();
      return { rootDir: handle.name, structure: await buildFromHandle(handle) };
    } catch (err) {
      if (err?.name === 'AbortError') return null;
      throw err;
    }
  }
  return pickWithInput(onGranted);
}

async function buildFromHandle(dirHandle) {
  const structure = {};
  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file') {
      (structure.files ||= []).push(await entry.getFile());
    } else {
      structure[entry.name] = await buildFromHandle(entry);
    }
  }
  return structure;
}

// Fallback per browser senza File System Access API (Firefox, Safari)
function pickWithInput(onGranted) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.addEventListener('change', () => {
      const files = Array.from(input.files || []);
      if (files.length) onGranted?.();
      resolve(files.length ? structureFromFileList(files) : null);
    });
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

export function structureFromFileList(files) {
  const structure = {};
  let rootDir = '';
  for (const file of files) {
    const parts = (file.webkitRelativePath || file.name).split('/');
    if (parts.length > 1) rootDir = parts[0];
    let node = structure;
    for (const dir of parts.slice(1, -1)) node = node[dir] ||= {};
    (node.files ||= []).push(file);
  }
  return { rootDir, structure };
}

/* ---------- nome della simulazione dal file SIMX ---------- */

// Il SIMX in inputData è quasi-XML (radice non standard, spazi nei valori):
// si estrae <simName> con una regex invece del DOMParser.
export async function readSimName(structure) {
  const simx = findSimxFile(structure);
  if (!simx) return null;
  try {
    const text = decodeEDXText(await simx.arrayBuffer());
    const name = text.match(/<simName>([^<]*)<\/simName>/i)?.[1].trim();
    return name || null;
  } catch {
    return null;
  }
}

function findSimxFile(structure) {
  for (const file of structure.files || []) {
    if (/\.simx$/i.test(file.name)) return file;
  }
  for (const [key, value] of Object.entries(structure)) {
    if (key === 'files' || typeof value !== 'object' || Array.isArray(value)) continue;
    const found = findSimxFile(value);
    if (found) return found;
  }
  return null;
}

/* ---------- navigazione della struttura ---------- */

export function getFilesInFolder(structure, path) {
  let node = structure;
  if (path) {
    for (const part of path.split('/')) {
      node = node?.[part];
      if (!node) return [];
    }
  }
  return node.files || [];
}

// Elenca i percorsi (relativi alla radice) che contengono almeno una coppia EDT/EDX
export function listDataGroups(structure, prefix = '') {
  const groups = [];
  if (getFileCoupleSeries(structure.files || []).length > 0) groups.push(prefix);
  for (const [key, value] of Object.entries(structure)) {
    if (key === 'files' || typeof value !== 'object' || Array.isArray(value)) continue;
    groups.push(...listDataGroups(value, prefix ? `${prefix}/${key}` : key));
  }
  return groups.sort();
}

// Accoppia i file EDT/EDX con lo stesso nome base e li ordina cronologicamente
export function getFileCoupleSeries(files) {
  const pairs = new Map();
  for (const file of files) {
    const match = file.name.match(FILE_PAIR_REGEX);
    if (!match) continue;
    const [, name, type, date, time, ext] = match;
    const key = time ? `${name}_${type}_${date}_${time}` : `${name}_${type}_${date}`;
    if (!pairs.has(key)) pairs.set(key, {});
    pairs.get(key)[ext.toUpperCase()] = file;
  }
  return Array.from(pairs.values())
    .filter((pair) => pair.EDT && pair.EDX)
    .sort((a, b) => a.EDT.name.localeCompare(b.EDT.name));
}

// "MYSIM_AT_2023-06-21_14.00.01.EDT" → "2023-06-21 · 14:00"
export function seriesLabel(fileName) {
  const match = fileName.match(FILE_PAIR_REGEX);
  if (!match) return fileName;
  const [, , , date, time] = match;
  return time ? `${date} · ${time.replace(/\./g, ':').slice(0, 5)}` : date;
}

/* ---------- parsing EDX ---------- */

const edxCache = new WeakMap();

export function readEDX(file) {
  let promise = edxCache.get(file);
  if (!promise) {
    promise = parseEDX(file);
    edxCache.set(file, promise);
  }
  return promise;
}

// Contenuto testuale di un tag di primo livello, via regex invece del
// DOMParser: l'EDX è un XML piatto (tag leaf con solo numeri/liste separate
// da virgola, nessuna struttura annidata da attraversare), quindi non serve
// un parser DOM vero — ed è un bene, perché DOMParser non esiste nei Web
// Worker (usato da loadWindVolume per il campo di vento volumetrico, vedi
// windVolumeWorker.js). Stessa scelta già fatta per l'INX (vedi inx.js).
function tagText(xmlText, tag) {
  const m = xmlText.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? m[1].trim() : '';
}

async function parseEDX(file) {
  const buffer = await file.arrayBuffer();
  const xmlText = decodeEDXText(buffer);
  const num = (tag) => parseInt(tagText(xmlText, tag) || '0', 10);
  const nums = (tag) =>
    tagText(xmlText, tag)
      .split(',')
      .map((s) => parseFloat(s.trim()))
      .filter(Number.isFinite);
  const sum = (arr) => arr.reduce((a, b) => a + b, 0);

  const dimensions = { x: num('nr_xdata'), y: num('nr_ydata'), z: num('nr_zdata') };
  const spacing = { x: nums('spacing_x'), y: nums('spacing_y'), z: nums('spacing_z') };
  return {
    dimensions,
    spacing,
    extent: { x: sum(spacing.x), y: sum(spacing.y), z: sum(spacing.z) },
    nrVariables: num('nr_variables'),
    variableNames: tagText(xmlText, 'name_variables')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

// I file EDX di ENVI-met possono essere UTF-8 oppure ISO-8859-1 (es. il simbolo °)
function decodeEDXText(buffer) {
  const utf8 = new TextDecoder('utf-8').decode(buffer);
  if (!utf8.includes('�')) return utf8;
  return new TextDecoder('iso-8859-1').decode(buffer);
}

/* ---------- variabili del campo di vento ---------- */

// Cerca le tre componenti del flusso ("Flow u/v/w (m/s)") tra le variabili
// di un EDX atmosfera; null se il gruppo dati non le contiene tutte.
const WIND_PATTERNS = { u: /flow\s*u/i, v: /flow\s*v/i, w: /flow\s*w/i };

export function findWindVariables(variableNames) {
  const found = {};
  for (const [comp, pattern] of Object.entries(WIND_PATTERNS)) {
    found[comp] = variableNames.find((name) => pattern.test(name)) ?? null;
  }
  return found.u && found.v && found.w ? found : null;
}

/* ---------- sezioni ruotate in pianta ---------- */

// Traccia in pianta di una sezione verticale ruotata di `angleDeg` attorno al
// perno (px, py), in coordinate di griglia. La sezione resta un piano
// verticale: ruota solo la sua traccia in pianta. A 0° la traccia della
// sezione X è la colonna x=px (direzione (0,1)) e quella della sezione Y è la
// riga y=py (direzione (1,0)); l'angolo è antiorario con la y verso l'alto.
// I campioni sono a passo 1 cella lungo la linea, col perno esattamente su un
// campione (pivotIndex), così l'incrocio delle sezioni cade su una colonna.
export function sectionLinePath(dims, px, py, angleDeg, which) {
  const rad = (angleDeg * Math.PI) / 180;
  const dx = which === 'sectionX' ? -Math.sin(rad) : Math.cos(rad);
  const dy = which === 'sectionX' ? Math.cos(rad) : Math.sin(rad);
  // intervallo del parametro t (t=0 sul perno) che tiene la linea nel dominio
  let tMin = -Infinity;
  let tMax = Infinity;
  for (const [p, d, size] of [[px, dx, dims.x], [py, dy, dims.y]]) {
    if (Math.abs(d) < 1e-9) continue;
    const a = (0 - p) / d;
    const b = (size - 1 - p) / d;
    tMin = Math.max(tMin, Math.min(a, b));
    tMax = Math.min(tMax, Math.max(a, b));
  }
  const iMin = Math.ceil(tMin - 1e-6);
  const iMax = Math.floor(tMax + 1e-6);
  const n = Math.max(1, iMax - iMin + 1);
  return { x0: px + iMin * dx, y0: py + iMin * dy, dx, dy, n, pivotIndex: -iMin };
}

/* ---------- lettura EDT ed estrazione di slice ---------- */

const edtBufferCache = new WeakMap();

function getDataView(file) {
  let promise = edtBufferCache.get(file);
  if (!promise) {
    promise = file.arrayBuffer().then((buffer) => new DataView(buffer));
    edtBufferCache.set(file, promise);
  }
  return promise;
}

// config: { level, terrain } | { sectionX, biometFix?, objectsVarIndex? } |
// { sectionY, biometFix?, objectsVarIndex? } | { line, biometFix?, objectsVarIndex? }
// biometFix corregge il bug storico di ENVI-met sui dataset biomet (PMV/PET/
// SET/UTCI) in sezione: l'export non tiene conto di dove sono edifici/
// terreno, "schiacciando" la sezione contro il fondo del dominio. Per
// colonna: si conta quante celle sono occupate da edificio/terreno partendo
// dal basso (layer Objects, stesso file, objectsVarIndex — non una formula
// sul terreno, ma la verità già disponibile) e si trasla l'intera colonna
// grezza in alto di quella quantità; quello che esce dal dominio in alto
// viene tagliato, lo spazio liberato in basso resta vuoto (NaN).
export function extractSlice(dataView, dims, varIndex, config) {
  const { x: dimX, y: dimY, z: dimZ } = dims;
  const { level = null, sectionX = null, sectionY = null, terrain = null, line = null, biometFix = false, objectsVarIndex = null } = config;
  const BYTES = 4;
  const varOffset = varIndex * dimX * dimY * dimZ * BYTES;
  const objectsOffset = objectsVarIndex != null ? objectsVarIndex * dimX * dimY * dimZ * BYTES : null;

  const read = (offset) => {
    if (offset + BYTES > dataView.byteLength) return NaN;
    const value = dataView.getFloat32(offset, true);
    return value === NO_DATA || Number.isNaN(value) ? NaN : value;
  };

  // 1 = edificio, 2 = terreno/suolo (vedi objectsToImageData in colormap.js):
  // le uniche categorie "solide" che bloccano il posto del dato biomet.
  const isOccupied = (x, y, z) => {
    if (objectsOffset === null) return false;
    const rv = Math.round(read(objectsOffset + ((z * dimY + y) * dimX + x) * BYTES));
    return rv === 1 || rv === 2;
  };
  const freeZ = (x, y) => {
    let z = 0;
    while (z < dimZ - 1 && isOccupied(x, y, z)) z++;
    return z;
  };
  // Trasla in alto le celle grezze con un valore reale, saltando i NaN già
  // presenti nel dato grezzo (non li si trascina posizionalmente, altrimenti
  // i vuoti interni alla colonna aprono voragini che risalgono il dominio):
  // shift = quante celle sono occupate da edificio/terreno partendo dal
  // basso; da lì impila solo i valori reali, di seguito, senza buchi tra
  // loro; quello che esce dal dominio in alto viene tagliato.
  const compactColumn = (readAt, x, y) => {
    const shift = freeZ(x, y);
    const out = new Array(dimZ).fill(NaN);
    let z = shift;
    for (let s = 0; s < dimZ && z < dimZ; s++) {
      const v = readAt(s);
      if (Number.isNaN(v)) continue;
      out[z] = v;
      z++;
    }
    return out;
  };

  if (level !== null) {
    const out = new Float32Array(dimX * dimY);
    for (let i = 0; i < out.length; i++) {
      const x = i % dimX;
      const y = (i / dimX) | 0;
      let k = level;
      if (terrain) k = Math.min(Math.floor(terrain.data[i] * terrain.gain + terrain.base), dimZ - 1);
      out[i] = read(varOffset + ((k * dimY + y) * dimX + x) * BYTES);
    }
    return out;
  }
  if (sectionX !== null) {
    const out = new Float32Array(dimY * dimZ);
    for (let y = 0; y < dimY; y++) {
      const readAt = (z) => read(varOffset + ((z * dimY + y) * dimX + sectionX) * BYTES);
      const col = biometFix ? compactColumn(readAt, sectionX, y) : null;
      for (let z = 0; z < dimZ; z++) out[z * dimY + y] = col ? col[z] : readAt(z);
    }
    return out;
  }
  if (sectionY !== null) {
    const out = new Float32Array(dimX * dimZ);
    for (let x = 0; x < dimX; x++) {
      const readAt = (z) => read(varOffset + ((z * dimY + sectionY) * dimX + x) * BYTES);
      const col = biometFix ? compactColumn(readAt, x, sectionY) : null;
      for (let z = 0; z < dimZ; z++) out[z * dimX + x] = col ? col[z] : readAt(z);
    }
    return out;
  }
  if (line !== null) {
    // sezione ruotata: campiona la colonna verticale più vicina a ogni punto
    // della traccia in pianta (nearest neighbour, coerente col rendering a celle)
    const out = new Float32Array(line.n * dimZ);
    for (let i = 0; i < line.n; i++) {
      const x = Math.min(dimX - 1, Math.max(0, Math.round(line.x0 + line.dx * i)));
      const y = Math.min(dimY - 1, Math.max(0, Math.round(line.y0 + line.dy * i)));
      const readAt = (z) => read(varOffset + ((z * dimY + y) * dimX + x) * BYTES);
      const col = biometFix ? compactColumn(readAt, x, y) : null;
      for (let z = 0; z < dimZ; z++) out[z * line.n + i] = col ? col[z] : readAt(z);
    }
    return out;
  }
  return null;
}

// true se il dataset corrente è un output biomet (PMV/PET/SET/UTCI): quei
// campi sono validi solo alla quota pedonale, vedi la nota su extractSlice.
// Il nome del gruppo dati ("biomet1", "biomet/UTCI", ...) non è standardizzato
// tra le versioni/esportazioni di ENVI-met, quindi il segnale primario è il
// nome della variabile stessa (sempre presente e visibile in UI); il gruppo
// resta un fallback per i casi in cui il nome variabile non bastasse.
const BIOMET_DATASET_PATTERN = /utci|\bpet\b|\bset\b|\bpmv\b/i;
export function isBiometDataset(dataGroup, datasetName) {
  return BIOMET_DATASET_PATTERN.test(datasetName || '') || /^biomet/i.test(dataGroup || '');
}

// true se il gruppo dati corrente non ha estensione verticale (un solo
// livello Z, es. "Surface"): le sezioni Longitudinal/Transverse tagliano in
// altezza, quindi su questi gruppi non mostrerebbero altro che una linea
// piatta e vanno nascoste (vista, thumbnail, export).
export function hasVerticalExtent(dims) {
  return !!dims && dims.z > 1;
}

// Estrae uno slice e lo confeziona con dimensioni, estensioni fisiche e range
export async function loadSlice(edtFile, edxInfo, variableName, config) {
  const varIndex = edxInfo.variableNames.indexOf(variableName);
  if (varIndex === -1) return null;

  const dataView = await getDataView(edtFile);
  let effectiveConfig = config;
  if (config.biometFix) {
    const objIdx = edxInfo.variableNames.findIndex((n) => /objects/i.test(n));
    effectiveConfig = { ...config, objectsVarIndex: objIdx === -1 ? null : objIdx };
  }
  const data = extractSlice(dataView, edxInfo.dimensions, varIndex, effectiveConfig);
  if (!data) return null;

  const { dimensions: dims, extent } = edxInfo;
  let w, h, extentW, extentH, spacingX, spacingY;
  if (config.line != null) {
    // estensione fisica lungo la traccia: passo cella medio proiettato sulla direzione
    const mx = dims.x ? extent.x / dims.x : 1;
    const my = dims.y ? extent.y / dims.y : 1;
    w = config.line.n; h = dims.z;
    extentW = config.line.n * Math.hypot(config.line.dx * mx, config.line.dy * my);
    extentH = extent.z;
    spacingX = Array(w).fill(extentW / w);
    spacingY = edxInfo.spacing.z;
  } else if (config.sectionX != null) {
    w = dims.y; h = dims.z; extentW = extent.y; extentH = extent.z;
    spacingX = edxInfo.spacing.y;
    spacingY = edxInfo.spacing.z;
  } else if (config.sectionY != null) {
    w = dims.x; h = dims.z; extentW = extent.x; extentH = extent.z;
    spacingX = edxInfo.spacing.x;
    spacingY = edxInfo.spacing.z;
  } else {
    w = dims.x; h = dims.y; extentW = extent.x; extentH = extent.y;
    spacingX = edxInfo.spacing.x;
    spacingY = edxInfo.spacing.y;
  }

  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    if (Number.isNaN(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === Infinity) { min = 0; max = 0; }

  return {
    data, w, h, extentW: extentW || w, extentH: extentH || h, min, max,
    spacingX, spacingY,
    // per le sezioni ruotate: mappatura colonna → cella di pianta e colonna del perno
    ...(config.line != null ? { line: config.line, pivotIndex: config.line.pivotIndex } : {}),
  };
}

// Valore della cella (x, y) al livello dato per ogni istante della serie:
// legge solo i 4 byte che servono da ciascun EDT, senza caricare i file interi
export async function loadPointSeries(series, variableName, { x, y, level, terrain }) {
  return Promise.all(
    series.map(async (pair) => {
      const edx = await readEDX(pair.EDX);
      const dims = edx.dimensions;
      const varIndex = edx.variableNames.indexOf(variableName);
      if (varIndex === -1) return NaN;
      const cx = Math.min(x, dims.x - 1);
      const cy = Math.min(y, dims.y - 1);
      let k = Math.min(level, dims.z - 1);
      if (terrain) k = Math.min(Math.floor(terrain.data[cy * dims.x + cx] * terrain.gain + terrain.base), dims.z - 1);
      const offset = (((varIndex * dims.z + k) * dims.y + cy) * dims.x + cx) * 4;
      const buffer = await pair.EDT.slice(offset, offset + 4).arrayBuffer();
      if (buffer.byteLength < 4) return NaN;
      const value = new DataView(buffer).getFloat32(0, true);
      return value === NO_DATA || Number.isNaN(value) ? NaN : value;
    }),
  );
}

// Volume completo (tutti gli x,y,z) della variabile "Objects" dei risultati,
// usato per ricostruire la vegetazione nel viewer 3D: si scandagliano i gruppi
// dati finché non si trova un EDX che la contiene (nome variabile non fisso).
export async function loadObjectsVolume(structure) {
  for (const group of listDataGroups(structure)) {
    const series = getFileCoupleSeries(getFilesInFolder(structure, group));
    if (!series.length) continue;
    try {
      const edx = await readEDX(series[0].EDX);
      const varIndex = edx.variableNames.findIndex((name) => /objects/i.test(name));
      if (varIndex === -1) continue;
      const { x: dimX, y: dimY, z: dimZ } = edx.dimensions;
      const n = dimX * dimY * dimZ;
      const varOffset = varIndex * n * 4;
      const dataView = await getDataView(series[0].EDT);
      if (varOffset + n * 4 > dataView.byteLength) continue;
      const data = new Float32Array(n);
      for (let idx = 0; idx < n; idx++) {
        const v = dataView.getFloat32(varOffset + idx * 4, true);
        data[idx] = v === NO_DATA ? NaN : v;
      }
      return { dims: edx.dimensions, data };
    } catch {
      // gruppo illeggibile o senza la variabile: prova il successivo
    }
  }
  return null;
}

// Legge una variabile intera (I×J×Z) da un EDT già aperto: stessa lettura
// grezza di loadObjectsVolume, fattorizzata perché loadWindVolume la ripete
// tre volte (u, v, w) sullo stesso file. Su hardware little-endian (vedi
// IS_LITTLE_ENDIAN) la sorgente è una vista Float32Array a costo zero sullo
// stesso buffer, invece del loop di DataView.getFloat32 elemento per elemento
// (molto più lento su griglie grandi, ricaricate ad ogni cambio di istante).
function readVolumeVar(dataView, varIndex, n) {
  const varOffset = varIndex * n * 4;
  if (varOffset + n * 4 > dataView.byteLength) return null;
  const data = new Float32Array(n);
  if (IS_LITTLE_ENDIAN) {
    const src = new Float32Array(dataView.buffer, dataView.byteOffset + varOffset, n);
    for (let idx = 0; idx < n; idx++) {
      const v = src[idx];
      data[idx] = v === NO_DATA ? NaN : v;
    }
  } else {
    for (let idx = 0; idx < n; idx++) {
      const v = dataView.getFloat32(varOffset + idx * 4, true);
      data[idx] = v === NO_DATA ? NaN : v;
    }
  }
  return data;
}

// Volume vento (u, v, w) dell'intero dominio 3D per un fileset/gruppo/istante:
// a differenza di loadObjectsVolume (geometria statica, invariante nel tempo)
// qui gruppo e istante contano, quindi va ricaricato ad ogni cambio. Usata dal
// campo di vento volumetrico del viewer 3D (a differenza di loadSlice/
// useWindField, che caricano solo la proiezione su un piano alla volta).
export async function loadWindVolume(structure, groupPath, timeIndex) {
  const series = getFileCoupleSeries(getFilesInFolder(structure, groupPath));
  if (!series.length) return null;
  const pair = series[Math.min(Math.max(0, timeIndex), series.length - 1)];
  const edx = await readEDX(pair.EDX);
  const names = findWindVariables(edx.variableNames);
  if (!names) return null;
  const { x: dimX, y: dimY, z: dimZ } = edx.dimensions;
  const n = dimX * dimY * dimZ;
  const dataView = await getDataView(pair.EDT);
  const u = readVolumeVar(dataView, edx.variableNames.indexOf(names.u), n);
  const v = readVolumeVar(dataView, edx.variableNames.indexOf(names.v), n);
  const w = readVolumeVar(dataView, edx.variableNames.indexOf(names.w), n);
  if (!u || !v || !w) return null;
  let maxMag = 0;
  for (let i = 0; i < n; i++) {
    const mag = Math.hypot(u[i], v[i], w[i]);
    if (mag > maxMag) maxMag = mag;
  }
  return { dims: edx.dimensions, u, v, w, maxMag };
}

// Quota del terreno dai risultati solaraccess/ground, per "segui il terreno":
// { data: indice z per cella, max: quota massima } — il massimo, calcolato una
// volta sola qui, è il piano d'arrivo di "livella salendo"
export async function loadTerrain(structure) {
  const series = getFileCoupleSeries(getFilesInFolder(structure, 'solaraccess/ground'));
  if (!series.length) return null;
  try {
    const edx = await readEDX(series[0].EDX);
    const dataView = await getDataView(series[0].EDT);
    const n = edx.dimensions.x * edx.dimensions.y;
    const base = 3 * n * 4; // quarta variabile del file solar access
    if (base + n * 4 > dataView.byteLength) return null;
    const data = new Float32Array(n);
    let max = 0;
    for (let i = 0; i < n; i++) {
      const v = dataView.getFloat32(base + i * 4, true);
      data[i] = v;
      if (v > max) max = v;
    }
    return { data, max };
  } catch {
    return null;
  }
}

// Quota di taglio per "segui il terreno": nelle estrazioni k = floor(gain·terreno + base),
// una sola moltiplicazione+somma per cella. Da solo è l'offset puro (gain 1, base level);
// con "livella salendo" il rilievo si smorza linearmente salendo (t = level/transizione)
// verso il piano orizzontale a terrenoMax + level. La quota risultante non scende mai
// sotto terreno + level, quindi il taglio non entra mai nel terreno.
export function terrainCut(terrain, level, levelOut, transition) {
  if (!terrain) return null;
  const t = levelOut ? Math.min(level / Math.max(1, transition), 1) : 0;
  return { data: terrain.data, gain: 1 - t, base: t * terrain.max + level };
}

// Profilo del taglio lungo una sezione: per ogni colonna dello slice, l'indice z
// che la pianta campiona davvero con questa quota di taglio (stessa formula di
// extractSlice, stesso nearest-neighbour delle sezioni ruotate). Serve solo a
// disegnare la linea del livello nelle sezioni; null = linea dritta.
export function terrainCutProfile(cut, dims, slice, viewType, sectionX, sectionY) {
  if (!cut || !dims || !slice) return null;
  const clampI = (v, max) => Math.min(Math.max(0, v), max);
  const out = new Array(slice.w);
  for (let i = 0; i < slice.w; i++) {
    const x = slice.line ? Math.round(slice.line.x0 + slice.line.dx * i) : viewType === 'sectionX' ? sectionX : i;
    const y = slice.line ? Math.round(slice.line.y0 + slice.line.dy * i) : viewType === 'sectionX' ? i : sectionY;
    const cell = clampI(y, dims.y - 1) * dims.x + clampI(x, dims.x - 1);
    out[i] = Math.min(Math.floor(cut.data[cell] * cut.gain + cut.base), dims.z - 1);
  }
  return out;
}
