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
import { traceStreamlines2D } from './windField';

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

export function buildModelScene(model, objectsVolume = null, spacingZ = null, dimZ = null) {
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
    grid: buildGrid(model, { W, H }, spacingZ, dimZ),
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
// camera, dimensione in unità di scena. Canvas dimensionato sulla larghezza
// reale del testo (measureText), non più un quadrato 128×128 fisso: con
// quello, stringhe più lunghe di un paio di caratteri (es. "22.5 m") uscivano
// dal bordo del canvas e venivano tagliate. `rotation` (radianti) ruota il
// testo nel piano dello schermo, per le quote verticali che devono leggersi
// dal basso verso l'alto come nel riferimento fornito dall'utente.
function makeLabelSprite(text, { color, size = 64, weight = '700', scale, rotation = 0 }) {
  const font = `${weight} ${size}px -apple-system, system-ui, sans-serif`;
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = font;
  const textWidth = measure.measureText(text).width;
  const padX = size * 0.3;
  const padY = size * 0.35;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(textWidth + padX * 2);
  canvas.height = Math.ceil(size + padY * 2);
  const ctx = canvas.getContext('2d');
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, rotation });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scale * (canvas.width / canvas.height), scale, 1);
  return sprite;
}

// Punti di una linea di quota "a parentesi" come nel riferimento: il
// segmento principale p0→p1 più due piccole tacche perpendicolari terminali
// (non linee di richiamo fino allo spigolo reale — resta solo lo scarto/gap
// tra oggetto e linea, dato dal chiamante tramite l'offset di p0/p1).
function buildDimensionLinePoints(p0, p1, tickDir, tickLen) {
  const h = tickLen / 2;
  const tick = (p) => [p[0] - tickDir[0] * h, p[1] - tickDir[1] * h, p[2] - tickDir[2] * h,
    p[0] + tickDir[0] * h, p[1] + tickDir[1] * h, p[2] + tickDir[2] * h];
  return [...p0, ...p1, ...tick(p0), ...tick(p1)];
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

/* ---------- campo di vento 3D (frecce/streamline) ---------- */

// Nero pieno in tema chiaro (massimo contrasto su qualunque palette
// dati/terreno/edificio sottostante: a differenza del canvas 2D, che usa un
// alone bianco + nucleo scuro per restare leggibile su sfondo qualunque, qui
// un colore chiaro come il teal iniziale si perdeva su troppe combinazioni di
// colori), bianco in tema scuro (dove il nero si confonde con lo sfondo).
// Letto al momento della costruzione del materiale; l'aggiornamento a caldo
// quando l'utente cambia tema è gestito da Model3DViewer (vedi
// applyWindTheme), che aggiorna material.color senza ricostruire la mesh.
function windColor() {
  return document.documentElement.dataset.theme === 'dark' ? 0xffffff : 0x000000;
}

// Riallinea al tema corrente i materiali già costruiti da buildWindOnSlices/
// buildWindVolume (frecce e streamline condividono un unico THREE.Material
// per layer, vedi sopra): chiamata da Model3DViewer quando data-theme cambia,
// così il colore del vento segue il tema senza dover ricostruire la mesh.
export function applyWindTheme(layer) {
  if (!layer) return;
  const hex = windColor();
  layer.traverse((obj) => {
    obj.material?.color?.setHex(hex);
  });
}

// Freccia isolata come UNICA geometria affusolata (coda→punta, lunghezza 1,
// centrata sull'origine, lungo +X), non più asta cilindrica + cono separato:
// quella versione, isolata (a differenza della vista "combined" dove tante
// teste coniche ravvicinate si fondono in un nastro e il raggio della testa
// nasconde la giunzione), leggeva come un lecca-lecca — capocchia tozza su
// un gambo sottile. Qui il raggio lungo l'asse segue un profilo CONCAVO
// (esponente < 1: r(t) = (1-t)^ARROW_TAPER_EXPONENT) che si restringe piano
// vicino alla coda e si affila di scatto vicino alla punta, invece di un
// cono a raggio lineare. headGeometry() (sotto) resta invariata: è condivisa
// con le testine di direzione della vista "combined" (pushArrowhead), che
// non vanno toccate.
let _arrowGeometry = null;
function arrowGeometry() {
  if (_arrowGeometry) return _arrowGeometry;
  const points = [];
  for (let i = 0; i <= ARROW_PROFILE_SEGMENTS; i++) {
    const t = i / ARROW_PROFILE_SEGMENTS;
    const radius = Math.pow(1 - t, ARROW_TAPER_EXPONENT);
    points.push(new THREE.Vector2(radius, t - 0.5));
  }
  _arrowGeometry = new THREE.LatheGeometry(points, 8);
  _arrowGeometry.rotateZ(-Math.PI / 2);
  return _arrowGeometry;
}
const ARROW_TAPER_EXPONENT = 0.5; // <1 = concavo (piano alla coda, brusco in punta); 1 = cono dritto
const ARROW_PROFILE_SEGMENTS = 20; // risoluzione della curva lungo l'asse
const ARROW_BASE_RADIUS_RATIO = 1.3; // raggio alla coda = c.radius × questo fattore

let _headGeometry = null;
function headGeometry() {
  if (_headGeometry) return _headGeometry;
  _headGeometry = new THREE.ConeGeometry(1, 1, 8);
  _headGeometry.rotateZ(-Math.PI / 2);
  return _headGeometry;
}

// Dimensione dei marcatori di direzione "combined" (solo punta, vedi
// pushArrowhead): raggio come frazione della lunghezza, per un cono tozzo
// (largo quasi quanto lungo) che legge bene la direzione da qualunque
// angolo di vista senza somigliare a un ago.
const COMBINED_MARKER_LEN_FACTOR = 0.42;
const COMBINED_MARKER_ASPECT = 0.4;

// Segmento canonico (cilindro) lungo 1, lungo +X, CENTRATO sull'origine (a
// differenza della freccia, che ha la coda a x=0): usato per le streamline
// come catena di piccoli cilindri istanziati invece di THREE.Line — la
// maggior parte dei driver WebGL ignora completamente `linewidth` sulle linee
// "pure" (restano sempre 1px, praticamente invisibili in stile "Streamlines"
// da solo, senza le testine di freccia di "Combined" a farle notare), mentre
// un cilindro ha uno spessore reale in metri e resta sempre visibile.
let _segmentGeometry = null;
function segmentGeometry() {
  if (_segmentGeometry) return _segmentGeometry;
  _segmentGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 6, 1);
  _segmentGeometry.rotateZ(-Math.PI / 2);
  return _segmentGeometry;
}

