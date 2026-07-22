// Costruzione della scena three.js dal modello INX parsato (vedi inx.js).
// Restituisce un gruppo centrato sull'origine con un sotto-gruppo per livello
// (edifici, vegetazione, terreno, ricettori, griglia) così i toggle della
// sidebar si riducono a cambiare la visibilità.
//
// Convenzioni: asse -x = i (est), asse -z = j (nord), y = quota in metri.
// L'asse i va specchiato (toX) per corrispondere all'orientamento reale del
// modello, verificato confrontando la scena con la vista in pianta 2D dei
// risultati (overlay "Objects"), che resta il riferimento corretto.
// Le matrici INX sono scritte con la prima riga a nord: riga → j = J-1-riga.
// I database materiali ENVI-met sono cifrati, quindi i colori derivano
// dall'ID del materiale tramite una palette deterministica di fallback.

import * as THREE from 'three';
import { buildZLevels, zLevelsFromSpacing } from './inx';
import { VEGETATION_COLORS as VEGETATION_HEX, buildLUT } from './colormap';

const VEGETATION_COLORS = VEGETATION_HEX.map((hex) => Number(`0x${hex.slice(1)}`));
const VEGETATION_RV_MIN = 11;
const VEGETATION_RV_MAX = 15;
// Stessi codici del volume "Objects" usati dal riferimento 2D (vedi
// objectsToImageData in colormap.js): 1 = edificio, 2 = terreno/suolo.
const OBJECTS_RV_BUILDING = 1;
const OBJECTS_RV_TERRAIN = 2;

const DEG = Math.PI / 180;

const WALL_COLORS = [0xcfc8bb, 0xbfb6a6, 0xd8cfc0, 0xa8a39a, 0xc2b8ab, 0xb0a494];
const ROOF_COLORS = [0xa9573f, 0x8d8d8d, 0x9c6b52, 0x6f6f6f];
const SOIL_COLORS = {
  ST: 0x9a9a99, PG: 0xb5b0a7, PP: 0xb5b0a7, KK: 0x8f8f8e, // strade e pavimentazioni
  LO: 0x8a6f4d, SD: 0xcfc09a, LS: 0x8a6f4d, // suoli naturali
  WW: 0x4a7fb5, // acqua
};
const SOIL_DEFAULT = 0x97927f;
const RECEPTOR_COLOR = 0xe0a83c;

// Livelli verticali da usare per un dato K: i primi livelli, fin dove lo
// spacing_z reale del file EDX dei risultati correnti arriva, usano quella
// quota (la stessa che ENVI-met ha davvero scritto nei dati, vedi
// zLevelsFromSpacing) invece della ricostruzione approssimata di
// splitting/telescoping. Se K supera i livelli coperti dai risultati (es. il
// dominio verticale del modello INX è più alto della griglia dei risultati
// caricati), i livelli eccedenti proseguono con la stessa formula di
// telescoping di buildZLevels, partendo dall'ultimo livello reale — così
// edifici, terreno, vegetazione e overlay dati restano allineati sulla parte
// bassa/comune della griglia invece di sfasarsi per intero quando K eccede lo
// spacingZ disponibile.
function resolveZLevels(geometry, K, spacingZ) {
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

function hashPick(id, palette) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
}

function soilColor(id) {
  if (!id || id === '000000') return SOIL_DEFAULT;
  return SOIL_COLORS[id.slice(-2).toUpperCase()] ?? SOIL_DEFAULT;
}

export function buildModelScene(model, objectsVolume = null, spacingZ = null) {
  const { I, J, dx, dy } = model.geometry;
  const W = I * dx;
  const H = J * dy;
  const toX = (i) => W / 2 - (i + 0.5) * dx;
  const toZ = (j) => H / 2 - (j + 0.5) * dy;
  const terrainAt = (i, j) => model.terrain?.data[j * I + i] ?? 0;

  // Il volume "Objects" dei risultati (EDT/EDX) è la fonte più affidabile per
  // edifici e terreno: stessa griglia voxel esatta usata dall'overlay dati e
  // già caricata per la vegetazione (vedi buildVegetation), invece di
  // ricostruire noi una quota continua e arrotondarla al confine più vicino
  // (nearestBoundaryIndex), che può sfasarsi dalla vera griglia di ENVI-met.
  // Fallback al metodo basato su INX (zTop/zBottom/terrainheight) quando i
  // risultati non sono ancora caricati o non coprono la stessa griglia I×J.
  const fromObjects = objectsVolume && objectsVolume.dims.x === I && objectsVolume.dims.y === J
    ? buildFromObjectsVolume(model, objectsVolume, { toX, toZ }, spacingZ)
    : null;

  const group = new THREE.Group();
  const layers = {
    terrain: fromObjects?.terrain ?? buildTerrain(model, { toX, toZ }, spacingZ),
    buildings: fromObjects?.buildings ?? (model.buildings3D?.entries.length
      ? buildVoxelBuildings(model, { toX, toZ }, spacingZ)
      : buildExtrudedBuildings(model, { toX, toZ, terrainAt }, spacingZ)),
    vegetation: buildVegetation(model, objectsVolume, { toX, toZ }, spacingZ),
    receptors: buildReceptors(model, { toX, toZ, terrainAt }),
    grid: buildGrid(model, { W, H }),
  };
  let maxHeight = 0;
  for (const [name, layer] of Object.entries(layers)) {
    if (!layer) continue;
    layer.name = name;
    group.add(layer);
    maxHeight = Math.max(maxHeight, layer.userData.maxHeight ?? 0);
  }

  const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x777766, 1.15);
  group.add(hemisphereLight);
  const decorativeLight = new THREE.DirectionalLight(0xffffff, 1.6);
  decorativeLight.position.set(-W * 0.6, Math.max(W, H) * 0.8, -H * 0.4);
  group.add(decorativeLight);

  const sunLayer = buildSunLayer({ W, H });
  sunLayer.group.name = 'sun';
  group.add(sunLayer.group);
  layers.sun = sunLayer.group;

  return { group, layers, size: { W, H }, maxHeight, hemisphereLight, decorativeLight, sunLayer };
}

/* ---------- percorso solare e luce con ombre ---------- */

