// Parser del file INX (area input di ENVI-met). Il formato è quasi-XML:
// tag che iniziano per cifra (<3Dplants>), elementi ripetuti alla radice e
// valori con spazi rendono inaffidabile il DOMParser, quindi il parsing è
// fatto a righe con regex. Gestisce sia i modelli 2.5D sia quelli full 3D.

/* ---------- individuazione del file nel fileset ---------- */

export function findInxFile(structure) {
  for (const file of structure.files || []) {
    if (/\.inx$/i.test(file.name)) return file;
  }
  for (const [key, value] of Object.entries(structure)) {
    if (key === 'files' || typeof value !== 'object' || Array.isArray(value)) continue;
    const found = findInxFile(value);
    if (found) return found;
  }
  return null;
}

/* ---------- parsing di basso livello ---------- */

// Divide il testo in blocchi <tag>...</tag> di primo livello (dentro la radice)
function splitBlocks(text) {
  const blocks = [];
  const regex = /<([\w-]+|3Dplants)((?:\s+[\w-]+="[^"]*")*)\s*>([\s\S]*?)<\/\1>/g;
  const inner = text.replace(/^[\s\S]*?<ENVI-MET_Datafile>/, '').replace(/<\/ENVI-MET_Datafile>[\s\S]*$/, '');
  let match;
  while ((match = regex.exec(inner)) !== null) {
    blocks.push({ tag: match[1], attrs: parseAttrs(match[2]), body: match[3] });
  }
  return blocks;
}

function parseAttrs(str) {
  const attrs = {};
  for (const [, k, v] of str.matchAll(/([\w-]+)="([^"]*)"/g)) attrs[k] = v;
  return attrs;
}

// Estrae le foglie <tag>valore</tag> di un blocco come oggetto { tag: valore }
function parseLeaves(body) {
  const out = {};
  for (const [, tag, value] of body.matchAll(/<([\w-]+)>([^<]*)<\/\1>/g)) out[tag] = value.trim();
  return out;
}

const num = (v) => (v == null || v.trim?.() === '' ? null : Number(v));

// Matrice densa I×J: una riga di testo per j, valori separati da virgola.
// numeric=false restituisce stringhe (ID materiale), altrimenti Float32Array.
function parseMatrix(body, attrs, numeric = true) {
  const I = parseInt(attrs.dataI, 10);
  const J = parseInt(attrs.dataJ, 10);
  const rows = body.split('\n').map((r) => r.trim()).filter(Boolean);
  const data = numeric ? new Float32Array(I * J) : new Array(I * J).fill('');
  for (let j = 0; j < Math.min(J, rows.length); j++) {
    const cells = rows[j].split(',');
    for (let i = 0; i < Math.min(I, cells.length); i++) {
      const cell = cells[i].trim();
      data[j * I + i] = numeric ? (cell === '' ? 0 : Number(cell)) : cell;
    }
  }
  return { I, J, data };
}

// Matrice sparsa 3D: righe "i,j,k,val..." con numero di campi variabile
function parseSparse(body, attrs) {
  const entries = [];
  for (const row of body.split('\n')) {
    const cells = row.trim().split(',');
    if (cells.length < 4) continue;
    const i = parseInt(cells[0], 10);
    const j = parseInt(cells[1], 10);
    const k = parseInt(cells[2], 10);
    if (!Number.isFinite(i) || !Number.isFinite(j) || !Number.isFinite(k)) continue;
    entries.push({ i, j, k, values: cells.slice(3).map((c) => c.trim()) });
  }
  return {
    I: parseInt(attrs.dataI, 10),
    J: parseInt(attrs.dataJ, 10),
    K: parseInt(attrs.zlayers, 10),
    entries,
  };
}

/* ---------- parsing del modello ---------- */

const MATRIX_STRING_IDS = new Set(['ID_plants1D', 'ID_soilprofile', 'ID_sources']);

export function parseINX(text) {
  const model = {
    header: {}, geometry: {}, geometry3D: null, location: {},
    buildings2D: {}, soils: null, plants1D: null, terrain: null,
    plants3D: [], receptors: [], buildingInfo: new Map(),
    buildings3D: null, wallDB: null,
  };

  for (const block of splitBlocks(text)) {
    const { tag, body } = block;
    if (tag === 'Header') model.header = parseLeaves(body);
    else if (tag === 'modelGeometry') {
      const g = parseLeaves(body);
      model.geometry = {
        I: num(g['grids-I']), J: num(g['grids-J']), Z: num(g['grids-Z']),
        dx: num(g.dx), dy: num(g.dy), dz: num(g['dz-base']),
        useTelescoping: num(g.useTelescoping_grid) === 1,
        useSplitting: num(g.useSplitting) === 1,
        verticalStretch: num(g.verticalStretch) || 0,
        startStretch: num(g.startStretch) || 0,
        has3DModel: num(g.has3DModel) === 1,
        isFull3DDesign: num(g.isFull3DDesign) === 1,
      };
    } else if (tag === 'modelGeometry3D') {
      const g = parseLeaves(body);
      model.geometry3D = { I: num(g['grids3D-I']), J: num(g['grids3D-J']), K: num(g['grids3D-K']) };
    } else if (tag === 'locationData') {
      const l = parseLeaves(body);
      model.location = {
        name: l.locationName ?? '',
        rotation: num(l.modelRotation) || 0,
        longitude: num(l.location_Longitude),
        latitude: num(l.location_Latitude),
      };
    } else if (tag === 'buildings2D') {
      for (const sub of splitBlocks(`<ENVI-MET_Datafile>${body}</ENVI-MET_Datafile>`)) {
        if (sub.attrs.type === 'matrix-data') model.buildings2D[sub.tag] = parseMatrix(sub.body, sub.attrs);
      }
    } else if (tag === 'simpleplants2D' || tag === 'soils2D' || tag === 'dem') {
      for (const sub of splitBlocks(`<ENVI-MET_Datafile>${body}</ENVI-MET_Datafile>`)) {
        if (sub.attrs.type !== 'matrix-data') continue;
        const matrix = parseMatrix(sub.body, sub.attrs, !MATRIX_STRING_IDS.has(sub.tag));
        if (sub.tag === 'ID_plants1D') model.plants1D = matrix;
        else if (sub.tag === 'ID_soilprofile') model.soils = matrix;
        else if (sub.tag === 'terrainheight') model.terrain = matrix;
      }
    } else if (tag === '3Dplants') {
      const p = parseLeaves(body);
      model.plants3D.push({
        i: num(p.rootcell_i), j: num(p.rootcell_j), k: num(p.rootcell_k) || 0,
        plantID: p.plantID ?? '', name: p.name ?? '',
      });
    } else if (tag === 'Receptors') {
      const r = parseLeaves(body);
      model.receptors.push({ i: num(r.cell_i), j: num(r.cell_j), name: r.name ?? '' });
    } else if (tag === 'Buildinginfo') {
      const b = parseLeaves(body);
      model.buildingInfo.set(num(b.BuildingInternalNr), {
        name: b.BuildingName ?? '',
        wallMaterial: b.BuildingWallMaterial ?? '',
        roofMaterial: b.BuildingRoofMaterial ?? '',
        facadeGreening: b.BuildingFacadeGreening ?? '',
        roofGreening: b.BuildingRoofGreening ?? '',
      });
    } else if (tag === 'buildings3D' || tag === 'dem3D' || tag === 'WallDB') {
      for (const sub of splitBlocks(`<ENVI-MET_Datafile>${body}</ENVI-MET_Datafile>`)) {
        if (sub.attrs.type !== 'sparematrix-3D') continue;
        if (sub.tag === 'buildingFlagAndNr') model.buildings3D = parseSparse(sub.body, sub.attrs);
        else if (sub.tag === 'ID_wallDB') model.wallDB = parseSparse(sub.body, sub.attrs);
      }
    }
  }
  return model;
}

/* ---------- griglia verticale ---------- */

// Quote (base e altezza) dei layer k della griglia 3D: con lo splitting la
// cella più bassa è divisa in 5 sub-celle di dz/5; con il telescoping le celle
// crescono di una percentuale a partire da una quota data.
export function buildZLevels(geometry, K) {
  const { dz, useSplitting, useTelescoping, verticalStretch, startStretch } = geometry;
  const levels = [];
  let z = 0;
  let current = dz;
  let k = 0;
  if (useSplitting) {
    for (let s = 0; s < 5 && k < K; s++, k++) {
      levels.push({ base: z, height: dz / 5 });
      z += dz / 5;
    }
  }
  while (k < K) {
    if (useTelescoping && verticalStretch > 0 && z >= startStretch) current *= 1 + verticalStretch / 100;
    levels.push({ base: z, height: current });
    z += current;
    k++;
  }
  return levels;
}

/* ---------- lettura da file ---------- */

export async function readINX(file) {
  const buffer = await file.arrayBuffer();
  let text = new TextDecoder('utf-8').decode(buffer);
  if (text.includes('�')) text = new TextDecoder('iso-8859-1').decode(buffer);
  return parseINX(text);
}

// Solo la rotazione del modello (gradi, positiva = antioraria: il nord vero
// sta a sinistra dell'asse verticale della griglia), senza parsare le matrici.
export async function readInxRotation(file) {
  const buffer = await file.arrayBuffer();
  const text = new TextDecoder('utf-8').decode(buffer);
  const match = text.match(/<modelRotation>\s*([-+0-9.eE]+)\s*<\/modelRotation>/);
  return match ? Number(match[1]) || 0 : 0;
}
