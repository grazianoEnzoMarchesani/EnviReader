// Parser del file INX (area input di ENVI-met). Supporta sia il formato storico
// quasi-XML (v4/v5) sia il nuovo formato JSON introdotto con ENVI-met v6.
// Gestisce sia i modelli 2.5D sia quelli full 3D, garantendo piena compatibilità.

import { findFileBy } from './envimet';

/* ---------- individuazione del file nel fileset ---------- */

export const findInxFile = (structure) => findFileBy(structure, (name) => /\.inx$/i.test(name));

/* ---------- parsing di basso livello ---------- */

// Divide il testo in blocchi <tag>...</tag> di primo livello (dentro la radice).
// \w copre anche i tag che iniziano per cifra come <3Dplants>.
function splitBlocks(text) {
  const blocks = [];
  const regex = /<([\w-]+)((?:\s+[\w-]+="[^"]*")*)\s*>([\s\S]*?)<\/\1>/g;
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

const num = (v) => (v == null || (typeof v === 'string' && v.trim() === '') ? null : (Number.isFinite(Number(v)) ? Number(v) : null));

// Georeferenziazione proiettata dell'angolo sud-ovest del dominio, quando
// l'INX ce l'ha: `realworldLowerLeft_X/Y` (o x/y in v6) sono precisi al centimetro,
// mentre `location_Longitude/Latitude` è lo stesso punto arrotondato dall'esportatore
// (QGIS scrive 2 decimali → centinaia di metri di errore). La zona arriva da
// <UTMZone>, o in subordine dal codice EPSG (326xx = UTM nord, 327xx = sud);
// Grasshopper lascia questi campi a 0/vuoti, e lì si torna al lon/lat.
function parseUtmGeoref(l) {
  const x = num(l.realworldLowerLeft_X ?? l.x);
  const y = num(l.realworldLowerLeft_Y ?? l.y);
  if (!Number.isFinite(x) || !Number.isFinite(y) || (x === 0 && y === 0)) return null;

  const epsgStr = l.projectionSystem ?? l.epsgProj ?? '';
  const epsg = /(\d{4,5})/.exec(epsgStr)?.[1];
  const epsgNum = epsg ? Number(epsg) : null;
  const fromEpsg = epsgNum >= 32601 && epsgNum <= 32760 ? epsgNum % 100 : null;
  const zone = num(l.UTMZone ?? l.utmZone) || fromEpsg;
  if (!Number.isFinite(zone) || zone < 1 || zone > 60) return null;

  return { x, y, zone, north: !(epsgNum >= 32701 && epsgNum <= 32760) };
}

// Matrice densa I×J da stringhe CSV (v5 XML): una riga di testo per j, valori separati da virgola.
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

// Converte una matrice 2D da JSON (v6): nei file v6 l'array esterno è indicizzato per i (0..I-1)
// e quello interno per j_envimet (0..J-1, con 0 a sud). Nella convenzione interna di EnviReader
// data è indicizzato come j * I + i, con j=0 a nord (ovvero j_envimet = J - 1 - j).
function matrixFrom2DArray(grid, I, J, numeric = true) {
  if (!grid || !Array.isArray(grid)) return null;
  const data = numeric ? new Float32Array(I * J) : new Array(I * J).fill('');
  const isColMajor = grid.length === I;
  for (let j = 0; j < J; j++) {
    const rowOffset = j * I;
    const jEnv = J - 1 - j;
    for (let i = 0; i < I; i++) {
      const val = isColMajor ? grid[i]?.[jEnv] : grid[jEnv]?.[i];
      if (numeric) {
        data[rowOffset + i] = (val === '' || val == null) ? 0 : Number(val);
      } else {
        data[rowOffset + i] = val == null ? '' : String(val);
      }
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

// Il modello raccoglie solo ciò che la scena 3D e le viste usano davvero: i
// blocchi non elencati qui (Header, 3Dplants, ID_plants1D, WallDB, ...) non
// vengono nemmeno parsati — su un INX reale sono migliaia di blocchi e
// matrici I×J che finirebbero solo in memoria senza mai essere letti.

function parseINXXML(text) {
  const model = {
    geometry: {}, geometry3D: null, location: {},
    buildings2D: {}, soils: null, terrain: null, demReference: 0,
    receptors: [], buildingInfo: new Map(),
    buildings3D: null,
  };

  for (const block of splitBlocks(text)) {
    const { tag, body } = block;
    if (tag === 'modelGeometry') {
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
        utm: parseUtmGeoref(l),
      };
    } else if (tag === 'buildings2D') {
      for (const sub of splitBlocks(`<ENVI-MET_Datafile>${body}</ENVI-MET_Datafile>`)) {
        if (sub.attrs.type === 'matrix-data') model.buildings2D[sub.tag] = parseMatrix(sub.body, sub.attrs);
      }
    } else if (tag === 'soils2D' || tag === 'dem') {
      for (const sub of splitBlocks(`<ENVI-MET_Datafile>${body}</ENVI-MET_Datafile>`)) {
        if (sub.tag === 'DEMReference') { model.demReference = num(sub.body) || 0; continue; }
        if (sub.attrs.type !== 'matrix-data') continue;
        // ID_soilprofile contiene ID materiale (stringhe), terrainheight quote (numeri)
        if (sub.tag === 'ID_soilprofile') model.soils = parseMatrix(sub.body, sub.attrs, false);
        else if (sub.tag === 'terrainheight') model.terrain = parseMatrix(sub.body, sub.attrs);
      }
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
    // buildingFlagAndNr può comparire in una delle due sezioni 3D a seconda
    // della versione che ha scritto il file: si accettano entrambe, come prima
    } else if (tag === 'buildings3D' || tag === 'dem3D') {
      for (const sub of splitBlocks(`<ENVI-MET_Datafile>${body}</ENVI-MET_Datafile>`)) {
        if (sub.attrs.type === 'sparematrix-3D' && sub.tag === 'buildingFlagAndNr') {
          model.buildings3D = parseSparse(sub.body, sub.attrs);
        }
      }
    }
  }
  return model;
}

function parseINXJSON(data) {
  const root = data.envimetDatafile || data;
  const mg = root.domainConfig?.modelGeometry || root.modelGeometry || {};
  const I = num(mg.i ?? mg.I ?? mg['grids-I']) || 0;
  const J = num(mg.j ?? mg.J ?? mg['grids-J']) || 0;
  const Z = num(mg.k ?? mg.K ?? mg.z ?? mg.Z ?? mg['grids-Z']) || 0;
  const dx = num(mg.dx) || 0;
  const dy = num(mg.dy) || 0;
  const dz = num(mg.dz ?? mg['dz-base']) || 0;
  const useTelescoping = mg.useTelescoping === true || num(mg.useTelescoping ?? mg.useTelescoping_grid) === 1;
  const useSplitting = mg.useSplitting === true || num(mg.useSplitting) === 1;
  const verticalStretch = num(mg.verticalStretch) || 0;
  const startStretch = num(mg.startStretch) || 0;
  const has3DModel = mg.modelType === '3D' || mg.modelType === 'full3D' || Boolean(mg.has3DModel);
  const isFull3DDesign = mg.modelType === '3D' || mg.modelType === 'full3D' || Boolean(mg.isFull3DDesign);

  const loc = root.domainConfig?.locationData || root.locationData || {};

  const model = {
    geometry: {
      I, J, Z,
      dx, dy, dz,
      useTelescoping,
      useSplitting,
      verticalStretch,
      startStretch,
      has3DModel,
      isFull3DDesign,
    },
    geometry3D: null,
    location: {
      name: loc.name ?? loc.locationName ?? '',
      rotation: num(loc.modelRot ?? loc.modelRotation) || 0,
      longitude: num(loc.lon ?? loc.location_Longitude),
      latitude: num(loc.lat ?? loc.location_Latitude),
      utm: parseUtmGeoref(loc),
    },
    buildings2D: {},
    soils: null,
    terrain: null,
    demReference: 0,
    receptors: [],
    buildingInfo: new Map(),
    buildings3D: null,
  };

  const s2 = root.spatialData2D || {};
  if (s2.buildings) {
    const top = s2.buildings.top ?? s2.buildings.zTop;
    const bot = s2.buildings.bot ?? s2.buildings.zBottom;
    const nr = s2.buildings.no ?? s2.buildings.buildingNr;
    const fix = s2.buildings.fixedHeight ?? s2.buildings.fixedheight;
    if (top) model.buildings2D.zTop = matrixFrom2DArray(top, I, J, true);
    if (bot) model.buildings2D.zBottom = matrixFrom2DArray(bot, I, J, true);
    if (nr) model.buildings2D.buildingNr = matrixFrom2DArray(nr, I, J, true);
    if (fix) model.buildings2D.fixedheight = matrixFrom2DArray(fix, I, J, true);
  }

  if (s2.terrain) {
    model.demReference = num(s2.terrain.refAlt ?? s2.terrain.DEMReference) || 0;
    const tData = s2.terrain.data ?? s2.terrain.terrainheight;
    if (tData) model.terrain = matrixFrom2DArray(tData, I, J, true);
  }

  if (s2.soilProfiles) {
    const sData = s2.soilProfiles.data ?? s2.soilProfiles.ID_soilprofile;
    if (sData) model.soils = matrixFrom2DArray(sData, I, J, false);
  }

  if (Array.isArray(s2.receptors)) {
    for (const r of s2.receptors) {
      if (Array.isArray(r)) {
        const i = num(r[0]);
        const j = num(r[1]);
        const name = r[2] != null ? String(r[2]) : '';
        if (i != null && j != null) model.receptors.push({ i, j, name });
      } else if (r && typeof r === 'object') {
        const i = num(r.i ?? r.cell_i ?? r.x);
        const j = num(r.j ?? r.cell_j ?? r.y);
        const name = r.name ?? '';
        if (i != null && j != null) model.receptors.push({ i, j, name });
      }
    }
  }

  if (Array.isArray(s2.buildingInfo)) {
    for (const b of s2.buildingInfo) {
      const nr = num(b.no ?? b.BuildingInternalNr);
      if (nr != null) {
        model.buildingInfo.set(nr, {
          name: b.name ?? b.BuildingName ?? '',
          wallMaterial: b.wall ?? b.wallMaterial ?? b.BuildingWallMaterial ?? '',
          roofMaterial: b.roof ?? b.roofMaterial ?? b.BuildingRoofMaterial ?? '',
          facadeGreening: b.wallGreen ?? b.facadeGreening ?? b.BuildingFacadeGreening ?? '',
          roofGreening: b.roofGreen ?? b.roofGreening ?? b.BuildingRoofGreening ?? '',
        });
      }
    }
  }

  const s3 = root.spatialData3D || {};
  const b3Data = s3.buildingNos?.data;
  if (Array.isArray(b3Data) && b3Data.length > 0) {
    const entries = [];
    for (const item of b3Data) {
      if (Array.isArray(item) && item.length >= 3) {
        const i = num(item[0]);
        const j = num(item[1]);
        const k = num(item[2]);
        if (Number.isFinite(i) && Number.isFinite(j) && Number.isFinite(k)) {
          entries.push({
            i, j, k,
            values: item.slice(3).map((v) => (v == null ? '' : String(v))),
          });
        }
      }
    }
    if (entries.length > 0) {
      const K = Z || (entries.reduce((m, e) => Math.max(m, e.k), 0) + 1);
      model.buildings3D = { I, J, K, entries };
      model.geometry3D = { I, J, K };
    }
  }

  return model;
}

export function parseINX(text) {
  const clean = text.replace(/^\ufeff/, '').trimStart();
  if (clean.startsWith('{')) {
    try {
      return parseINXJSON(JSON.parse(clean));
    } catch (err) {
      console.error('Failed to parse INX JSON:', err);
      throw err;
    }
  }
  return parseINXXML(clean);
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

// Livelli reali letti dallo spacing_z del file EDX dei risultati: nessuna
// riformulazione di splitting/telescoping, stessa fonte usata dalla vista 2D
// (loadSlice in envimet.js). Preferita a buildZLevels quando disponibile,
// perché è la quota che ENVI-met ha effettivamente usato per scrivere i dati.
export function zLevelsFromSpacing(spacingZ) {
  const levels = [];
  let z = 0;
  for (const height of spacingZ) {
    levels.push({ base: z, height });
    z += height;
  }
  return levels;
}

/* ---------- lettura da file ---------- */

export async function readINX(file) {
  const buffer = await file.arrayBuffer();
  let text = new TextDecoder('utf-8').decode(buffer);
  if (text.includes('\ufffd')) text = new TextDecoder('iso-8859-1').decode(buffer);
  return parseINX(text);
}

// Solo la rotazione del modello (gradi, positiva = antioraria: il nord vero
// sta a sinistra dell'asse verticale della griglia), senza parsare le matrici.
// Supporta sia file v5 XML (<modelRotation>) sia file v6 JSON ("modelRot").
export async function readInxRotation(file) {
  const slice = file.slice(0, 65536);
  const buffer = await slice.arrayBuffer();
  const text = new TextDecoder('utf-8').decode(buffer);
  const jsonMatch = text.match(/"modelRot(?:ation)?"\s*:\s*([-+0-9.eE]+)/);
  if (jsonMatch) return Number(jsonMatch[1]) || 0;
  const xmlMatch = text.match(/<modelRotation>\s*([-+0-9.eE]+)\s*<\/modelRotation>/);
  if (xmlMatch) return Number(xmlMatch[1]) || 0;
  if (file.size > 65536) {
    const fullBuffer = await file.arrayBuffer();
    const fullText = new TextDecoder('utf-8').decode(fullBuffer);
    const jm = fullText.match(/"modelRot(?:ation)?"\s*:\s*([-+0-9.eE]+)/);
    if (jm) return Number(jm[1]) || 0;
    const xm = fullText.match(/<modelRotation>\s*([-+0-9.eE]+)\s*<\/modelRotation>/);
    if (xm) return Number(xm[1]) || 0;
  }
  return 0;
}
