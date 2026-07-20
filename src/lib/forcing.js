// Condizioni al contorno ENVI-met: parsing del SIMX (quasi-XML) e del FOX
// (JSON "Full Forcing"). Nessuna dipendenza esterna; -999 diventa NaN.

const NO_DATA = -999;

/* ---------- SIMX ---------- */

// Il SIMX è quasi-XML (radice con trattini, valori con spazi): parsing a regex
// ricorsivo. Ogni sezione diventa un oggetto { tag: valore | sottosezione }.
function parseTags(text) {
  const out = {};
  const re = /<([\w-]+)>([\s\S]*?)<\/\1>/g;
  let match;
  while ((match = re.exec(text))) {
    const [, tag, inner] = match;
    out[tag] = /<([\w-]+)>[\s\S]*?<\/\1>/.test(inner) ? parseTags(inner) : inner.trim();
  }
  return out;
}

export function parseSimx(text) {
  const root = parseTags(text);
  // la radice (ENVI-MET_Datafile) contiene le sezioni vere e proprie
  const keys = Object.keys(root);
  return keys.length === 1 && typeof root[keys[0]] === 'object' ? root[keys[0]] : root;
}

export function findSimxFile(structure) {
  return findFileBy(structure, (name) => /\.simx$/i.test(name));
}

// Lista di valori orari del Simple Forcing ("v,v,v,..." dentro <SimpleForcing>)
export function parseValueList(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  const values = text.split(',').map((s) => parseFloat(s.trim()));
  if (!values.length || values.some((v) => !Number.isFinite(v))) return null;
  return values.map((v) => (v === NO_DATA ? NaN : v));
}

// Le temperature ENVI-met possono essere in Kelvin o °C a seconda del file:
// se la mediana supera 200 sono Kelvin
export function toCelsius(values) {
  const finite = values.filter((v) => !Number.isNaN(v)).sort((a, b) => a - b);
  if (!finite.length || finite[(finite.length / 2) | 0] < 200) return values;
  return values.map((v) => (Number.isNaN(v) ? v : v - 273.15));
}

/* ---------- FOX ---------- */

export function findFoxFile(structure, referencedName) {
  const wanted = referencedName?.trim().toLowerCase();
  if (wanted) {
    const exact = findFileBy(structure, (name) => name.toLowerCase() === wanted);
    if (exact) return exact;
  }
  return findFileBy(structure, (name) => /\.fox$/i.test(name));
}

function findFileBy(structure, predicate) {
  for (const file of structure.files || []) {
    if (predicate(file.name)) return file;
  }
  for (const [key, value] of Object.entries(structure)) {
    if (key === 'files' || typeof value !== 'object' || Array.isArray(value)) continue;
    const found = findFileBy(value, predicate);
    if (found) return found;
  }
  return null;
}

const clean = (v) => (v == null || v === NO_DATA ? NaN : v);

// Trasforma la timestepList del FOX in serie continue per i grafici.
// I profili (t, q, vento, pressione) possono avere più quote: una serie per quota.
export function parseFox(json) {
  const steps = json.timestepList || [];
  const n = steps.length;

  const labels = new Array(n);
  const times = new Float64Array(n); // epoch ms, per agganciare il periodo di simulazione
  const scalarKeys = ['swDir', 'swDif', 'lwRad', 'precipitation', 'lClouds', 'mClouds', 'hClouds'];
  const scalars = Object.fromEntries(scalarKeys.map((k) => [k, new Float32Array(n).fill(NaN)]));
  const profiles = { tProfile: new Map(), qProfile: new Map(), pProfile: new Map(), windProfile: new Map() };
  const pollutants = new Map();

  const profileSeries = (map, height, maker) => {
    let series = map.get(height);
    if (!series) {
      series = maker();
      map.set(height, series);
    }
    return series;
  };

  steps.forEach((step, i) => {
    labels[i] = `${step.date} · ${(step.time || '').slice(0, 5)}`;
    times[i] = Date.parse(`${step.date}T${step.time || '00:00:00'}Z`);
    for (const key of scalarKeys) scalars[key][i] = clean(step[key]);

    for (const kind of ['tProfile', 'qProfile', 'pProfile']) {
      for (const point of step[kind] || []) {
        profileSeries(profiles[kind], point.height, () => new Float32Array(n).fill(NaN))[i] = clean(point.value);
      }
    }
    for (const point of step.windProfile || []) {
      const series = profileSeries(profiles.windProfile, point.height, () => ({
        speed: new Float32Array(n).fill(NaN),
        dir: new Float32Array(n).fill(NaN),
      }));
      series.speed[i] = clean(point.wSpdValue);
      series.dir[i] = clean(point.wDirValue);
    }
    for (const [name, value] of Object.entries(step.backgrPollutants || {})) {
      if (clean(value) !== value || value == null) continue; // salta i -999
      let series = pollutants.get(name);
      if (!series) {
        series = new Float32Array(n).fill(NaN);
        pollutants.set(name, series);
      }
      series[i] = value;
    }
  });

  const byHeight = (map, build) =>
    [...map.entries()].sort((a, b) => a[0] - b[0]).map(([height, data]) => ({ height, ...build(data) }));

  const used = (arr) => arr.some((v) => !Number.isNaN(v)) ? arr : null;
  const clouds = ['lClouds', 'mClouds', 'hClouds'].some((k) => used(scalars[k]))
    ? { l: scalars.lClouds, m: scalars.mClouds, h: scalars.hClouds }
    : null;

  // primo e ultimo indice di ogni mese presente nel file (per il filtro periodo)
  const months = [];
  for (let i = 0; i < n; i++) {
    const key = (steps[i].date || '').slice(0, 7);
    if (!months.length || months[months.length - 1].key !== key) months.push({ key, start: i, end: i + 1 });
    else months[months.length - 1].end = i + 1;
  }

  return {
    location: json.locationData || null,
    meta: json.metaData || null,
    n,
    labels,
    times,
    months,
    t: byHeight(profiles.tProfile, (data) => ({ values: toCelsius([...data]) })),
    q: byHeight(profiles.qProfile, (data) => ({ values: data })),
    p: byHeight(profiles.pProfile, (data) => ({ values: data })),
    wind: byHeight(profiles.windProfile, (data) => data),
    swDir: used(scalars.swDir),
    swDif: used(scalars.swDif),
    lwRad: used(scalars.lwRad),
    precip: used(scalars.precipitation),
    clouds,
    pollutants: pollutants.size ? Object.fromEntries(pollutants) : null,
  };
}

