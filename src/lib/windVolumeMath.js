// Matematica pura del campo di vento 3D: nessuna dipendenza da three.js/DOM,
// così questo file è importabile sia da windVolumeWorker.js (gira in un Web
// Worker, niente contesto WebGL) sia da inxScene.js sul thread principale —
// che infatti riusa le stesse celle di segmento/testina per il vento disegnato
// sulle fette dati. resolveZLevels/windCellHeight duplicano volutamente le
// omonime di inxScene.js (che importa three.js in testa): tenerle qui separate
// evita di trascinare three.js nel worker solo per due funzioni di aritmetica,
// senza toccare il codice 3D già in produzione (buildModelScene, buildDataOverlay, ...).
import { buildZLevels, zLevelsFromSpacing } from './inx';

export function resolveZLevels(geometry, K, spacingZ) {
  if (!spacingZ || !spacingZ.length) return buildZLevels(geometry, K);
  const levels = zLevelsFromSpacing(spacingZ.slice(0, K));
  if (levels.length >= K) return levels;
  const { dz, useTelescoping, verticalStretch, startStretch } = geometry;
  let z = levels.length ? levels[levels.length - 1].base + levels[levels.length - 1].height : 0;
  let current = levels.length ? levels[levels.length - 1].height : dz;
  for (let k = levels.length; k < K; k++) {
    if (useTelescoping && verticalStretch > 0 && z >= startStretch) current *= 1 + verticalStretch / 100;
    levels.push({ base: z, height: current });
    z += current;
  }
  return levels;
}

// Quota mondo del centro verticale della cella di livello frazionario kf:
// stessa formula/motivazione di windCellHeight in inxScene.js (vedi lì per il
// perché "centro cella" invece di "quota di superficie").
export function windCellHeight(zLevels, kf) {
  const kMax = zLevels.length - 1;
  const k0 = Math.min(kMax, Math.max(0, Math.floor(kf)));
  const frac = Math.min(1, Math.max(0, kf - k0));
  const center0 = zLevels[k0].base + zLevels[k0].height / 2;
  const k1 = Math.min(kMax, k0 + 1);
  const center1 = zLevels[k1].base + zLevels[k1].height / 2;
  return center0 + frac * (center1 - center0);
}

// Passo di semina (celle) e stride delle frecce del campo volumetrico in
// funzione della densità, con un tetto assoluto indipendente dalla
// dimensione della griglia: domini grandi (centinaia di migliaia/milioni di
// celle) non devono mai produrre più di qualche migliaio di frecce/qualche
// centinaio di semi, altrimenti il ricalcolo nel worker impiega troppo.
export const WIND_VOLUME_MAX_ARROWS = 3000;
export const WIND_VOLUME_MAX_SEEDS = 500;

export function volumeArrowStride(dims, density) {
  const total = dims.x * dims.y * dims.z;
  const targetCount = Math.max(50, Math.min(WIND_VOLUME_MAX_ARROWS, 150 + (density / 100) * (WIND_VOLUME_MAX_ARROWS - 150)));
  return Math.max(1, Math.round(Math.cbrt(total / targetCount)));
}

export function volumeStreamSep(dims, density) {
  const total = dims.x * dims.y * dims.z;
  const targetSeeds = Math.max(20, Math.min(WIND_VOLUME_MAX_SEEDS, 50 + (density / 100) * (WIND_VOLUME_MAX_SEEDS - 50)));
  return Math.max(1, Math.cbrt(total / targetSeeds));
}

/* ---------- celle di streamline (condivise con inxScene.js) ---------- */

// Dimensione dei marcatori di direzione della modalità "combined" (solo punta,
// nessuna asta): raggio come frazione della lunghezza, per un cono tozzo (largo
// quasi quanto lungo) che legge bene la direzione da qualunque angolo di vista
// senza somigliare a un ago.
export const COMBINED_MARKER_LEN_FACTOR = 0.42;
export const COMBINED_MARKER_ASPECT = 0.4;

// Converte una polilinea (punti in coordinate mondo) in celle di segmento
// cilindrico tra ogni coppia di punti consecutivi: un unico InstancedMesh per
// tutte le streamline di un piano/volume, invece di un THREE.Line per linea
// (la maggior parte dei driver WebGL ignora `linewidth`, vedi segmentGeometry
// in inxScene.js).
export function lineToSegmentCells(points, radius) {
  const cells = [];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0, z0] = points[i - 1];
    const [x1, y1, z1] = points[i];
    const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
    const length = Math.hypot(dx, dy, dz);
    if (length < 1e-6) continue;
    cells.push({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: (z0 + z1) / 2, dirX: dx, dirY: dy, dirZ: dz, length, radius });
  }
  return cells;
}

// Testina di direzione "combined" centrata sul punto points[p]: la tangente è
// presa dai vertici REALI già proiettati in mondo (p-1 → p+1), gli stessi di
// lineToSegmentCells, non da un campo ricampionato in un punto isolato — così
// punta e base restano sulla curva anche dove questa flette parecchio, invece
// di proiettare in avanti una freccia rigida che se ne stacca visibilmente.
export function pushArrowhead(headCells, points, p, headLen, headRadius) {
  const [x0, y0, z0] = points[p - 1];
  const [x1, y1, z1] = points[p + 1];
  const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
  const segLen = Math.hypot(dx, dy, dz);
  if (segLen < 1e-6) return;
  const nx = dx / segLen, ny = dy / segLen, nz = dz / segLen;
  const [cx, cy, cz] = points[p];
  headCells.push({ x: cx, y: cy, z: cz, dirX: nx, dirY: ny, dirZ: nz, length: headLen, radius: headRadius });
}
