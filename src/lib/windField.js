// Matematica pura del campo di vento (nessuna dipendenza da canvas/DOM/THREE),
// condivisa tra il rendering 2D su canvas (MapChart.jsx) e la geometria 3D
// (inxScene.js): interpolazione del campo e tracciamento delle streamline,
// sia nel piano (2D, usato dagli slice) sia nel volume (3D, usato dal campo
// di vento volumetrico).

// Arrotonda per eccesso a un valore "tondo" 1/2/5 × 10^k: è il valore di
// riferimento della legenda del vento (nessuna freccia lo supera).
export function niceCeil(value) {
  if (!(value > 0)) return 0;
  const exp = Math.floor(Math.log10(value));
  const base = value / 10 ** exp;
  const nice = base <= 1 ? 1 : base <= 2 ? 2 : base <= 5 ? 5 : 10;
  return nice * 10 ** exp;
}

// Interpolazione bilineare delle componenti del vento nel punto (x, y) in
// coordinate di griglia (centri cella sugli interi); null su celle senza dati.
export function sampleField(field, x, y) {
  if (field.w < 2 || field.h < 2) return null;
  // Clamp-to-edge: la cella di interpolazione resta ancorata all'ultima
  // valida, così l'ultima riga/colonna resta bilineare invece di collassare
  // su un singolo vicino più prossimo (causava streamline convergenti a
  // raggiera vicino ai bordi della griglia).
  const cx = Math.min(field.w - 1, Math.max(0, x));
  const cy = Math.min(field.h - 1, Math.max(0, y));
  const x0 = Math.min(field.w - 2, Math.floor(cx));
  const y0 = Math.min(field.h - 2, Math.floor(cy));
  const i00 = y0 * field.w + x0;
  const i10 = i00 + 1;
  const i01 = i00 + field.w;
  const i11 = i01 + 1;
  const u = [field.u[i00], field.u[i10], field.u[i01], field.u[i11]];
  const v = [field.v[i00], field.v[i10], field.v[i01], field.v[i11]];
  for (let k = 0; k < 4; k++) if (!Number.isFinite(u[k]) || !Number.isFinite(v[k])) return null;
  const fx = cx - x0;
  const fy = cy - y0;
  const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
  return [
    u[0] * w00 + u[1] * w10 + u[2] * w01 + u[3] * w11,
    v[0] * w00 + v[1] * w10 + v[2] * w01 + v[3] * w11,
  ];
}