/* ---------- caricamento per fileset ---------- */

// "21.07.2021" + "06:00:00" → epoch ms (il SIMX usa il formato tedesco)
function parseSimxStart(mainData) {
  const dm = (mainData?.startDate || '').match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!dm) return null;
  const time = (mainData?.startTime || '00:00:00').trim();
  return { 
    epoch: Date.parse(`${dm[3]}-${dm[2]}-${dm[1]}T${time}Z`),
    monthDayTime: `-${dm[2]}-${dm[1]} · ${time.slice(0, 5)}`
  };
}

// Indici [inizio, fine] del periodo simulato dentro la serie FOX, se coperto
export function simulationWindow(simx, fox) {
  const startObj = parseSimxStart(simx?.mainData);
  const hours = parseFloat(simx?.mainData?.simDuration);
  if (startObj == null || !Number.isFinite(hours) || !fox?.n) return null;

  const start = startObj.epoch;
  const end = start + hours * 3600e3;
  
  // 1. Ricerca esatta (epoch)
  let i0 = -1;
  let i1 = -1;
  for (let i = 0; i < fox.n; i++) {
    if (i0 === -1 && fox.times[i] >= start) i0 = i;
    if (fox.times[i] <= end) i1 = i;
  }
  if (i0 !== -1 && i1 > i0 && fox.times[i0] < end) {
    return [i0, i1];
  }

  // 2. Ricerca per giorno/mese/ora ignorando l'anno
  i0 = -1;
  for (let i = 0; i < fox.n; i++) {
    if (fox.labels[i].includes(startObj.monthDayTime)) {
      i0 = i;
      break;
    }
  }

  if (i0 !== -1) {
    const altStart = fox.times[i0];
    const altEnd = altStart + hours * 3600e3;
    i1 = -1;
    for (let i = 0; i < fox.n; i++) {
      if (fox.times[i] <= altEnd) i1 = i;
    }
    if (i1 > i0 && fox.times[i0] < altEnd) {
      return [i0, i1];
    }
  }

  // 3. Fallback: prendiamo l'intervallo dall'inizio del file FOX
  const fallbackStart = fox.times[0];
  const fallbackEnd = fallbackStart + hours * 3600e3;
  i1 = -1;
  for (let i = 0; i < fox.n; i++) {
    if (fox.times[i] <= fallbackEnd) i1 = i;
  }
  return [0, i1 > 0 ? i1 : Math.min(fox.n - 1, Math.ceil(hours))];
}

const forcingCache = new WeakMap(); // fileset -> Map(foxFile|null -> promise)

export function loadForcing(fileset, foxOverride = null) {
  let byFox = forcingCache.get(fileset);
  if (!byFox) {
    byFox = new Map();
    forcingCache.set(fileset, byFox);
  }
  let promise = byFox.get(foxOverride);
  if (!promise) {
    promise = buildForcing(fileset, foxOverride);
    byFox.set(foxOverride, promise);
  }
  return promise;
}

async function buildForcing(fileset, foxOverride) {
  const structure = fileset.structure;
  const simxFile = findSimxFile(structure);
  let simx = null;
  if (simxFile) {
    try {
      simx = parseSimx(await simxFile.text());
    } catch {
      simx = null;
    }
  }

  const foxRef = simx?.FullForcing?.fileName?.trim() || null;
  const isFull = Boolean(foxRef);
  const foxFile = foxOverride || (isFull ? findFoxFile(structure, foxRef) : null);
  let fox = null;
  if (foxFile) {
    try {
      fox = parseFox(JSON.parse(await foxFile.text()));
    } catch {
      fox = null;
    }
  }

  // Simple Forcing: serie orarie scritte direttamente nel SIMX (se presenti)
  const sf = simx?.SimpleForcing;
  const simpleT = sf ? parseValueList(sf.TAir) : null;
  const simple = simpleT
    ? { t: toCelsius(simpleT), q: sf ? parseValueList(sf.Qrel) : null }
    : null;

  return {
    simxFileName: simxFile?.name ?? null,
    simx,
    mode: isFull ? 'full' : 'simple',
    foxRef,
    foxFileName: foxFile?.name ?? null,
    fox,
    foxMissing: isFull && !fox,
    simple,
    window: simulationWindow(simx, fox),
  };
}