// Palette del diagramma solare (coerente con l'accento arancio dell'app).
const SUN_PATH_COLOR = 0xff8a3d; // arco del giorno corrente (evidenziato)
const SUN_ARC_COLOR = 0xffc27a; // archi giornalieri mensili (rete)
const SUN_SOLSTICE_COLOR = 0xff9a3c; // solstizi = inviluppo annuale
const SUN_ANALEMMA_COLOR = 0xc9b39a; // analemmi orari (rete "verticale")
const SUN_COMPASS_COLOR = 0x9aa0a6; // orizzonte e bussola a terra
const CARDINALS = [
  [0, 'N'], [45, 'NE'], [90, 'E'], [135, 'SE'],
  [180, 'S'], [225, 'SW'], [270, 'W'], [315, 'NW'],
];

// Luce direzionale con ombre configurate per l'inviluppo del modello, più il
// diagramma del percorso solare: bussola a terra, rete annuale (archi mensili +
// analemmi orari, vedi sunDiagramCurves), arco del giorno corrente evidenziato e
// un marcatore che segue lo slider orario. Tutto raggruppato per essere
// mostrato/nascosto in blocco quando la simulazione solare è attiva (vedi
// Model3DViewer). La rete e la bussola si (ri)costruiscono in setSunDiagram; le
// parti che seguono l'ora (luce, marcatore, raggio, arco del giorno) in updateSunLayer.
function buildSunLayer({ W, H }) {
  const span = Math.max(W, H);
  const radius = span * 0.92;

  const group = new THREE.Group();
  group.visible = false;
  group.userData = { radius, span, lastPoints: null, lastDiagram: null, lastRotation: null };

  const light = new THREE.DirectionalLight(0xfff3e0, 0);
  light.castShadow = true;
  const shadowExtent = span * 0.65;
  light.shadow.camera.left = -shadowExtent;
  light.shadow.camera.right = shadowExtent;
  light.shadow.camera.top = shadowExtent;
  light.shadow.camera.bottom = -shadowExtent;
  light.shadow.camera.near = 1;
  light.shadow.camera.far = radius + shadowExtent * 2;
  light.shadow.mapSize.set(2048, 2048);
  light.shadow.bias = -0.0012;
  light.shadow.normalBias = 0.4;
  light.target = new THREE.Object3D();
  group.add(light.target);
  group.add(light);

  // contenitori ricostruiti in setSunDiagram (dipendono da località/rotazione)
  const compassGroup = new THREE.Group();
  const netGroup = new THREE.Group();
  group.add(compassGroup, netGroup);

  const pathLine = new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: SUN_PATH_COLOR, transparent: true, opacity: 0.95 }),
  );
  group.add(pathLine);

  const ray = new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineDashedMaterial({
      color: SUN_PATH_COLOR, transparent: true, opacity: 0.5,
      dashSize: span * 0.03, gapSize: span * 0.02,
    }),
  );
  group.add(ray);

  // sole: disco caldo nitido + alone morbido a gradiente radiale. Entrambi
  // sprite (sempre di fronte alla camera → cerchi puliti da ogni angolo) con
  // texture a gradiente, così l'alone sfuma nel trasparente invece di apparire
  // come il "quadrato" a tinta piatta di uno SpriteMaterial senza texture.
  const marker = new THREE.Group();
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: makeGlowTexture(), transparent: true, depthWrite: false }),
  );
  glow.scale.setScalar(Math.max(span * 0.14, 3));
  glow.renderOrder = 0;
  const core = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: makeDiscTexture(), transparent: true, depthWrite: false }),
  );
  core.scale.setScalar(Math.max(span * 0.035, 0.7));
  core.renderOrder = 1;
  marker.add(glow, core);
  group.add(marker);

  return { group, light, pathLine, ray, marker, compassGroup, netGroup };
}

// Direzione unitaria (world space) verso il sole, dato l'azimuth (0=nord,
// orario) e l'altitudine sull'orizzonte, corretta per la rotazione del
// modello (vedi convenzioni in testa al file: -X = est, +Z = nord a
// rotazione 0; readInxRotation in inx.js per il segno della rotazione).
function sunDirection(azimuthDeg, altitudeDeg, modelRotationDeg = 0) {
  const az = azimuthDeg * DEG;
  const alt = altitudeDeg * DEG;
  const theta = (modelRotationDeg || 0) * DEG;
  const trueEastX = -Math.cos(theta);
  const trueEastZ = Math.sin(theta);
  const trueNorthX = Math.sin(theta);
  const trueNorthZ = Math.cos(theta);
  const cosAlt = Math.cos(alt);
  const x = cosAlt * (Math.sin(az) * trueEastX + Math.cos(az) * trueNorthX);
  const z = cosAlt * (Math.sin(az) * trueEastZ + Math.cos(az) * trueNorthZ);
  return new THREE.Vector3(x, Math.sin(alt), z);
}

