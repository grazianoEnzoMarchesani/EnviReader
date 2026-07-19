// Costruzione della scena three.js dal modello INX parsato (vedi inx.js).
// Restituisce un gruppo centrato sull'origine con un sotto-gruppo per livello
// (edifici, vegetazione, terreno, ricettori, griglia) così i toggle della
// sidebar si riducono a cambiare la visibilità.
//
// Convenzioni: asse x = i (est), asse -z = j (nord), y = quota in metri.
// Le matrici INX sono scritte con la prima riga a nord: riga → j = J-1-riga.
// I database materiali ENVI-met sono cifrati, quindi i colori derivano
// dall'ID del materiale tramite una palette deterministica di fallback.

import * as THREE from 'three';
import { buildZLevels } from './inx';

const WALL_COLORS = [0xcfc8bb, 0xbfb6a6, 0xd8cfc0, 0xa8a39a, 0xc2b8ab, 0xb0a494];
const ROOF_COLORS = [0xa9573f, 0x8d8d8d, 0x9c6b52, 0x6f6f6f];
const SOIL_COLORS = {
  ST: 0x9a9a99, PG: 0xb5b0a7, PP: 0xb5b0a7, KK: 0x8f8f8e, // strade e pavimentazioni
  LO: 0x8a6f4d, SD: 0xcfc09a, LS: 0x8a6f4d, // suoli naturali
  WW: 0x4a7fb5, // acqua
};
const SOIL_DEFAULT = 0x97927f;
const GRASS_COLORS = [0x7fae5e, 0x8cba6b, 0x72a152, 0x93c473, 0x659146, 0x85b264];
const CROWN_COLORS = [0x4e7d3a, 0x5b8a47, 0x437031, 0x62914c, 0x396328, 0x558240];
const TRUNK_COLOR = 0x6b4f35;
const RECEPTOR_COLOR = 0xe0a83c;

function hashPick(id, palette) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
}

function soilColor(id) {
  if (!id || id === '000000') return SOIL_DEFAULT;
  return SOIL_COLORS[id.slice(-2).toUpperCase()] ?? SOIL_DEFAULT;
}

export function buildModelScene(model) {
  const { I, J, dx, dy } = model.geometry;
  const W = I * dx;
  const H = J * dy;
  const toX = (i) => (i + 0.5) * dx - W / 2;
  const toZ = (j) => H / 2 - (j + 0.5) * dy;
  const terrainAt = (i, j) => model.terrain?.data[j * I + i] ?? 0;

  const group = new THREE.Group();
  const layers = {
    terrain: buildTerrain(model, { W, H }),
    buildings: model.buildings3D?.entries.length
      ? buildVoxelBuildings(model, { toX, toZ })
      : buildExtrudedBuildings(model, { toX, toZ, terrainAt }),
    vegetation: buildVegetation(model, { toX, toZ, terrainAt }),
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

  group.add(new THREE.HemisphereLight(0xffffff, 0x777766, 1.15));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-W * 0.6, Math.max(W, H) * 0.8, -H * 0.4);
  group.add(sun);

  return { group, layers, size: { W, H }, maxHeight };
}

/* ---------- terreno ---------- */

function buildTerrain(model, { W, H }) {
  const { I, J, dx, dy } = model.geometry;
  // texture dei suoli: un pixel per cella, riga 0 del canvas = nord = j alto
  const canvas = document.createElement('canvas');
  canvas.width = I;
  canvas.height = J;
  const ctx = canvas.getContext('2d');
  for (let j = 0; j < J; j++) {
    for (let i = 0; i < I; i++) {
      const id = model.soils?.data[j * I + i] ?? '';
      ctx.fillStyle = `#${soilColor(id).toString(16).padStart(6, '0')}`;
      ctx.fillRect(i, J - 1 - j, 1, 1);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;

  const geometry = new THREE.PlaneGeometry(W, H, I, J);
  geometry.rotateX(-Math.PI / 2);
  if (model.terrain) {
    const pos = geometry.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const i = Math.min(I - 1, Math.max(0, Math.round((pos.getX(v) + W / 2) / dx - 0.5)));
      const j = Math.min(J - 1, Math.max(0, Math.round((H / 2 - pos.getZ(v)) / dy - 0.5)));
      pos.setY(v, model.terrain.data[j * I + i]);
    }
    geometry.computeVertexNormals();
  }
  const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ map: texture }));
  const layer = new THREE.Group();
  layer.add(mesh);
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