// Linee di flusso a spaziatura uniforme (Jobard–Lefer semplificato): una
// maschera di occupazione a passo `sep` celle decide dove nascono le linee e
// le ferma quando toccano la scia di un'altra; l'integrazione segue il verso
// del campo in avanti e all'indietro dal seme, a passo costante in celle.
// Ogni punto è [x, y, velocità]: la velocità modula lo spessore del tratto.
export function traceStreamlines2D(field, sep, refValue) {
  // Soglia di stop relativa alla velocità di riferimento: vicino a punti
  // singolari del campo (ricircoli, scie di edifici) il vento tende a zero e
  // le linee, marciando a passo pieno normalizzato, continuerebbero fin
  // quasi al punto esatto prima di fermarsi — creando un ventaglio di raggi
  // che convergono tutti sullo stesso pixel. Fermandole prima si evita
  // l'affollamento visivo lasciando codine corte invece di raggi lunghi.
  const minSpeed = Math.max(1e-4, (refValue || 0) * 0.03);
  // La maschera è più fine del passo di semina (metà): una linea in marcia
  // muore solo quando arriva a ~sep/2 da un'altra, non a sep — altrimenti le
  // linee si spezzano in trattini appena nate. Il seme invece pretende libere
  // anche le celle adiacenti, così i punti di partenza distano circa sep.
  const res = Math.max(0.75, sep / 2);
  const mw = Math.ceil(field.w / res);
  const mh = Math.ceil(field.h / res);
  const mask = new Int32Array(mw * mh).fill(-1);
  const maskCol = (x) => Math.min(mw - 1, Math.max(0, Math.floor(x / res)));
  const maskRow = (y) => Math.min(mh - 1, Math.max(0, Math.floor(y / res)));
  const maskIdx = (x, y) => maskRow(y) * mw + maskCol(x);
  const seedFree = (x, y) => {
    const c = maskCol(x);
    const r = maskRow(y);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= mh || cc >= mw) continue;
        if (mask[rr * mw + cc] !== -1) return false;
      }
    }
    return true;
  };
  const lines = [];
  const STEP = 0.4; // passo di integrazione in celle
  const maxSteps = 4 * (field.w + field.h);

  const march = (id, x0, y0, dir, out) => {
    let x = x0;
    let y = y0;
    for (let s = 0; s < maxSteps; s++) {
      const uv = sampleField(field, x, y);
      if (!uv) break;
      const speed = Math.hypot(uv[0], uv[1]);
      if (speed < minSpeed) break;
      x += (uv[0] / speed) * STEP * dir;
      y += (uv[1] / speed) * STEP * dir;
      if (x < 0 || y < 0 || x > field.w - 1 || y > field.h - 1) break;
      const m = maskIdx(x, y);
      if (mask[m] !== -1 && mask[m] !== id) break;
      mask[m] = id;
      out.push([x, y, speed]);
    }
  };

  for (let gy = 0; gy < field.h; gy += sep) {
    for (let gx = 0; gx < field.w; gx += sep) {
      if (!seedFree(gx, gy)) continue;
      const uv0 = sampleField(field, gx, gy);
      if (!uv0) continue;
      const id = lines.length;
      mask[maskIdx(gx, gy)] = id;
      const fwd = [];
      const bwd = [];
      march(id, gx, gy, 1, fwd);
      march(id, gx, gy, -1, bwd);
      const pts = [...bwd.reverse(), [gx, gy, Math.hypot(uv0[0], uv0[1])], ...fwd];
      if (pts.length >= 3) lines.push(pts);
    }
  }
  return lines;
}

/* ---------- estensioni 3D (campo di vento volumetrico) ---------- */

// Interpolazione trilineare di (u, v, w) nel punto (x, y, z) in coordinate di
// griglia (centri cella sugli interi); null su celle senza dati. Stessa
// logica di clamp-to-edge di sampleField, estesa a 8 vertici del cubo.
export function sampleField3D(volume, x, y, z) {
  const { x: dimX, y: dimY, z: dimZ } = volume.dims;
  if (dimX < 2 || dimY < 2 || dimZ < 2) return null;
  const cx = Math.min(dimX - 1, Math.max(0, x));
  const cy = Math.min(dimY - 1, Math.max(0, y));
  const cz = Math.min(dimZ - 1, Math.max(0, z));
  const x0 = Math.min(dimX - 2, Math.floor(cx));
  const y0 = Math.min(dimY - 2, Math.floor(cy));
  const z0 = Math.min(dimZ - 2, Math.floor(cz));
  const fx = cx - x0;
  const fy = cy - y0;
  const fz = cz - z0;
  const idx = (xi, yi, zi) => (zi * dimY + yi) * dimX + xi;
  let u = 0, v = 0, w = 0;
  for (let dz = 0; dz <= 1; dz++) {
    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = 0; dx <= 1; dx++) {
        const i = idx(x0 + dx, y0 + dy, z0 + dz);
        const uu = volume.u[i], vv = volume.v[i], ww = volume.w[i];
        if (!Number.isFinite(uu) || !Number.isFinite(vv) || !Number.isFinite(ww)) return null;
        const weight = (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy) * (dz ? fz : 1 - fz);
        u += uu * weight;
        v += vv * weight;
        w += ww * weight;
      }
    }
  }
  return [u, v, w];
}

