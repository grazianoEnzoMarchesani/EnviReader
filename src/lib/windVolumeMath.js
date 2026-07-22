// Matematica pura per il campo di vento volumetrico 3D: nessuna dipendenza
// da three.js/DOM, così questo file è importabile sia da windVolumeWorker.js
// (gira in un Web Worker, niente contesto WebGL) sia — se mai servisse — dal
// thread principale. resolveZLevels/levelBoundaries duplicano volutamente le
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

export function levelBoundaries(zLevels) {
  const boundaries = Array.from({ length: zLevels.length + 1 });
  boundaries[0] = 0;
  for (let k = 0; k < zLevels.length; k++) boundaries[k + 1] = zLevels[k].base + zLevels[k].height;
  return boundaries;
}

// Quota mondo del centro verticale della cella di livello frazionario kf:
// stessa formula/motivazione di windCellHeight in inxScene.js (vedi lì per il
// perché "centro cella" invece di "quota di superficie").
export function windCellHeight(zLevels, boundaries, kf) {
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