// Disco caldo del sole: gradiente radiale nitido con bordo antialias (l'ultimo
// stop a alpha 0 sfuma il contorno). Texture su canvas per uno sprite.
function makeDiscTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 60);
  g.addColorStop(0, 'rgba(255, 246, 219, 1)');
  g.addColorStop(0.5, 'rgba(255, 213, 128, 1)');
  g.addColorStop(0.9, 'rgba(246, 193, 100, 1)');
  g.addColorStop(1, 'rgba(246, 193, 100, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

// Alone morbido attorno al sole: gradiente radiale che sfuma nel trasparente,
// così non resta il bordo "quadrato" di uno sprite a tinta piatta.
function makeGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255, 226, 165, 0.6)');
  g.addColorStop(0.35, 'rgba(255, 202, 120, 0.28)');
  g.addColorStop(0.7, 'rgba(255, 190, 96, 0.08)');
  g.addColorStop(1, 'rgba(255, 190, 96, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

// Etichetta di testo come sprite (canvas texture): resta sempre rivolta alla
// camera, dimensione in unità di scena.
function makeLabelSprite(text, { color, size = 64, weight = '700', scale }) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.font = `${weight} ${size}px -apple-system, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(scale, scale, 1);
  return sprite;
}

// Svuota un gruppo liberando geometrie, materiali e texture dei figli.
function disposeChildren(group) {
  group.traverse((obj) => {
    if (obj === group) return;
    obj.geometry?.dispose();
    if (obj.material) {
      obj.material.map?.dispose();
      obj.material.dispose();
    }
  });
  group.clear();
}

// Polilinea di un arco solare: proietta i campioni {azimuth, altitude} sulla
// cupola (raggio) e spezza la linea all'orizzonte, così i tratti sotto terra
// non vengono uniti attraverso il modello.
function buildArc(samples, rotationDeg, radius, material) {
  const arc = new THREE.Group();
  let run = [];
  const flush = () => {
    if (run.length > 1) {
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(run), material);
      if (material.isLineDashedMaterial) line.computeLineDistances();
      arc.add(line);
    }
    run = [];
  };
  for (const s of samples) {
    if (s.altitude > 0) run.push(sunDirection(s.azimuth, s.altitude, rotationDeg).multiplyScalar(radius));
    else flush();
  }
  flush();
  return arc;
}

// Bussola a terra: cerchio dell'orizzonte, tacche ogni 15° (più lunghe ai punti
// cardinali) ed etichette N/E/S/W… orientate al nord vero del modello.
function buildCompass(compassGroup, rotationDeg, radius, span) {
  disposeChildren(compassGroup);
  const groundMat = new THREE.LineBasicMaterial({ color: SUN_COMPASS_COLOR, transparent: true, opacity: 0.6 });

  const circlePts = [];
  for (let i = 0; i <= 128; i++) {
    circlePts.push(sunDirection((i / 128) * 360, 0, rotationDeg).multiplyScalar(radius).setY(0.05));
  }
  compassGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(circlePts), groundMat));

  const tickPts = [];
  for (let a = 0; a < 360; a += 15) {
    const dir = sunDirection(a, 0, rotationDeg);
    const inner = a % 45 === 0 ? 0.955 : 0.985;
    tickPts.push(dir.clone().multiplyScalar(radius * inner).setY(0.05));
    tickPts.push(dir.clone().multiplyScalar(radius).setY(0.05));
  }
  compassGroup.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(tickPts), groundMat));

  const labelScale = Math.max(span * 0.06, 1.2);
  for (const [az, text] of CARDINALS) {
    const primary = text.length === 1;
    const sprite = makeLabelSprite(text, {
      color: primary ? '#4a5158' : '#9199a1',
      size: primary ? 74 : 50,
      scale: primary ? labelScale : labelScale * 0.72,
    });
    sprite.position.copy(sunDirection(az, 0, rotationDeg).multiplyScalar(radius * 1.09)).setY(labelScale * 0.5);
    compassGroup.add(sprite);
  }
}

// (Ri)costruisce la bussola e la rete annuale del percorso solare per la
// località/rotazione correnti. Salta il lavoro se nulla è cambiato: la rete
// dipende solo dalla località, non dall'ora dello slider.
export function setSunDiagram(sunLayer, rotationDeg, diagram) {
  const { group, compassGroup, netGroup } = sunLayer;
  const { radius, span } = group.userData;
  if (group.userData.lastDiagram === diagram && group.userData.lastRotation === rotationDeg) return;
  group.userData.lastDiagram = diagram;
  group.userData.lastRotation = rotationDeg;

  buildCompass(compassGroup, rotationDeg, radius, span);
  disposeChildren(netGroup);
  if (!diagram) return;

  const arcMat = new THREE.LineDashedMaterial({
    color: SUN_ARC_COLOR, transparent: true, opacity: 0.5,
    dashSize: radius * 0.03, gapSize: radius * 0.02,
  });
  const solsticeMat = new THREE.LineBasicMaterial({ color: SUN_SOLSTICE_COLOR, transparent: true, opacity: 0.75 });
  const analemmaMat = new THREE.LineDashedMaterial({
    color: SUN_ANALEMMA_COLOR, transparent: true, opacity: 0.4,
    dashSize: radius * 0.02, gapSize: radius * 0.02,
  });

  for (const arc of diagram.dateArcs) {
    netGroup.add(buildArc(arc.samples, rotationDeg, radius, arc.solstice ? solsticeMat : arcMat));
  }
  for (const an of diagram.analemmas) {
    netGroup.add(buildArc(an.samples, rotationDeg, radius, analemmaMat));
  }

  // etichette orarie in cima a ogni analemma (ore pari, sole abbastanza alto):
  // ne risulta una fila di numeri lungo l'arco del solstizio d'estate.
  const hourScale = Math.max(span * 0.038, 0.9);
  for (const an of diagram.analemmas) {
    if (an.hour % 2 !== 0) continue;
    let top = null;
    for (const s of an.samples) if (s.altitude > 12 && (!top || s.altitude > top.altitude)) top = s;
    if (!top) continue;
    const sprite = makeLabelSprite(String(an.hour), { color: '#c0771f', size: 46, scale: hourScale });
    sprite.position.copy(sunDirection(top.azimuth, top.altitude, rotationDeg).multiplyScalar(radius * 1.04));
    netGroup.add(sprite);
  }
}

// Riposiziona luce, marcatore, raggio e arco del giorno in base a
// azimuth/altitudine correnti; ricostruisce la polilinea dell'arco del giorno
// solo quando cambiano i campioni (pathPoints), non ad ogni tick dello slider.
export function updateSunLayer(sunLayer, rotationDeg, azimuth, altitude, pathPoints) {
  const { group, light, pathLine, ray, marker } = sunLayer;
  const radius = group.userData.radius;
  const sunPos = sunDirection(azimuth, altitude, rotationDeg).multiplyScalar(radius);

  light.position.copy(sunPos);
  light.target.position.set(0, 0, 0);
  light.target.updateMatrixWorld();

  const above = altitude > 0;
  light.intensity = above ? 1.5 * Math.max(0.3, Math.sin(altitude * DEG)) : 0;
  marker.position.copy(sunPos);
  marker.visible = above;

  ray.visible = above;
  if (above) {
    ray.geometry.dispose();
    ray.geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.05, 0), sunPos]);
    ray.computeLineDistances();
  }

  if (pathPoints && group.userData.lastPoints !== pathPoints) {
    group.userData.lastPoints = pathPoints;
    const pts = pathPoints
      .filter((p) => p.altitude > 0)
      .map((p) => sunDirection(p.azimuth, p.altitude, rotationDeg).multiplyScalar(radius));
    pathLine.geometry.dispose();
    pathLine.geometry = new THREE.BufferGeometry().setFromPoints(pts);
  }
}

// Attiva/disattiva ombra propria e portata su edifici, vegetazione e terreno.
export function setShadowCasting(layers, on) {
  for (const key of ['terrain', 'buildings', 'vegetation']) {
    layers[key]?.traverse((obj) => {
      if (obj.isMesh || obj.isInstancedMesh) {
        obj.castShadow = on;
        obj.receiveShadow = on;
      }
    });
  }
}

/* ---------- terreno ---------- */

// Terreno: pila di voxel per colonna, dal livello 0 fino alla quota di
// terrainheight (metri, arrotondata al confine di griglia più vicino) — stessa
// logica voxel-per-voxel usata per i building, invece di una superficie continua.
function buildTerrain(model, { toX, toZ }, spacingZ) {
  const { I, J, dx, dy, Z } = model.geometry;
  const zLevels = resolveZLevels(model.geometry, Z, spacingZ);
  const boundaries = levelBoundaries(zLevels);
  const cells = [];
  let maxHeight = 0;
  for (let j = 0; j < J; j++) {
    for (let i = 0; i < I; i++) {
      const height = model.terrain?.data[j * I + i] ?? 0;
      const id = model.soils?.data[j * I + i] ?? '';
      const color = soilColor(id);
      const topIdx = Math.max(1, nearestBoundaryIndex(boundaries, height));
      const x = toX(i);
      const z = toZ(j);
      for (let k = 0; k < topIdx; k++) {
        const level = zLevels[k];
        cells.push({ x, z, y: level.base + level.height / 2, sx: dx, sz: dy, sy: level.height, color });
      }
      maxHeight = Math.max(maxHeight, boundaries[topIdx]);
    }
  }
  if (!cells.length) return null;
  const layer = new THREE.Group();
  layer.add(instancedBoxes(cells, new THREE.MeshLambertMaterial()));
  layer.userData.maxHeight = maxHeight;
  return layer;
}

/* ---------- edifici ---------- */

function buildingColors(model, nr) {
  const info = model.buildingInfo.get(nr);
  return {
    wall: hashPick(info?.wallMaterial || String(nr), WALL_COLORS),
    roof: hashPick(info?.roofMaterial || String(nr), ROOF_COLORS),
  };
}

// Istanze di box unitari: la matrice di trasformazione fa scala + posizione
function instancedBoxes(cells, material) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.InstancedMesh(geometry, material, cells.length);
  const m = new THREE.Matrix4();
  const color = new THREE.Color();
  cells.forEach((c, idx) => {
    m.makeScale(c.sx, c.sy, c.sz);
    m.setPosition(c.x, c.y, c.z);
    mesh.setMatrixAt(idx, m);
    mesh.setColorAt(idx, color.setHex(c.color));
  });
  return mesh;
}

// zTop/zBottom sono quote in metri, non indici di voxel: le confrontiamo con i
// confini cumulativi della griglia verticale e prendiamo l'indice del confine
// più vicino (arrotondamento all'unità intera di voxel, che esiste o non esiste).
function levelBoundaries(zLevels) {
  const boundaries = Array.from({ length: zLevels.length + 1 });
  boundaries[0] = 0;
  for (let k = 0; k < zLevels.length; k++) boundaries[k + 1] = zLevels[k].base + zLevels[k].height;
  return boundaries;
}

function nearestBoundaryIndex(boundaries, value) {
  let lo = 0;
  let hi = boundaries.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (boundaries[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && Math.abs(boundaries[lo - 1] - value) <= Math.abs(boundaries[lo] - value)) return lo - 1;
  return lo;
}

// Modello 2.5D: un voxel per ogni livello della griglia verticale (buildZLevels)
// compreso tra gli indici di zBottom e zTop arrotondati, invece di un unico box
// estruso. Rispetta lo splitting/telescoping dichiarato nella modelGeometry.
function buildExtrudedBuildings(model, { toX, toZ, terrainAt }, spacingZ) {
  const { I, J, dx, dy, Z } = model.geometry;
  const { zTop, zBottom, buildingNr, fixedheight } = model.buildings2D;
  if (!zTop) return null;
  const demReference = model.demReference ?? 0;
  const zLevels = resolveZLevels(model.geometry, Z, spacingZ);
  const boundaries = levelBoundaries(zLevels);
  const walls = [];
  const roofs = [];
  let maxHeight = 0;
  for (let j = 0; j < J; j++) {
    for (let i = 0; i < I; i++) {
      const top = zTop.data[j * I + i];
      const bottom = zBottom?.data[j * I + i] ?? 0;
      if (!(top > 0) || top <= bottom) continue; // scarta celle vuote e zTop negativi anomali
      // Il terreno (buildTerrain) non si ferma alla quota esatta di terrainAt: la
      // arrotonda al confine di griglia più vicino (nearestBoundaryIndex, minimo 1
      // livello). Se l'edificio si appoggiasse alla quota grezza invece che a questa
      // stessa quota arrotondata, resterebbe sospeso o affondato di una frazione di
      // cella rispetto alla superficie renderizzata del terreno.
      const rawGround = terrainAt(i, j);
      const ground = boundaries[Math.max(1, nearestBoundaryIndex(boundaries, rawGround))];
      const isFixed = (fixedheight?.data[j * I + i] ?? 0) === 1;
      // fixedheight=0: l'edificio segue il terreno locale (origine = quota del terreno).
      // fixedheight=1: l'edificio resta a quota assoluta (origine = DEMReference) e non
      // sale con il terreno; dove si sovrappone al terreno solido, vince il terreno.
      const origin = isFixed ? demReference : ground;
      let absBottom = origin + bottom;
      const absTop = origin + top;
      if (isFixed) absBottom = Math.max(absBottom, ground);
      if (absBottom >= absTop) continue; // completamente coperto dal terreno
      const bottomIdx = nearestBoundaryIndex(boundaries, absBottom - origin);
      const topIdx = nearestBoundaryIndex(boundaries, absTop - origin);
      if (topIdx <= bottomIdx) continue; // arrotondati sullo stesso confine: nessun voxel
      const nr = buildingNr?.data[j * I + i] ?? 0;
      const { wall, roof } = buildingColors(model, nr);
      const x = toX(i);
      const z = toZ(j);
      for (let k = bottomIdx; k < topIdx; k++) {
        const level = zLevels[k];
        walls.push({ x, z, y: origin + level.base + level.height / 2, sx: dx, sz: dy, sy: level.height, color: wall });
      }
      const roofBase = origin + boundaries[topIdx];
      roofs.push({ x, z, y: roofBase + 0.06, sx: dx, sz: dy, sy: 0.12, color: roof });
      maxHeight = Math.max(maxHeight, roofBase);
    }
  }
  if (!walls.length) return null;
  const layer = new THREE.Group();
  layer.add(instancedBoxes(walls, new THREE.MeshLambertMaterial()));
  layer.add(instancedBoxes(roofs, new THREE.MeshLambertMaterial()));
  layer.userData.maxHeight = maxHeight;
  return layer;
}

// Modello full 3D: un box per voxel di buildingFlagAndNr, con "coperchio"
// color tetto sui voxel senza un altro voxel sopra.
// La matrice sparsa usa la convenzione "nativa" di riga (come i dati EDT,
// riga 0 = sud), diversa da quella delle matrici dense zTop/zBottom (riga 0 =
// nord): stesso specchiamento già applicato alla vegetazione.
function buildVoxelBuildings(model, { toX, toZ }, spacingZ) {
  const { J, dx, dy } = model.geometry;
  const K = model.geometry3D?.K ?? model.buildings3D.K;
  const zLevels = resolveZLevels(model.geometry, K, spacingZ);
  const occupied = new Set(model.buildings3D.entries.map((e) => `${e.i},${e.j},${e.k}`));
  const walls = [];
  const roofs = [];
  let maxHeight = 0;
  for (const e of model.buildings3D.entries) {
    const nr = parseInt(e.values[1] ?? e.values[0], 10) || 0;
    const { wall, roof } = buildingColors(model, nr);
    const level = zLevels[Math.min(e.k, zLevels.length - 1)];
    const top = level.base + level.height;
    const x = toX(e.i);
    const z = toZ(J - 1 - e.j);
    walls.push({ x, z, y: level.base + level.height / 2, sx: dx, sz: dy, sy: level.height, color: wall });
    if (!occupied.has(`${e.i},${e.j},${e.k + 1}`)) {
      roofs.push({ x, z, y: top + 0.06, sx: dx, sz: dy, sy: 0.12, color: roof });
    }
    maxHeight = Math.max(maxHeight, top);
  }
  const layer = new THREE.Group();
  layer.add(instancedBoxes(walls, new THREE.MeshLambertMaterial()));
  layer.add(instancedBoxes(roofs, new THREE.MeshLambertMaterial()));
  layer.userData.maxHeight = maxHeight;
  return layer;
}

/* ---------- vegetazione ---------- */

// La vegetazione non viene letta dall'INX (i codici pianta 1D/3D fanno
// riferimento a un database che ignoriamo): si scansiona invece il volume
// "Objects" dei risultati (EDT/EDX) su tutti i livelli k, quota assoluta come
// per terreno e building (nessun "segui il terreno"). rv 11-15 = vegetazione,
// con le stesse tonalità di verde dell'overlay 2D "Objects".
function buildVegetation(model, objectsVolume, { toX, toZ }, spacingZ) {
  if (!objectsVolume) return null;
  const { I, J, dx, dy } = model.geometry;
  const { dims, data } = objectsVolume;
  if (dims.x !== I || dims.y !== J) return null;
  const zLevels = resolveZLevels(model.geometry, dims.z, spacingZ);
  const cells = [];
  let maxHeight = 0;
  for (let k = 0; k < dims.z; k++) {
    const level = zLevels[k];
    const voxelY = level.base + level.height / 2;
    for (let j = 0; j < J; j++) {
      // le matrici INX hanno la riga 0 a nord, mentre nei dati EDT la riga 0 è a
      // sud: si specchia l'indice riga per allinearlo alla stessa convenzione j
      // usata da building e terreno (toZ), altrimenti la vegetazione risulta
      // ribaltata nord-sud rispetto al resto della scena.
      const edtRow = J - 1 - j;
      for (let i = 0; i < I; i++) {
        const rv = Math.round(data[(k * J + edtRow) * I + i]);
        if (rv < VEGETATION_RV_MIN || rv > VEGETATION_RV_MAX) continue;
        cells.push({ x: toX(i), z: toZ(j), y: voxelY, sx: dx, sz: dy, sy: level.height, color: VEGETATION_COLORS[rv - VEGETATION_RV_MIN] });
        maxHeight = Math.max(maxHeight, level.base + level.height);
      }
    }
  }
  if (!cells.length) return null;
  const layer = new THREE.Group();
  layer.add(instancedBoxes(cells, new THREE.MeshLambertMaterial()));
  layer.userData.maxHeight = maxHeight;
  return layer;
}

/* ---------- edifici e terreno dal volume "Objects" ---------- */

// Ricostruisce edifici e terreno voxel per voxel direttamente dal volume
// "Objects" dei risultati (EDT/EDX) invece che da zTop/zBottom/terrainheight
// dell'INX + un arrotondamento nostro della quota continua al confine di
// griglia più vicino: quel metodo può sfasarsi dalla vera griglia usata da
// ENVI-met (nearestBoundaryIndex non sempre arrotonda nella stessa direzione
// del vero calcolo interno, causando edifici/terreno sfalsati rispetto alle
// sezioni dati che invece leggono la quota assoluta della stessa griglia).
// Qui invece si legge dove ENVI-met ha davvero messo edificio/terreno,
// voxel per voxel, sulla stessa identica griglia zLevels usata dall'overlay
// e dalla vegetazione: combaciano sempre per costruzione. Stessi codici rv
// del riferimento 2D "Objects" (colormap.js): 1 = edificio, 2 = terreno.
function buildFromObjectsVolume(model, objectsVolume, { toX, toZ }, spacingZ) {
  const { I, J, dx, dy } = model.geometry;
  const { buildingNr } = model.buildings2D;
  const { dims, data } = objectsVolume;
  const zLevels = resolveZLevels(model.geometry, dims.z, spacingZ);
  const walls = [];
  const roofs = [];
  const soilCells = [];
  let buildingsMaxHeight = 0;
  let terrainMaxHeight = 0;
  for (let k = 0; k < dims.z; k++) {
    const level = zLevels[k];
    const voxelY = level.base + level.height / 2;
    const aboveLevel = k + 1 < dims.z ? zLevels[k + 1] : null;
    for (let j = 0; j < J; j++) {
      // stessa convenzione di specchiamento riga di buildVegetation: la
      // matrice INX ha la riga 0 a nord, i dati EDT la riga 0 a sud.
      const edtRow = J - 1 - j;
      for (let i = 0; i < I; i++) {
        const rv = Math.round(data[(k * J + edtRow) * I + i]);
        if (rv === OBJECTS_RV_BUILDING) {
          const nr = buildingNr?.data[j * I + i] ?? 0;
          const { wall, roof } = buildingColors(model, nr);
          walls.push({ x: toX(i), z: toZ(j), y: voxelY, sx: dx, sz: dy, sy: level.height, color: wall });
          buildingsMaxHeight = Math.max(buildingsMaxHeight, level.base + level.height);
          const aboveRv = aboveLevel ? Math.round(data[((k + 1) * J + edtRow) * I + i]) : NaN;
          if (aboveRv !== OBJECTS_RV_BUILDING) {
            roofs.push({ x: toX(i), z: toZ(j), y: level.base + level.height + 0.06, sx: dx, sz: dy, sy: 0.12, color: roof });
          }
        } else if (rv === OBJECTS_RV_TERRAIN) {
          const id = model.soils?.data[j * I + i] ?? '';
          soilCells.push({ x: toX(i), z: toZ(j), y: voxelY, sx: dx, sz: dy, sy: level.height, color: soilColor(id) });
          terrainMaxHeight = Math.max(terrainMaxHeight, level.base + level.height);
        }
      }
    }
  }
  let buildings = null;
  if (walls.length) {
    buildings = new THREE.Group();
    buildings.add(instancedBoxes(walls, new THREE.MeshLambertMaterial()));
    buildings.add(instancedBoxes(roofs, new THREE.MeshLambertMaterial()));
    buildings.userData.maxHeight = buildingsMaxHeight;
  }
  let terrain = null;
  if (soilCells.length) {
    terrain = new THREE.Group();
    terrain.add(instancedBoxes(soilCells, new THREE.MeshLambertMaterial()));
    terrain.userData.maxHeight = terrainMaxHeight;
  }
  if (!buildings && !terrain) return null;
  return { buildings, terrain };
}

/* ---------- overlay dati (voxel) ---------- */

// L'overlay drappeggia esattamente sul terreno/edifici sottostanti (stessa
// quota), quindi le facce coincidono nel depth buffer e sfarfallano (z-fighting).
// Il polygon offset dell'hardware risolve il conflitto solo nel depth test,
// senza spostare i vertici: l'utente non vede alcuno scostamento, la geometria
// resta esattamente quella del dato.
// Basic (non illuminato): il colore-dato deve restare fedele alla LUT a
// qualunque ora/posizione del sole, senza la sfumatura Lambert né le ombre
// (proprie o portate) della simulazione solare — vedi setShadowCasting, che
// infatti non include mai questo layer.
function overlayMaterial(opts) {
  return new THREE.MeshBasicMaterial({ ...opts, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
}

// Colore LUT per un valore dato min/max del range attivo; null per NaN (cella
// senza dato, coerente col "trasparente" della mappa 2D: nessun voxel).
function lutColor(lut, value, min, max) {
  if (Number.isNaN(value)) return null;
  const range = max - min || 1;
  let t = (value - min) / range;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const k = Math.min(255, (t * 255) | 0);
  return (lut[k * 3] << 16) | (lut[k * 3 + 1] << 8) | lut[k * 3 + 2];
}

// Voxel della pianta: un cubo per cella (i, j) del dataset corrente. Con
// "segui il terreno" attivo (terrainCut presente) il livello k è quello
// calcolato per quella cella (stessa formula di extractSlice/terrainCut in
// envimet.js), quindi lo strato "drappeggia" sul terreno come in 2D; altrimenti
// resta piatto alla quota di `level`. Riga 0 dei dati è a sud (convenzione EDT),
// va specchiata sull'indice j (convenzione INX, riga 0 a nord) come per la vegetazione.
function addPlanCells(cells, slice, dimZ, range, lut, level, terrainCut, I, J, dx, dy, zLevels, toX, toZ) {
  if (!slice || slice.w !== I || slice.h !== J) return;
  const { data, w } = slice;
  for (let row = 0; row < J; row++) {
    for (let col = 0; col < I; col++) {
      const idx = row * w + col;
      const color = lutColor(lut, data[idx], range.min, range.max);
      if (color == null) continue;
      let k = level;
      if (terrainCut) k = Math.min(dimZ - 1, Math.max(0, Math.floor(terrainCut.data[idx] * terrainCut.gain + terrainCut.base)));
      const lvl = zLevels[Math.min(k, zLevels.length - 1)];
      const j = J - 1 - row;
      cells.push({ x: toX(col), z: toZ(j), y: lvl.base + lvl.height / 2, sx: dx, sz: dy, sy: lvl.height, color });
    }
  }
}

// Voxel di una sezione (X o Y, eventualmente ruotata): una colonna verticale
// di celle lungo la traccia in pianta della sezione, un cubo per (colonna,
// livello k). Con angolo ≠ 0 la traccia è quella di slice.line (stesso
// nearest-neighbour di extractSlice); ad angolo 0 la colonna corrisponde
// direttamente a sectionX (fisso) + riga, o riga + sectionY (fisso).
function addSectionCells(cells, slice, range, lut, viewType, pivotX, pivotY, I, J, dx, dy, zLevels, toX, toZ) {
  if (!slice) return;
  const { data, w, h, line } = slice;
  for (let row = 0; row < h; row++) {
    const lvl = zLevels[Math.min(row, zLevels.length - 1)];
    for (let col = 0; col < w; col++) {
      const color = lutColor(lut, data[row * w + col], range.min, range.max);
      if (color == null) continue;
      let gridX, gridY;
      if (line) {
        gridX = Math.round(line.x0 + line.dx * col);
        gridY = Math.round(line.y0 + line.dy * col);
      } else if (viewType === 'sectionX') {
        gridX = pivotX;
        gridY = col;
      } else {
        gridX = col;
        gridY = pivotY;
      }
      const i = Math.min(I - 1, Math.max(0, gridX));
      const j = Math.min(J - 1, Math.max(0, J - 1 - Math.min(Math.max(0, gridY), J - 1)));
      cells.push({ x: toX(i), z: toZ(j), y: lvl.base + lvl.height / 2, sx: dx, sz: dy, sy: lvl.height, color });
    }
  }
}

// Quota continua (non arrotondata) al livello frazionario kf, interpolando
// linearmente dentro il livello k=floor(kf): la stessa formula del taglio
// "segui il terreno" ma senza il floor() che genera i gradoni. boundaries[k] è
// la quota alla base del livello k (vedi levelBoundaries).
function continuousHeight(zLevels, boundaries, kf) {
  const kMax = zLevels.length - 1;
  const k = Math.min(kMax, Math.max(0, Math.floor(kf)));
  const frac = Math.min(1, Math.max(0, kf - k));
  return boundaries[k] + frac * zLevels[k].height;
}

// Superficie continua della pianta ("piani inclinati"): stessa quota di
// drappeggio di addPlanCells ma senza il floor() al livello di griglia, e con
// gli angoli delle celle condivisi (media delle celle adiacenti) invece di un
// box indipendente per cella — così due celle vicine con quote diverse sono
// unite da un piano inclinato invece che da una parete verticale a gradino.
// Il colore resta quello proprio di ciascuna cella (nessuna media): a cambiare
// è solo la geometria, il dato mostrato è sempre quello esatto della cella.
function buildPlanSurface(slice, range, lut, level, terrainCut, I, J, dx, dy, zLevels, boundaries) {
  if (!slice || slice.w !== I || slice.h !== J) return null;
  const { data, w } = slice;
  const kMax = zLevels.length - 1;
  const cellY = new Float32Array(I * J);
  for (let row = 0; row < J; row++) {
    for (let col = 0; col < I; col++) {
      const idx = row * w + col;
      const kf = terrainCut ? Math.min(kMax, Math.max(0, terrainCut.data[idx] * terrainCut.gain + terrainCut.base)) : level;
      cellY[idx] = continuousHeight(zLevels, boundaries, kf);
    }
  }
  // quota di ciascun angolo = media delle (fino a 4) celle che lo condividono:
  // così ogni cella diventa un quadrilatero i cui 4 angoli si saldano esattamente
  // con quelli delle celle vicine, niente scalini tra celle a quote diverse
  const cornerY = new Float32Array((I + 1) * (J + 1));
  for (let r2 = 0; r2 <= J; r2++) {
    for (let c2 = 0; c2 <= I; c2++) {
      let sum = 0;
      let count = 0;
      for (const [dr, dc] of [[-1, -1], [-1, 0], [0, -1], [0, 0]]) {
        const r = r2 + dr;
        const c = c2 + dc;
        if (r < 0 || r >= J || c < 0 || c >= I) continue;
        sum += cellY[r * I + c];
        count++;
      }
      cornerY[r2 * (I + 1) + c2] = count ? sum / count : 0;
    }
  }
  const worldX = (gx) => (I * dx) / 2 - gx * dx;
  const worldZ = (gy) => gy * dy - (J * dy) / 2;
  const positions = [];
  const colors = [];
  const c = new THREE.Color();
  let maxHeight = 0;
  for (let row = 0; row < J; row++) {
    for (let col = 0; col < I; col++) {
      const color = lutColor(lut, data[row * w + col], range.min, range.max);
      if (color == null) continue;
      c.setHex(color);
      const x0 = worldX(col);
      const x1 = worldX(col + 1);
      const z0 = worldZ(row);
      const z1 = worldZ(row + 1);
      const y00 = cornerY[row * (I + 1) + col];
      const y01 = cornerY[row * (I + 1) + col + 1];
      const y10 = cornerY[(row + 1) * (I + 1) + col];
      const y11 = cornerY[(row + 1) * (I + 1) + col + 1];
      maxHeight = Math.max(maxHeight, y00, y01, y10, y11);
      // due triangoli, CCW visti dall'alto (normale verso +Y)
      const quad = [
        [x0, y00, z0], [x1, y11, z1], [x0, y10, z1],
        [x0, y00, z0], [x1, y01, z0], [x1, y11, z1],
      ];
      for (const p of quad) {
        positions.push(p[0], p[1], p[2]);
        colors.push(c.r, c.g, c.b);
      }
    }
  }
  if (!positions.length) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, overlayMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  return { mesh, maxHeight };
}

// Superficie continua di una sezione (eventualmente ruotata): stessa idea di
// buildPlanSurface ma per il piano verticale. La traccia in pianta segue la
// posizione frazionaria esatta di slice.line (o il pivot fisso), senza
// arrotondare alla cella più vicina come fa addSectionCells: così una sezione
// ruotata resta un nastro dritto invece di una parete a gradini in orizzontale.
// In verticale i confini sono già quelli esatti della griglia (zLevels), niente
// da smussare lì. Colore per cella, nessuna media, come per la pianta.
function buildSectionSurface(slice, range, lut, viewType, pivotX, pivotY, I, J, dx, dy, boundaries) {
  if (!slice) return null;
  const { data, w, h, line } = slice;
  const worldX = (gx) => (I * dx) / 2 - (gx + 0.5) * dx;
  const worldZ = (gy) => (gy + 0.5) * dy - (J * dy) / 2;
  const colPos = (col) => {
    if (line) return [line.x0 + line.dx * col, line.y0 + line.dy * col];
    return viewType === 'sectionX' ? [pivotX, col] : [col, pivotY];
  };
  const positions = [];
  const colors = [];
  const c = new THREE.Color();
  let maxHeight = 0;
  for (let row = 0; row < h; row++) {
    const y0 = boundaries[row];
    const y1 = boundaries[row + 1];
    maxHeight = Math.max(maxHeight, y1);
    for (let col = 0; col < w; col++) {
      const color = lutColor(lut, data[row * w + col], range.min, range.max);
      if (color == null) continue;
      c.setHex(color);
      const [gx0, gy0] = colPos(col - 0.5);
      const [gx1, gy1] = colPos(col + 0.5);
      const x0 = worldX(gx0);
      const z0 = worldZ(gy0);
      const x1 = worldX(gx1);
      const z1 = worldZ(gy1);
      const quad = [
        [x0, y0, z0], [x1, y0, z1], [x1, y1, z1],
        [x0, y0, z0], [x1, y1, z1], [x0, y1, z0],
      ];
      for (const p of quad) {
        positions.push(p[0], p[1], p[2]);
        colors.push(c.r, c.g, c.b);
      }
    }
  }
  if (!positions.length) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, overlayMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  return { mesh, maxHeight };
}

// Overlay 3D del dataset corrente (stesso dato/palette della vista 2D Data
// Analysis): voxel colorati in pianta e/o nelle sezioni trasversali/longitudinali,
// a scelta dell'utente (overlay.views). Un'unica LUT/range condivisi tra i piani
// attivi, così i colori restano confrontabili quando più piani sono visibili insieme.
// overlay.smooth sceglie tra i voxel a gradino (default, un box per cella) e una
// superficie continua a piani inclinati (niente pareti verticali a gradino con
// "segui il terreno" o con sezioni ruotate).
export function buildDataOverlay(model, overlay) {
  if (!overlay?.colors?.length || !overlay.dimZ) return null;
  const { views, range, colors, reversed, pivot, terrainCut, level, dimZ, smooth, spacingZ } = overlay;
  if (!views.plan && !views.sectionX && !views.sectionY) return null;
  const { I, J, dx, dy } = model.geometry;
  const toX = (i) => (I * dx) / 2 - (i + 0.5) * dx;
  const toZ = (j) => (J * dy) / 2 - (j + 0.5) * dy;
  const zLevels = resolveZLevels(model.geometry, dimZ, spacingZ);
  const boundaries = levelBoundaries(zLevels);
  const lut = buildLUT(colors, reversed);
  const layer = new THREE.Group();
  layer.name = 'dataOverlay';
  let maxHeight = 0;
  let any = false;

  if (smooth) {
    if (views.plan) {
      const built = buildPlanSurface(views.plan, range, lut, level, terrainCut, I, J, dx, dy, zLevels, boundaries);
      if (built) { layer.add(built.mesh); maxHeight = Math.max(maxHeight, built.maxHeight); any = true; }
    }
    for (const key of ['sectionX', 'sectionY']) {
      if (!views[key]) continue;
      const built = buildSectionSurface(views[key], range, lut, key, pivot.sectionX, pivot.sectionY, I, J, dx, dy, boundaries);
      if (built) { layer.add(built.mesh); maxHeight = Math.max(maxHeight, built.maxHeight); any = true; }
    }
  } else {
    const cells = [];
    if (views.plan) addPlanCells(cells, views.plan, dimZ, range, lut, level, terrainCut, I, J, dx, dy, zLevels, toX, toZ);
    if (views.sectionX) addSectionCells(cells, views.sectionX, range, lut, 'sectionX', pivot.sectionX, pivot.sectionY, I, J, dx, dy, zLevels, toX, toZ);
    if (views.sectionY) addSectionCells(cells, views.sectionY, range, lut, 'sectionY', pivot.sectionX, pivot.sectionY, I, J, dx, dy, zLevels, toX, toZ);
    if (cells.length) {
      for (const cell of cells) maxHeight = Math.max(maxHeight, cell.y + cell.sy / 2);
      layer.add(instancedBoxes(cells, overlayMaterial()));
      any = true;
    }
  }

  if (!any) return null;
  layer.userData.maxHeight = maxHeight;
  // Esplicito (oltre al MeshBasicMaterial unlit): l'overlay dati non deve mai
  // proiettare né ricevere ombre della simulazione solare.
  layer.traverse((obj) => {
    if (obj.isMesh || obj.isInstancedMesh) {
      obj.castShadow = false;
      obj.receiveShadow = false;
    }
  });
  return layer;
}

/* ---------- interazione 3D: griglia <-> mondo ---------- */

// Converte un punto mondo (intersezione del raycaster col terreno a quota 0,
// la quota è ignorata) nella cella di griglia frazionaria (col, row) — stessa
// convenzione (col = i, row = sectionY con riga 0 a sud, vedi addPlanCells)
// di un click sulla pianta 2D, così i due gesti individuano la stessa cella.
export function worldToGrid(model, point) {
  const { I, J, dx, dy } = model.geometry;
  const W = I * dx;
  const H = J * dy;
  const col = (W / 2 - point.x) / dx - 0.5;
  const jGrid = (H / 2 - point.z) / dy - 0.5;
  const row = J - 1 - jGrid;
  return { col, row };
}

// Inversa di worldToGrid: posizione mondo (a quota 0) di una cella di
// griglia, anche frazionaria — usata per proiettare a schermo un punto lungo
// la traccia di una sezione (vedi lineHitTest in Model3DViewer).
export function gridToWorld(model, col, row) {
  const { I, J, dx, dy } = model.geometry;
  const W = I * dx;
  const H = J * dy;
  const x = W / 2 - (col + 0.5) * dx;
  const z = H / 2 - (J - 0.5 - row) * dy;
  return new THREE.Vector3(x, 0, z);
}

/* ---------- ricettori ---------- */

function buildReceptors(model, { toX, toZ, terrainAt }) {
  if (!model.receptors.length) return null;
  const { I, J, dx, dy } = model.geometry;
  const geo = new THREE.SphereGeometry(Math.max(dx, dy) * 0.28, 10, 8);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: RECEPTOR_COLOR }), model.receptors.length);
  const m = new THREE.Matrix4();
  model.receptors.forEach((r, idx) => {
    const i = Math.min(r.i ?? 0, I - 1);
    const j = Math.min(r.j ?? 0, J - 1);
    m.makeTranslation(toX(i), terrainAt(i, j) + 1.2, toZ(j));
    mesh.setMatrixAt(idx, m);
  });
  const layer = new THREE.Group();
  layer.add(mesh);
  return layer;
}

/* ---------- griglia di calcolo ---------- */

function buildGrid(model, { W, H }) {
  const { I, J, dx, dy } = model.geometry;
  const points = [];
  for (let i = 0; i <= I; i++) points.push(i * dx - W / 2, 0, -H / 2, i * dx - W / 2, 0, H / 2);
  for (let j = 0; j <= J; j++) points.push(-W / 2, 0, j * dy - H / 2, W / 2, 0, j * dy - H / 2);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  const lines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.35 }));
  lines.position.y = 0.05;
  const layer = new THREE.Group();
  layer.add(lines);
  return layer;
}

/* ---------- utilità per il viewer ---------- */

export function setLayerVisibility(layers, flags) {
  if (layers.buildings) layers.buildings.visible = flags.showBuildings;
  if (layers.vegetation) layers.vegetation.visible = flags.showVegetation;
  if (layers.terrain) layers.terrain.visible = flags.showTerrain;
  if (layers.receptors) layers.receptors.visible = flags.showReceptors;
  if (layers.grid) layers.grid.visible = flags.showGrid;
}

export function setWireframe(layers, on) {
  for (const [name, layer] of Object.entries(layers)) {
    if (name === 'sun') continue; // arco solare e marcatore: mai in wireframe
    layer?.traverse((obj) => {
      if (obj.material && 'wireframe' in obj.material) obj.material.wireframe = on;
    });
  }
}

export function disposeGroup(group) {
  group.traverse((obj) => {
    obj.geometry?.dispose();
    if (obj.material) {
      obj.material.map?.dispose();
      obj.material.dispose();
    }
  });
}
