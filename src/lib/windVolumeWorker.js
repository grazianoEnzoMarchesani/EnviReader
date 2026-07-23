// Web Worker: calcolo pesante del campo di vento volumetrico (caricamento
// dell'intero volume u/v/w + campionamento frecce/tracciamento streamline)
// fuori dal thread principale, così muovere la camera o toccare un controllo
// non si blocca mentre il vento viene ricalcolato — a differenza della
// versione precedente, che faceva tutto questo lavoro in modo sincrono dentro
// buildWindVolume (inxScene.js), sul thread della UI.
//
// Nessun accesso a three.js/DOM qui dentro (un worker non ha contesto WebGL):
// il risultato sono solo numeri, celle piatte [x,y,z,dirX,dirY,dirZ,length,
// radius] impacchettate in Float32Array e trasferite (zero-copy) al thread
// principale, che le passa a instancedArrows/instancedSegments (inxScene.js)
// per costruire le mesh — l'unica parte che deve restare lì.
import { loadWindVolume } from './envimet';
import { niceCeil, traceStreamlines3D } from './windField';
import { resolveZLevels, levelBoundaries, windCellHeight, volumeArrowStride, volumeStreamSep } from './windVolumeMath';

function packCells(list) {
  const out = new Float32Array(list.length * 8);
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    const o = i * 8;
    out[o] = c.x; out[o + 1] = c.y; out[o + 2] = c.z;
    out[o + 3] = c.dirX; out[o + 4] = c.dirY; out[o + 5] = c.dirZ;
    out[o + 6] = c.length; out[o + 7] = c.radius;
  }
  return out;
}

function computeCells({ structure, groupPath, timeIndex, geometry, spacingZ, style, size, density }) {
  return loadWindVolume(structure, groupPath, timeIndex).then((volume) => {
    if (!volume?.maxMag) return null;
    const refValue = niceCeil(volume.maxMag);
    if (!refValue) return null;
    const { dims } = volume;
    const { I, J, dx, dy } = geometry;
    if (dims.x !== I || dims.y !== J) return null;

    const toX = (i) => (I * dx) / 2 - (i + 0.5) * dx;
    const toZ = (j) => (J * dy) / 2 - (j + 0.5) * dy;
    const zLevels = resolveZLevels(geometry, dims.z, spacingZ);
    const boundaries = levelBoundaries(zLevels);
    const cellSize = Math.min(dx, dy);

    const arrowCells = [];
    const segCells = [];
    const headCells = [];

    // 'combined' non somma il campo di frecce pieno a quello delle
    // streamline (sommava due rappresentazioni indipendenti del vento sullo
    // stesso volume): risolve solo il ramo streamlines qui sotto, con le
    // testine di direzione (headCells) a spaziatura fissa lungo le linee —
    // stessa semantica di "combined" nel canvas 2D e nelle slice piano/sezione.
    if (style === 'arrows') {
      const stride = volumeArrowStride(dims, density);
      const lenScale = (cellSize * stride * (0.4 + 1.2 * (size / 100))) / refValue;
      for (let k = Math.floor(stride / 2); k < dims.z; k += stride) {
        for (let j = Math.floor(stride / 2); j < J; j += stride) {
          const edtRow = J - 1 - j;
          for (let i = Math.floor(stride / 2); i < I; i += stride) {
            const idx = (k * dims.y + edtRow) * dims.x + i;
            const u = volume.u[idx];
            const v = volume.v[idx];
            const w = volume.w[idx];
            if (!Number.isFinite(u) || !Number.isFinite(v) || !Number.isFinite(w)) continue;
            const speed = Math.hypot(u, v, w);
            const length = speed * lenScale;
            if (length < cellSize * 0.15) continue;
            arrowCells.push({
              x: toX(i), y: windCellHeight(zLevels, boundaries, k), z: toZ(j),
              dirX: -u, dirY: w, dirZ: v, length, radius: cellSize * (0.05 + 0.1 * (size / 100)),
            });
          }
        }
      }
    }

    if (style === 'streamlines' || style === 'combined') {
      const sep = volumeStreamSep(dims, density);
      const lines = traceStreamlines3D(volume, sep, refValue);
      const radius = cellSize * (0.035 + 0.07 * (size / 100));
      // Solo punta (nessuna asta, vedi headGeometry/instancedFromCells in
      // inxScene.js), tozza e centrata sul punto della curva — non ancorata
      // alla coda e proiettata in avanti, altrimenti su una streamline curva
      // se ne stacca visibilmente (vedi pushArrowhead, inxScene.js).
      const headLen = cellSize * 0.42;
      const headRadius = headLen * 0.4;
      const headSpacing = Math.max(2, sep * 1.4);
      for (const line of lines) {
        const points = line.map(([gi, gj, gk]) => [toX(gi), windCellHeight(zLevels, boundaries, gk) + cellSize * 0.01, toZ(J - 1 - gj)]);
        for (let p = 1; p < points.length; p++) {
          const [x0, y0, z0] = points[p - 1];
          const [x1, y1, z1] = points[p];
          const ddx = x1 - x0, ddy = y1 - y0, ddz = z1 - z0;
          const length = Math.hypot(ddx, ddy, ddz);
          if (length < 1e-6) continue;
          segCells.push({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: (z0 + z1) / 2, dirX: ddx, dirY: ddy, dirZ: ddz, length, radius });
        }
        if (style === 'combined') {
          // Testina centrata sul punto points[p] (mondo), tangente presa dai
          // vertici REALI p-1→p+1 già usati per i segCells — non dal campo
          // u/v/w ricampionato in un punto isolato — così coda e punta
          // restano sulla curva anche dove questa flette parecchio, invece
          // di proiettare una freccia rigida in avanti che se ne stacca
          // visibilmente (vedi stessa logica in pushArrowhead, inxScene.js).
          let acc = headSpacing / 2;
          for (let p = 1; p < points.length - 1; p++) {
            acc += 1;
            if (acc < headSpacing) continue;
            acc = 0;
            const [x0, y0, z0] = points[p - 1];
            const [x1, y1, z1] = points[p + 1];
            const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
            const segLen = Math.hypot(dx, dy, dz);
            if (segLen < 1e-6) continue;
            const nx = dx / segLen, ny = dy / segLen, nz = dz / segLen;
            const [cx, cy, cz] = points[p];
            headCells.push({ x: cx, y: cy, z: cz, dirX: nx, dirY: ny, dirZ: nz, length: headLen, radius: headRadius });
          }
        }
      }
    }

    return { arrowCells: packCells(arrowCells), segCells: packCells(segCells), headCells: packCells(headCells) };
  });
}

self.onmessage = async (e) => {
  const { requestId } = e.data;
  try {
    const result = await computeCells(e.data);
    if (!result) {
      self.postMessage({ requestId, empty: true });
      return;
    }
    const { arrowCells, segCells, headCells } = result;
    self.postMessage(
      { requestId, empty: false, arrowCells, segCells, headCells },
      [arrowCells.buffer, segCells.buffer, headCells.buffer],
    );
  } catch (err) {
    self.postMessage({ requestId, error: String(err?.message || err) });
  }
};