// Modello 2.5D: estrusione per cella da zBottom a zTop sopra il terreno
function buildExtrudedBuildings(model, { toX, toZ, terrainAt }) {
  const { I, J, dx, dy } = model.geometry;
  const { zTop, zBottom, buildingNr } = model.buildings2D;
  if (!zTop) return null;
  const walls = [];
  const roofs = [];
  let maxHeight = 0;
  for (let j = 0; j < J; j++) {
    for (let i = 0; i < I; i++) {
      const top = zTop.data[j * I + i];
      const bottom = zBottom?.data[j * I + i] ?? 0;
      if (!(top > 0) || top <= bottom) continue; // scarta celle vuote e zTop negativi anomali
      const nr = buildingNr?.data[j * I + i] ?? 0;
      const { wall, roof } = buildingColors(model, nr);
      const base = terrainAt(i, j) + bottom;
      const height = top - bottom;
      walls.push({ x: toX(i), z: toZ(j), y: base + height / 2, sx: dx, sz: dy, sy: height, color: wall });
      roofs.push({ x: toX(i), z: toZ(j), y: base + height + 0.06, sx: dx, sz: dy, sy: 0.12, color: roof });
      maxHeight = Math.max(maxHeight, top);
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
// color tetto sui voxel senza un altro voxel sopra
function buildVoxelBuildings(model, { toX, toZ }) {
  const { dx, dy } = model.geometry;
  const K = model.geometry3D?.K ?? model.buildings3D.K;
  const zLevels = buildZLevels(model.geometry, K);
  const occupied = new Set(model.buildings3D.entries.map((e) => `${e.i},${e.j},${e.k}`));
  const walls = [];
  const roofs = [];
  let maxHeight = 0;
  for (const e of model.buildings3D.entries) {
    const nr = parseInt(e.values[1] ?? e.values[0], 10) || 0;
    const { wall, roof } = buildingColors(model, nr);
    const level = zLevels[Math.min(e.k, zLevels.length - 1)];
    const top = level.base + level.height;
    walls.push({ x: toX(e.i), z: toZ(e.j), y: level.base + level.height / 2, sx: dx, sz: dy, sy: level.height, color: wall });
    if (!occupied.has(`${e.i},${e.j},${e.k + 1}`)) {
      roofs.push({ x: toX(e.i), z: toZ(e.j), y: top + 0.06, sx: dx, sz: dy, sy: 0.12, color: roof });
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

function buildVegetation(model, { toX, toZ, terrainAt }) {
  const { I, J, dx, dy } = model.geometry;
  const layer = new THREE.Group();

  // piante semplici (1D): tappeto basso color erba sulle celle occupate
  if (model.plants1D) {
    const cells = [];
    for (let j = 0; j < J; j++) {
      for (let i = 0; i < I; i++) {
        const id = model.plants1D.data[j * I + i];
        if (!id || id === '000000') continue;
        const h = 0.35;
        cells.push({ x: toX(i), z: toZ(j), y: terrainAt(i, j) + h / 2 + 0.02, sx: dx, sz: dy, sy: h, color: hashPick(id, GRASS_COLORS) });
      }
    }
    if (cells.length) layer.add(instancedBoxes(cells, new THREE.MeshLambertMaterial()));
  }

  // alberi 3D: tronco + chioma istanziati sulla cella radice
  if (model.plants3D.length) {
    const treeH = 7;
    const crownR = Math.max(dx, dy) * 0.75;
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.25, treeH * 0.45, 6);
    const crownGeo = new THREE.IcosahedronGeometry(crownR, 1);
    const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: TRUNK_COLOR }), model.plants3D.length);
    const crowns = new THREE.InstancedMesh(crownGeo, new THREE.MeshLambertMaterial(), model.plants3D.length);
    const m = new THREE.Matrix4();
    const cColor = new THREE.Color();
    model.plants3D.forEach((p, idx) => {
      const ground = terrainAt(Math.min(p.i, I - 1), Math.min(p.j, J - 1));
      const x = toX(p.i);
      const z = toZ(p.j);
      m.makeTranslation(x, ground + treeH * 0.225, z);
      trunks.setMatrixAt(idx, m);
      m.makeScale(1, 1.25, 1);
      m.setPosition(x, ground + treeH * 0.45 + crownR, z);
      crowns.setMatrixAt(idx, m);
      crowns.setColorAt(idx, cColor.setHex(hashPick(p.plantID || p.name || 'tree', CROWN_COLORS)));
    });
    layer.add(trunks, crowns);
    layer.userData.maxHeight = treeH;
  }
  return layer.children.length ? layer : null;
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
  for (const layer of Object.values(layers)) {
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