// Istanze orientate di una geometria unitaria lungo +X: cells = [{x,y,z,
// dirX,dirY,dirZ, length, radius}]. dir non deve essere unitario (viene
// normalizzato qui); radius scala lo spessore, length la lunghezza lungo dir.
// Comune a frecce (coda nell'origine) e segmenti di streamline (centrati).
const UNIT_X = new THREE.Vector3(1, 0, 0);
function instancedFromCells(geometry, cells, material) {
  const mesh = new THREE.InstancedMesh(geometry, material, cells.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const dir = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const scale = new THREE.Vector3();
  cells.forEach((c, idx) => {
    dir.set(c.dirX, c.dirY, c.dirZ);
    const len = dir.length();
    dir.normalize();
    q.setFromUnitVectors(UNIT_X, len > 1e-6 ? dir : UNIT_X);
    pos.set(c.x, c.y, c.z);
    scale.set(c.length, c.radius, c.radius);
    m.compose(pos, q, scale);
    mesh.setMatrixAt(idx, m);
  });
  return mesh;
}
// Frecce = un solo InstancedMesh di arrowGeometry() (coda→punta, profilo
// concavo): a differenza di instancedFromCells, `c.x/y/z` è qui la CODA
// della freccia (non il centro, convenzione storica di planWindArrows &co.).
function instancedArrows(cells, material) {
  const mesh = new THREE.InstancedMesh(arrowGeometry(), material, cells.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const dir = new THREE.Vector3();
  const tail = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const scale = new THREE.Vector3();
  cells.forEach((c, idx) => {
    dir.set(c.dirX, c.dirY, c.dirZ);
    const len = dir.length();
    dir.normalize();
    q.setFromUnitVectors(UNIT_X, len > 1e-6 ? dir : UNIT_X);
    tail.set(c.x, c.y, c.z);
    pos.copy(tail).addScaledVector(dir, c.length / 2);
    const baseRadius = c.radius * ARROW_BASE_RADIUS_RATIO;
    scale.set(c.length, baseRadius, baseRadius);
    m.compose(pos, q, scale);
    mesh.setMatrixAt(idx, m);
  });
  return mesh;
}
function instancedSegments(cells, material) {
  return instancedFromCells(segmentGeometry(), cells, material);
}

// Converte una polilinea (mondo) in celle di segmento cilindrico tra ogni
// coppia di punti consecutivi: un unico InstancedMesh per tutte le
// streamline di un piano/volume, invece di un THREE.Line per linea.
function lineToSegmentCells(points, radius) {
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

// Passo di campionamento della griglia (in celle) in funzione della densità:
// stessa forma di windLayout in MapChart.jsx (più frecce lungo l'asse
// maggiore quando density sale), qui parametrizzata sulle due dimensioni w/h
// di un field 2D generico (piano o sezione).
function windStep(w, h, density) {
  const across = 10 + (density / 100) * 35;
  return Math.max(1, Math.round(Math.max(w, h) / across));
}

// Quota mondo del CENTRO verticale della cella di livello frazionario kf: a
// differenza di continuousHeight (quota della SUPERFICIE che drappeggia sul
// bordo inferiore del livello, usata da buildPlanSurface/buildSectionSurface
// per il foglio colorato) qui serve il centro della cella — dove il dato
// vive davvero, la stessa convenzione di addPlanCells/addSectionCells che
// centrano i voxel a lvl.base+lvl.height/2. Con la quota "di superficie" le
// frecce cadevano esattamente sul bordo tra due celle e restavano per metà
// dentro il voxel opaco sovrastante/sottostante quando l'overlay non è in
// modalità "superficie liscia" (dataVoxelSmooth spento). Continua in kf
// frazionario (interpola tra il centro della cella k e quello della k+1)
// così le streamline, che marciano a passo continuo, non saltano
// bruscamente da un centro all'altro quando attraversano un confine di livello.
function windCellHeight(zLevels, boundaries, kf) {
  const kMax = zLevels.length - 1;
  const k0 = Math.min(kMax, Math.max(0, Math.floor(kf)));
  const frac = Math.min(1, Math.max(0, kf - k0));
  const center0 = zLevels[k0].base + zLevels[k0].height / 2;
  const k1 = Math.min(kMax, k0 + 1);
  const center1 = zLevels[k1].base + zLevels[k1].height / 2;
  return center0 + frac * (center1 - center0);
}

function planWindHeight(idx, level, terrainCut, zLevels, boundaries) {
  const kf = terrainCut ? terrainCut.data[idx] * terrainCut.gain + terrainCut.base : level;
  return windCellHeight(zLevels, boundaries, kf);
}

// Posizione mondo (x, z) della colonna `col` (frazionaria) di una sezione,
// eventualmente ruotata: stessa proiezione pianta→mondo di addSectionCells
// (gridX/gridY fissi o lungo slice.line), applicata con toX/toZ come il resto
// dell'overlay dati — non solo agli indici interi di cella ma a qualunque
// posizione reale, così il vento segue esattamente la stessa traccia
// disegnata dal voxel/superficie sottostante.
function sectionColumnXZ(col, line, viewType, pivotX, pivotY, I, J, toX, toZ) {
  let gridX, gridY;
  if (line) {
    gridX = line.x0 + line.dx * col;
    gridY = line.y0 + line.dy * col;
  } else if (viewType === 'sectionX') {
    gridX = pivotX;
    gridY = col;
  } else {
    gridX = col;
    gridY = pivotY;
  }
  const i = Math.min(I - 1, Math.max(0, gridX));
  const j = Math.min(J - 1, Math.max(0, J - 1 - gridY));
  return [toX(i), toZ(j)];
}

// Direzione (mondo, XZ, unitaria) corrispondente a +1 unità di `col`: la
// posizione è affine in col in tutti e tre i casi (pivot fisso o linea
// ruotata), quindi la derivata è costante — si ottiene semplicemente
// valutando sectionColumnXZ in due punti, senza dover ricavare a mano il
// segno di ciascun caso (evita errori di convenzione sugli assi specchiati).
function sectionTangentXZ(line, viewType, pivotX, pivotY, I, J, toX, toZ) {
  const [x0, z0] = sectionColumnXZ(0, line, viewType, pivotX, pivotY, I, J, toX, toZ);
  const [x1, z1] = sectionColumnXZ(1, line, viewType, pivotX, pivotY, I, J, toX, toZ);
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dz) || 1;
  return [dx / len, dz / len];
}

// Frecce del vento in pianta: un campionamento a passo `step` del field
// (stessa forma della modalità "arrows" 2D), posizionate/orientate con
// planWindHeight e la direzione fisica (u est+, v nord+) → mondo (-u, 0, v)
// (riflessione coerente con toX/toZ, vedi intestazione del file).
function planWindArrows(field, level, terrainCut, I, J, zLevels, boundaries, toX, toZ, refValue, size, density, cellSize) {
  const step = windStep(field.w, field.h, density);
  const start = Math.floor(step / 2);
  const lenScale = cellSize * step * (0.4 + 1.2 * (size / 100)) / refValue;
  const cells = [];
  for (let gy = start; gy < field.h; gy += step) {
    for (let gx = start; gx < field.w; gx += step) {
      const idx = gy * field.w + gx;
      const u = field.u[idx];
      const v = field.v[idx];
      if (!Number.isFinite(u) || !Number.isFinite(v)) continue;
      const speed = Math.hypot(u, v);
      const length = speed * lenScale;
      if (length < cellSize * 0.15) continue;
      const j = J - 1 - gy;
      cells.push({
        x: toX(gx), y: planWindHeight(idx, level, terrainCut, zLevels, boundaries) + cellSize * 0.05, z: toZ(j),
        dirX: -u, dirY: 0, dirZ: v, length, radius: cellSize * (0.05 + 0.1 * (size / 100)),
      });
    }
  }
  return cells;
}

// Testina di direzione "combined": SOLO punta (nessuna asta, vedi
// instancedFromCells(headGeometry(), ...) nei chiamanti), centrata sul punto
// points[p] (mondo) — non ancorata alla coda e proiettata in avanti come
// nella versione precedente, che per una freccia (asta+punta) rigida su una
// streamline che rigida non è finiva quasi sempre per staccarsene
// visibilmente, specie nei tratti più curvi. headGeometry() è già centrata
// (spanna -length/2..+length/2 lungo la tangente), quindi punta e base
// sporgono dal punto della curva in egual misura e di poco: bastano a
// leggere il verso del flusso senza mai "uscire" dalla linea. La tangente è
// presa dai vertici REALI già proiettati in mondo (p-1 → p+1), gli stessi di
// lineToSegmentCells, non da un campo ricampionato in un punto isolato.
function pushArrowhead(headCells, points, p, headLen, headRadius) {
  const [x0, y0, z0] = points[p - 1];
  const [x1, y1, z1] = points[p + 1];
  const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
  const segLen = Math.hypot(dx, dy, dz);
  if (segLen < 1e-6) return;
  const nx = dx / segLen, ny = dy / segLen, nz = dz / segLen;
  const [cx, cy, cz] = points[p];
  headCells.push({ x: cx, y: cy, z: cz, dirX: nx, dirY: ny, dirZ: nz, length: headLen, radius: headRadius });
}

// Streamline del vento in pianta: traccia con lo stesso tracciatore 2D dei
// grafici (traceStreamlines2D), poi rimappa ogni punto [gx,gy,speed] in
// mondo con la stessa altezza/direzione delle frecce. Restituisce celle di
// segmento (vedi lineToSegmentCells) invece di un THREE.Line, sempre visibili
// indipendentemente dal supporto lineWidth del driver WebGL.
function planWindLines(field, level, terrainCut, I, J, zLevels, boundaries, toX, toZ, refValue, size, density, arrowheads, cellSize) {
  const step = windStep(field.w, field.h, density);
  const lines = traceStreamlines2D(field, step, refValue);
  const radius = cellSize * (0.035 + 0.07 * (size / 100));
  const headLen = cellSize * COMBINED_MARKER_LEN_FACTOR;
  const headRadius = headLen * COMBINED_MARKER_ASPECT;
  const segCells = [];
  const headCells = [];
  const headSpacing = Math.max(2, step * 1.4);
  for (const line of lines) {
    const points = [];
    for (const [gx, gy, ] of line) {
      const gx0 = Math.min(field.w - 1, Math.max(0, gx));
      const gy0 = Math.min(field.h - 1, Math.max(0, gy));
      const idx = Math.round(gy0) * field.w + Math.round(gx0);
      const j = J - 1 - gy;
      points.push([toX(gx), planWindHeight(idx, level, terrainCut, zLevels, boundaries) + cellSize * 0.01, toZ(j)]);
    }
    segCells.push(...lineToSegmentCells(points, radius));
    if (arrowheads) {
      let acc = headSpacing / 2;
      for (let p = 1; p < points.length - 1; p++) {
        acc += 1;
        if (acc < headSpacing) continue;
        acc = 0;
        pushArrowhead(headCells, points, p, headLen, headRadius);
      }
    }
  }
  return { segCells, headCells };
}

// style === 'combined' NON somma la modalità "arrows" e "streamlines" (come
// prima d'ora): risolve solo la ramo "streamlines" con arrowheads=true, che
// disegna le streamline con le testine di direzione a spaziatura fissa —
// stessa semantica di "combined" nel canvas 2D (drawStreamlineArrowheads in
// MapChart.jsx). Aggiungere anche il campo di frecce pieno (ramo "arrows")
// duplicava il vento in due rappresentazioni sovrapposte sullo stesso piano.
function buildPlanWind(field, level, terrainCut, I, J, dx, dy, zLevels, boundaries, toX, toZ, refValue, style, size, density, material) {
  const group = new THREE.Group();
  const cellSize = Math.min(dx, dy);
  if (style === 'arrows') {
    const cells = planWindArrows(field, level, terrainCut, I, J, zLevels, boundaries, toX, toZ, refValue, size, density, cellSize);
    if (cells.length) group.add(instancedArrows(cells, material));
  }
  if (style === 'streamlines' || style === 'combined') {
    const { segCells, headCells } = planWindLines(field, level, terrainCut, I, J, zLevels, boundaries, toX, toZ, refValue, size, density, style === 'combined', cellSize);
    if (segCells.length) group.add(instancedSegments(segCells, material));
    if (headCells.length) group.add(instancedFromCells(headGeometry(), headCells, material));
  }
  return group;
}

// Frecce/streamline del vento su una sezione (X/Y, eventualmente ruotata):
// stessa struttura del caso pianta ma con la posizione/tangente di
// sectionColumnXZ/sectionTangentXZ e altezza fissa a centro riga (nessuna
// ambiguità verticale come in pianta).
function buildSectionWind(field, viewType, pivotX, pivotY, I, J, dx, dy, zLevels, boundaries, toX, toZ, refValue, style, size, density, material, line) {
  const group = new THREE.Group();
  const cellSize = Math.min(dx, dy);
  const [tx, tz] = sectionTangentXZ(line, viewType, pivotX, pivotY, I, J, toX, toZ);
  // row è l'indice di livello verticale, eventualmente frazionario (i punti
  // delle streamline non cadono su interi): windCellHeight interpola tra i
  // centri di due celle invece di indicizzare boundaries[] con un float, che
  // in JS fallirebbe silenziosamente (le proprietà di un array non sono numeriche).
  const rowY = (row) => windCellHeight(zLevels, boundaries, row);

  if (style === 'arrows') {
    const step = windStep(field.w, field.h, density);
    const start = Math.floor(step / 2);
    const lenScale = cellSize * step * (0.4 + 1.2 * (size / 100)) / refValue;
    const cells = [];
    for (let row = start; row < field.h; row += step) {
      for (let col = 0; col < field.w; col += step) {
        const idx = row * field.w + col;
        const horiz = field.u[idx];
        const vert = field.v[idx];
        if (!Number.isFinite(horiz) || !Number.isFinite(vert)) continue;
        const speed = Math.hypot(horiz, vert);
        const length = speed * lenScale;
        if (length < cellSize * 0.15) continue;
        const [x, z] = sectionColumnXZ(col, line, viewType, pivotX, pivotY, I, J, toX, toZ);
        cells.push({
          x, y: rowY(row), z,
          dirX: tx * horiz, dirY: vert, dirZ: tz * horiz, length, radius: cellSize * (0.05 + 0.1 * (size / 100)),
        });
      }
    }
    if (cells.length) group.add(instancedArrows(cells, material));
  }
  if (style === 'streamlines' || style === 'combined') {
    const step = windStep(field.w, field.h, density);
    const lines = traceStreamlines2D(field, step, refValue);
    const radius = cellSize * (0.035 + 0.07 * (size / 100));
    const headLen = cellSize * COMBINED_MARKER_LEN_FACTOR;
    const headRadius = headLen * COMBINED_MARKER_ASPECT;
    const segCells = [];
    const headCells = [];
    const headSpacing = Math.max(2, step * 1.4);
    for (const flowLine of lines) {
      const points = [];
      for (const [col, row] of flowLine) {
        const [x, z] = sectionColumnXZ(col, line, viewType, pivotX, pivotY, I, J, toX, toZ);
        points.push([x, rowY(row) + cellSize * 0.01, z]);
      }
      segCells.push(...lineToSegmentCells(points, radius));
      if (style === 'combined') {
        let acc = headSpacing / 2;
        for (let p = 1; p < points.length - 1; p++) {
          acc += 1;
          if (acc < headSpacing) continue;
          acc = 0;
          pushArrowhead(headCells, points, p, headLen, headRadius);
        }
      }
    }
    if (segCells.length) group.add(instancedSegments(segCells, material));
    if (headCells.length) group.add(instancedFromCells(headGeometry(), headCells, material));
  }
  return group;
}

// Overlay 3D del vento sulle fette dati già disegnate (pianta/sezioni): stesse
// viste/pivot/terrainCut/livello dell'overlay dati (buildDataOverlay), ma
// invece di voxel colorati disegna frecce/streamline del campo di vento
// proiettato su ciascun piano (già calcolato da useWindField per vista).
// windOverlay.views.{plan,sectionX,sectionY} sono risultati di useWindField
// (o null se quella vista non è attiva/disponibile); refValue è condiviso tra
// tutte le viste attive (vedi niceCeil in ModelView.jsx) così le lunghezze
// restano confrontabili.
export function buildWindOnSlices(model, windOverlay) {
  if (!windOverlay?.refValue) return null;
  const { views, refValue, style, opacity, size, density, pivot, terrainCut, level, dimZ, spacingZ } = windOverlay;
  if (!views.plan && !views.sectionX && !views.sectionY) return null;
  const { I, J, dx, dy } = model.geometry;
  const toX = (i) => (I * dx) / 2 - (i + 0.5) * dx;
  const toZ = (j) => (J * dy) / 2 - (j + 0.5) * dy;
  const zLevels = resolveZLevels(model.geometry, dimZ, spacingZ);
  const boundaries = levelBoundaries(zLevels);
  const alpha = Math.min(1, Math.max(0, opacity / 100));
  const material = new THREE.MeshBasicMaterial({
    color: windColor(), transparent: true, opacity: alpha,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  });
  const layer = new THREE.Group();
  layer.name = 'windOverlay';
  let any = false;

  if (views.plan) {
    layer.add(buildPlanWind(views.plan, level, terrainCut, I, J, dx, dy, zLevels, boundaries, toX, toZ, refValue, style, size, density, material));
    any = true;
  }
  if (views.sectionX) {
    layer.add(buildSectionWind(views.sectionX, 'sectionX', pivot.sectionX, pivot.sectionY, I, J, dx, dy, zLevels, boundaries, toX, toZ, refValue, style, size, density, material, views.sectionX.line ?? null));
    any = true;
  }
  if (views.sectionY) {
    layer.add(buildSectionWind(views.sectionY, 'sectionY', pivot.sectionX, pivot.sectionY, I, J, dx, dy, zLevels, boundaries, toX, toZ, refValue, style, size, density, material, views.sectionY.line ?? null));
    any = true;
  }

  if (!any) return null;
  layer.traverse((obj) => {
    if (obj.isMesh || obj.isInstancedMesh) {
      obj.castShadow = false;
      obj.receiveShadow = false;
    }
  });
  return layer;
}

// Spacchetta le celle piatte [x,y,z,dirX,dirY,dirZ,length,radius] prodotte da
// windVolumeWorker.js (8 float per cella) nel formato a oggetti che
// instancedArrows/instancedSegments già si aspettano.
function unpackCells(flat) {
  if (!flat || !flat.length) return [];
  const n = flat.length / 8;
  const out = Array.from({ length: n });
  for (let i = 0; i < n; i++) {
    const o = i * 8;
    out[i] = { x: flat[o], y: flat[o + 1], z: flat[o + 2], dirX: flat[o + 3], dirY: flat[o + 4], dirZ: flat[o + 5], length: flat[o + 6], radius: flat[o + 7] };
  }
  return out;
}

// Overlay 3D del campo di vento volumetrico: a differenza di
// buildWindOnSlices (proiezione 2D su un piano già disegnato) qui si
// riempie lo spazio 3D del dominio con frecce (e opzionalmente streamline),
// indipendentemente da quali fette dati sono visibili. Il calcolo pesante
// (caricamento del volume u/v/w, campionamento frecce, tracciamento
// streamline) gira in windVolumeWorker.js (vedi useWindVolumeCells in
// useSlice.js) — qui arrivano solo le celle già pronte, quindi la funzione si
// limita alla composizione delle mesh (economica, resta sul thread
// principale perché serve il contesto WebGL che un worker non ha).
export function buildWindVolume(windVolumeOverlay) {
  if (!windVolumeOverlay?.cells) return null;
  const { cells, opacity } = windVolumeOverlay;
  const alpha = Math.min(1, Math.max(0, opacity / 100));
  const material = new THREE.MeshBasicMaterial({ color: windColor(), transparent: true, opacity: alpha });
  const layer = new THREE.Group();
  layer.name = 'windVolume';
  let any = false;

  const arrowCells = unpackCells(cells.arrowCells);
  const segCells = unpackCells(cells.segCells);
  const headCells = unpackCells(cells.headCells);
  if (arrowCells.length) { layer.add(instancedArrows(arrowCells, material)); any = true; }
  if (segCells.length) { layer.add(instancedSegments(segCells, material)); any = true; }
  if (headCells.length) { layer.add(instancedFromCells(headGeometry(), headCells, material)); any = true; }

  if (!any) return null;
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

// Griglia di calcolo: pianta a terra + le 4 pareti verticali del dominio, una
// per lato. Le pareti usano gli stessi confini reali dei livelli Z
// (boundaries, non equispaziati — splitting/telescoping, vedi resolveZLevels)
// del resto della scena, così la "scansione" verticale rispecchia quella
// usata da ENVI-met invece di un passo verticale fisso. Ogni parete è un
// oggetto separato (non un'unica mesh): il viewer nasconde a runtime le due
// più vicine alla camera in base al lato del dominio su cui si trova (vedi
// updateGridWallVisibility), lasciando visibili solo quelle sullo sfondo.
function buildWallGeometry(count, step, boundaries, spanIsX) {
  const span = count * step;
  const top = boundaries[boundaries.length - 1];
  const pts = [];
  for (let n = 0; n <= count; n++) {
    const p = n * step - span / 2;
    if (spanIsX) pts.push(p, boundaries[0], 0, p, top, 0);
    else pts.push(0, boundaries[0], p, 0, top, p);
  }
  for (const b of boundaries) {
    if (spanIsX) pts.push(-span / 2, b, 0, span / 2, b, 0);
    else pts.push(0, b, -span / 2, 0, b, span / 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return geometry;
}

// Etichetta di quota: valore in metri, un decimale solo se non intero.
function formatMeters(value) {
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} m`;
}

// Le due quote in pianta (larghezza X, profondità Z) del dominio, disegnate
// come nel riferimento fornito dall'utente: linea offset verso l'esterno
// rispetto allo spigolo reale del box, con una piccola tacca perpendicolare a
// ciascuna estremità (stile "a parentesi", niente più linee di richiamo fino
// allo spigolo reale — resta solo lo scarto) ed etichetta in metri a metà
// linea. Costruite una volta per ciascuno dei 4 spigoli verticali del box
// (combinazioni di segno su X e Z): a runtime se ne mostra sempre e solo una,
// quella sullo spigolo davanti a destra rispetto alla camera (vedi
// updateGridWallVisibility), così le quote non finiscono mai sovrapposte al
// modello né confuse con la griglia delle pareti sullo sfondo.
function buildPlanDimensionCorner(W, H, top, xSign, zSign) {
  const scaleRef = Math.max(W, H, top);
  const margin = scaleRef * 0.06;
  const tickLen = scaleRef * 0.02;
  const cx = xSign * W / 2;
  const cz = zSign * H / 2;
  const ox = cx + xSign * margin;
  const oz = cz + zSign * margin;

  const pts = [
    ...buildDimensionLinePoints([-W / 2, 0, oz], [W / 2, 0, oz], [0, 0, 1], tickLen), // larghezza (X), offset in Z
    ...buildDimensionLinePoints([ox, 0, -H / 2], [ox, 0, H / 2], [1, 0, 0], tickLen), // profondità (Z), offset in X
  ];

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const material = new THREE.LineBasicMaterial({ color: 0x6b7278, transparent: true, opacity: 0.75 });
  const lines = new THREE.LineSegments(geometry, material);

  const labelScale = Math.max(scaleRef * 0.05, 1);
  const labelGap = labelScale * 0.55;
  const labelOpts = { color: '#4a5158', size: 60, scale: labelScale };
  const widthLabel = makeLabelSprite(formatMeters(W), labelOpts);
  widthLabel.position.set(0, labelGap, oz);
  const depthLabel = makeLabelSprite(formatMeters(H), labelOpts);
  depthLabel.position.set(ox, labelGap, 0);

  const corner = new THREE.Group();
  corner.add(lines, widthLabel, depthLabel);
  return corner;
}

// La quota in alzato (altezza Y): a differenza di larghezza/profondità resta
// sempre attaccata allo spigolo verticale dove si incontrano le due pareti di
// sfondo (stesso spigolo, stesso criterio di scelta delle pareti — vedi
// updateGridWallVisibility), invece che nel vuoto in primo piano: è l'unica
// quota per cui "sullo sfondo" resta leggibile (sporge sopra le pareti, non si
// confonde con la loro griglia) ed è più naturale leggerla lì, appoggiata al
// muro, piuttosto che isolata accanto al modello. Stesso stile "a parentesi"
// delle quote in pianta — linea scostata dallo spigolo reale con una tacca
// perpendicolare a ciascuna estremità — ma con l'etichetta ruotata di 90° a
// metà altezza, come nel riferimento fornito dall'utente (il testo corre
// lungo la linea invece di restare orizzontale e staccato).
function buildHeightCorner(W, H, top, xSign, zSign) {
  const scaleRef = Math.max(W, H, top);
  const margin = scaleRef * 0.05;
  const tickLen = scaleRef * 0.02;
  const dirX = xSign / Math.SQRT2;
  const dirZ = zSign / Math.SQRT2;
  const cx = xSign * W / 2 + dirX * margin;
  const cz = zSign * H / 2 + dirZ * margin;

  const pts = buildDimensionLinePoints([cx, 0, cz], [cx, top, cz], [dirX, 0, dirZ], tickLen);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const material = new THREE.LineBasicMaterial({ color: 0x6b7278, transparent: true, opacity: 0.75 });
  const line = new THREE.LineSegments(geometry, material);

  const labelScale = Math.max(scaleRef * 0.05, 1);
  const label = makeLabelSprite(formatMeters(top), { color: '#4a5158', size: 60, scale: labelScale, rotation: Math.PI / 2 });
  const labelGap = labelScale * 0.6;
  label.position.set(cx + dirX * labelGap, top / 2, cz + dirZ * labelGap);

  const corner = new THREE.Group();
  corner.add(line, label);
  return corner;
}

function buildDimensions(W, H, top) {
  const group = new THREE.Group();
  const planCorners = {};
  const heightCorners = {};
  for (const xSign of [-1, 1]) {
    for (const zSign of [-1, 1]) {
      const key = `${xSign}_${zSign}`;
      const planCorner = buildPlanDimensionCorner(W, H, top, xSign, zSign);
      planCorner.visible = false;
      group.add(planCorner);
      planCorners[key] = planCorner;

      const heightCorner = buildHeightCorner(W, H, top, xSign, zSign);
      heightCorner.visible = false;
      group.add(heightCorner);
      heightCorners[key] = heightCorner;
    }
  }
  group.userData.planCorners = planCorners;
  group.userData.heightCorners = heightCorners;
  return group;
}

function buildGrid(model, { W, H }, spacingZ, dimZ) {
  const { I, J, Z, dx, dy } = model.geometry;
  const points = [];
  for (let i = 0; i <= I; i++) points.push(i * dx - W / 2, 0, -H / 2, i * dx - W / 2, 0, H / 2);
  for (let j = 0; j <= J; j++) points.push(-W / 2, 0, j * dy - H / 2, W / 2, 0, j * dy - H / 2);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  const gridMaterial = () => new THREE.LineBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.35 });
  const ground = new THREE.LineSegments(geometry, gridMaterial());
  ground.position.y = 0.05;

  // Usa l'estensione verticale reale dei risultati caricati (dimZ, la stessa
  // usata da overlay dati / slice del vento / volume del vento) invece del
  // grids-Z dichiarato nell'INX: altrimenti, quando i due valori divergono,
  // le pareti del dominio risultano troncate rispetto agli slice/volume.
  const boundaries = levelBoundaries(resolveZLevels(model.geometry, dimZ || Z, spacingZ));
  const wallXGeo = buildWallGeometry(J, dy, boundaries, false); // fissa in x, si estende su z
  const wallZGeo = buildWallGeometry(I, dx, boundaries, true); // fissa in z, si estende su x

  const wallXNeg = new THREE.LineSegments(wallXGeo, gridMaterial());
  wallXNeg.position.x = -W / 2;
  const wallXPos = new THREE.LineSegments(wallXGeo, gridMaterial());
  wallXPos.position.x = W / 2;
  const wallZNeg = new THREE.LineSegments(wallZGeo, gridMaterial());
  wallZNeg.position.z = -H / 2;
  const wallZPos = new THREE.LineSegments(wallZGeo, gridMaterial());
  wallZPos.position.z = H / 2;

  const dimensions = buildDimensions(W, H, boundaries[boundaries.length - 1]);

  const layer = new THREE.Group();
  layer.add(ground, wallXNeg, wallXPos, wallZNeg, wallZPos, dimensions);
  layer.userData.walls = { xNeg: wallXNeg, xPos: wallXPos, zNeg: wallZNeg, zPos: wallZPos };
  layer.userData.dimensions = dimensions;
  return layer;
}

// Nasconde le due pareti del dominio più vicine alla camera, lasciando visibili
// solo le due sullo sfondo — evita che la griglia verticale copra il modello
// dal punto di vista corrente — e mostra le quote sullo spigolo opposto
// (davanti a destra rispetto alla camera: avanti = verso l'utente, destra =
// suo lato destro), così restano sempre in primo piano su sfondo libero
// invece di confondersi con le linee della griglia delle pareti. "Vicino"
// dipende solo dalla posizione della camera rispetto al centro del box
// (le pareti sono a x=±W/2, z=±H/2 attorno all'origine): usare invece
// right-forward (l'orientamento della camera) sembrava equivalente per
// un'orbita semplice ma non lo è in generale — per una camera che orbita
// a raggio costante attorno al target, right≈(cosθ,-sinθ) e forward≈
// (-sinθ,-cosθ), quindi il segno di right-forward segue cosθ+sinθ invece che
// il segno di sinθ (cioè della posizione x della camera): i due divergono per
// metà giro, il che faceva sparire/riapparire le pareti nell'ordine sbagliato
// durante la rotazione. Il vettore "right" resta necessario solo per scegliere
// lo spigolo delle quote a destra rispetto all'orientamento della camera.
// Richiamata ad ogni frame dal loop di rendering del viewer.
export function updateGridWallVisibility(layers, camera) {
  const walls = layers.grid?.userData.walls;
  const dimensions = layers.grid?.userData.dimensions?.userData;
  if (!walls && !dimensions) return;

  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const nearX = camera.position.x >= 0 ? 1 : -1;
  const nearZ = camera.position.z >= 0 ? 1 : -1;

  if (walls) {
    walls.xNeg.visible = nearX >= 0;
    walls.xPos.visible = nearX < 0;
    walls.zNeg.visible = nearZ >= 0;
    walls.zPos.visible = nearZ < 0;
  }
  if (dimensions) {
    // larghezza/profondità sullo spigolo vicino a destra. L'altezza va invece
    // sullo spigolo verticale destro delle due pareti di sfondo — non su
    // quello centrale dove le due pareti si incontrano (spesso nascosto
    // dietro il modello) — cioè lo spigolo "misto" (una parete di sfondo +
    // una vicina) più allineato al vettore "right" della camera.
    const nearKey = `${nearX}_${nearZ}`;
    for (const [key, corner] of Object.entries(dimensions.planCorners)) {
      corner.visible = key === nearKey;
    }
    const mixedA = { x: -nearX, z: nearZ };
    const mixedB = { x: nearX, z: -nearZ };
    const scoreA = right.x * mixedA.x + right.z * mixedA.z;
    const scoreB = right.x * mixedB.x + right.z * mixedB.z;
    const heightKey = scoreA >= scoreB ? `${mixedA.x}_${mixedA.z}` : `${mixedB.x}_${mixedB.z}`;
    for (const [key, corner] of Object.entries(dimensions.heightCorners)) {
      corner.visible = key === heightKey;
    }
  }
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