// Estensione 3D di traceStreamlines2D: stessa idea (semina a passo `sep`,
// maschera di occupazione, marcia in avanti/indietro a passo normalizzato),
// ma su un volume invece che su un piano. La maschera è limitata in
// dimensione (maxMaskCells) per evitare Int32Array enormi su griglie grandi:
// oltre la soglia la risoluzione della maschera viene rilassata (celle più
// grosse), sacrificando un po' di precisione nell'anti-affollamento invece
// di esaurire la memoria. maxSteps è a sua volta limitato in valore assoluto
// per lo stesso motivo (domini 3D grandi altrimenti generano linee lunghissime).
export function traceStreamlines3D(volume, sep, refValue, opts = {}) {
  const { maxMaskCells = 2_000_000, maxStepsCap = 4000 } = opts;
  const { x: dimX, y: dimY, z: dimZ } = volume.dims;
  const minSpeed = Math.max(1e-4, (refValue || 0) * 0.03);
  let res = Math.max(0.75, sep / 2);
  const cellsFor = (r) => Math.ceil(dimX / r) * Math.ceil(dimY / r) * Math.ceil(dimZ / r);
  while (cellsFor(res) > maxMaskCells) res *= 1.3;
  const mw = Math.max(1, Math.ceil(dimX / res));
  const mh = Math.max(1, Math.ceil(dimY / res));
  const md = Math.max(1, Math.ceil(dimZ / res));
  const mask = new Int32Array(mw * mh * md).fill(-1);
  const maskC = (v, m) => Math.min(m - 1, Math.max(0, Math.floor(v / res)));
  const maskIdx = (x, y, z) => (maskC(z, md) * mh + maskC(y, mh)) * mw + maskC(x, mw);
  const seedFree = (x, y, z) => {
    const cx = maskC(x, mw), cy = maskC(y, mh), cz = maskC(z, md);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = cx + dx, yy = cy + dy, zz = cz + dz;
          if (xx < 0 || yy < 0 || zz < 0 || xx >= mw || yy >= mh || zz >= md) continue;
          if (mask[(zz * mh + yy) * mw + xx] !== -1) return false;
        }
      }
    }
    return true;
  };
  const lines = [];
  const STEP = 0.4;
  const maxSteps = Math.min(maxStepsCap, 4 * (dimX + dimY + dimZ));

  const march = (id, x0, y0, z0, dir, out) => {
    let x = x0, y = y0, z = z0;
    for (let s = 0; s < maxSteps; s++) {
      const uvw = sampleField3D(volume, x, y, z);
      if (!uvw) break;
      const speed = Math.hypot(uvw[0], uvw[1], uvw[2]);
      if (speed < minSpeed) break;
      x += (uvw[0] / speed) * STEP * dir;
      y += (uvw[1] / speed) * STEP * dir;
      z += (uvw[2] / speed) * STEP * dir;
      if (x < 0 || y < 0 || z < 0 || x > dimX - 1 || y > dimY - 1 || z > dimZ - 1) break;
      const m = maskIdx(x, y, z);
      if (mask[m] !== -1 && mask[m] !== id) break;
      mask[m] = id;
      out.push([x, y, z, speed]);
    }
  };

  for (let gz = 0; gz < dimZ; gz += sep) {
    for (let gy = 0; gy < dimY; gy += sep) {
      for (let gx = 0; gx < dimX; gx += sep) {
        if (!seedFree(gx, gy, gz)) continue;
        const uvw0 = sampleField3D(volume, gx, gy, gz);
        if (!uvw0) continue;
        const id = lines.length;
        mask[maskIdx(gx, gy, gz)] = id;
        const fwd = [];
        const bwd = [];
        march(id, gx, gy, gz, 1, fwd);
        march(id, gx, gy, gz, -1, bwd);
        const pts = [...bwd.reverse(), [gx, gy, gz, Math.hypot(uvw0[0], uvw0[1], uvw0[2])], ...fwd];
        if (pts.length >= 3) lines.push(pts);
      }
    }
  }
  return lines;
}
