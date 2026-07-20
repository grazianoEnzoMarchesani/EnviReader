// Mappatura valori → colori: LUT a 256 gradini interpolata dalla palette
// e scrittura diretta dei pixel in una ImageData (i NaN restano trasparenti).

const LUT_STEPS = 256;

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function orientColors(colors, reversed) {
  return reversed ? [...colors].reverse() : colors;
}

export function buildLUT(colors, reversed = false) {
  const stops = orientColors(colors, reversed).map(hexToRgb);
  const lut = new Uint8ClampedArray(LUT_STEPS * 3);
  for (let i = 0; i < LUT_STEPS; i++) {
    const pos = (i / (LUT_STEPS - 1)) * (stops.length - 1);
    const k = Math.min(Math.floor(pos), stops.length - 2);
    const f = pos - k;
    for (let c = 0; c < 3; c++) {
      lut[i * 3 + c] = stops[k][c] + (stops[k + 1][c] - stops[k][c]) * f;
    }
  }
  return lut;
}

// La riga 0 dei dati ENVI-met è a sud: il canvas viene riempito capovolto
// così il nord resta in alto (pianta) e l'alto resta in alto (sezioni).
// Se spacingX e spacingY sono forniti, esegue un ricampionamento fulmineo su
// una risoluzione maggiore per preservare le proporzioni variabili dei tasselli.
export function sliceToImageData(data, w, h, min, max, lut, spacingX, spacingY, extentW, extentH) {
  if (!spacingX || !spacingY) {
    const img = new ImageData(w, h);
    const px = img.data;
    const range = max - min || 1;
    for (let row = 0; row < h; row++) {
      const srcRow = h - 1 - row;
      for (let col = 0; col < w; col++) {
        const v = data[srcRow * w + col];
        if (Number.isNaN(v)) continue;
        let t = (v - min) / range;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const k = (t * (LUT_STEPS - 1)) | 0;
        const o = (row * w + col) * 4;
        px[o] = lut[k * 3];
        px[o + 1] = lut[k * 3 + 1];
        px[o + 2] = lut[k * 3 + 2];
        px[o + 3] = 255;
      }
    }
    return img;
  }

  const MAX_DIM = 1024;
  let targetW, targetH;
  if (extentW > extentH) {
    targetW = MAX_DIM;
    targetH = Math.max(1, Math.round(MAX_DIM * (extentH / extentW)));
  } else {
    targetH = MAX_DIM;
    targetW = Math.max(1, Math.round(MAX_DIM * (extentW / extentH)));
  }

  const boundsX = new Float64Array(w + 1);
  let curX = 0;
  for (let i = 0; i < w; i++) { boundsX[i] = curX; curX += spacingX[i]; }
  boundsX[w] = extentW;

  const boundsY = new Float64Array(h + 1);
  let curY = 0;
  for (let i = 0; i < h; i++) { boundsY[i] = curY; curY += spacingY[h - 1 - i]; }
  boundsY[h] = extentH;

  const mapX = new Int32Array(targetW);
  let cx = 0;
  for (let px = 0; px < targetW; px++) {
    const x = (px + 0.5) * (extentW / targetW);
    while (cx < w - 1 && x >= boundsX[cx + 1]) cx++;
    mapX[px] = cx;
  }

  const mapY = new Int32Array(targetH);
  let cy = 0;
  for (let py = 0; py < targetH; py++) {
    const y = (py + 0.5) * (extentH / targetH);
    while (cy < h - 1 && y >= boundsY[cy + 1]) cy++;
    mapY[py] = h - 1 - cy;
  }

  const img = new ImageData(targetW, targetH);
  const pxArr = img.data;
  const range = max - min || 1;

  for (let py = 0; py < targetH; py++) {
    const srcRow = mapY[py];
    for (let px = 0; px < targetW; px++) {
      const srcCol = mapX[px];
      const v = data[srcRow * w + srcCol];
      if (Number.isNaN(v)) continue;
      let t = (v - min) / range;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const k = (t * (LUT_STEPS - 1)) | 0;
      const o = (py * targetW + px) * 4;
      pxArr[o] = lut[k * 3];
      pxArr[o + 1] = lut[k * 3 + 1];
      pxArr[o + 2] = lut[k * 3 + 2];
      pxArr[o + 3] = 255;
    }
  }
  return img;
}

export function formatValue(value, span = 0) {
  if (!Number.isFinite(value)) return '–';
  const decimals = Math.abs(span || value) >= 100 ? 1 : 2;
  return value.toFixed(decimals);
}

// Genera una ImageData per l'overlay degli oggetti
export function objectsToImageData(data, w, h, spacingX, spacingY, extentW, extentH, opts = {}) {
  const {
    opacity = 70,
    showBuildings = true,
    showTerrain = true,
    showVegetation = true,
  } = opts;
  const opF = opacity / 100;

  const assignPixel = (pxArr, o, v) => {
    // 1: Building (grigio scuro)
    // 2: Terrain (marrone chiaro)
    // 4: Contained source (rosso/viola trasparente)
    // 11-15: Vegetation (verde)
    const rv = Math.round(v);
    if (rv === 1 && showBuildings) {
      pxArr[o] = 75; pxArr[o+1] = 85; pxArr[o+2] = 99; pxArr[o+3] = 230 * opF;
    } else if (rv === 2 && showTerrain) {
      pxArr[o] = 163; pxArr[o+1] = 113; pxArr[o+2] = 84; pxArr[o+3] = 180 * opF;
    } else if (rv === 4) {
      pxArr[o] = 190; pxArr[o+1] = 40; pxArr[o+2] = 190; pxArr[o+3] = 200 * opF;
    } else if (rv >= 11 && rv <= 15 && showVegetation) {
      if (rv === 11) { pxArr[o] = 134; pxArr[o+1] = 239; pxArr[o+2] = 172; pxArr[o+3] = 200 * opF; } // Verde molto chiaro
      else if (rv === 12) { pxArr[o] = 74; pxArr[o+1] = 222; pxArr[o+2] = 128; pxArr[o+3] = 200 * opF; } // Verde chiaro
      else if (rv === 13) { pxArr[o] = 34; pxArr[o+1] = 197; pxArr[o+2] = 94; pxArr[o+3] = 200 * opF; } // Verde medio (originale)
      else if (rv === 14) { pxArr[o] = 22; pxArr[o+1] = 163; pxArr[o+2] = 74; pxArr[o+3] = 200 * opF; } // Verde scuro
      else if (rv === 15) { pxArr[o] = 21; pxArr[o+1] = 128; pxArr[o+2] = 61; pxArr[o+3] = 200 * opF; } // Verde molto scuro
    } else {
      pxArr[o+3] = 0; // Trasparente
    }
  };

  if (!spacingX || !spacingY) {
    const img = new ImageData(w, h);
    const px = img.data;
    for (let row = 0; row < h; row++) {
      const srcRow = h - 1 - row;
      for (let col = 0; col < w; col++) {
        const v = data[srcRow * w + col];
        if (Number.isNaN(v)) continue;
        assignPixel(px, (row * w + col) * 4, v);
      }
    }
    return img;
  }

  const MAX_DIM = 1024;
  let targetW, targetH;
  if (extentW > extentH) {
    targetW = MAX_DIM;
    targetH = Math.max(1, Math.round(MAX_DIM * (extentH / extentW)));
  } else {
    targetH = MAX_DIM;
    targetW = Math.max(1, Math.round(MAX_DIM * (extentW / extentH)));
  }

  const boundsX = new Float64Array(w + 1);
  let curX = 0;
  for (let i = 0; i < w; i++) { boundsX[i] = curX; curX += spacingX[i]; }
  boundsX[w] = extentW;

  const boundsY = new Float64Array(h + 1);
  let curY = 0;
  for (let i = 0; i < h; i++) { boundsY[i] = curY; curY += spacingY[h - 1 - i]; }
  boundsY[h] = extentH;

  const mapX = new Int32Array(targetW);
  let cx = 0;
  for (let px = 0; px < targetW; px++) {
    const x = (px + 0.5) * (extentW / targetW);
    while (cx < w - 1 && x >= boundsX[cx + 1]) cx++;
    mapX[px] = cx;
  }

  const mapY = new Int32Array(targetH);
  let cy = 0;
  for (let py = 0; py < targetH; py++) {
    const y = (py + 0.5) * (extentH / targetH);
    while (cy < h - 1 && y >= boundsY[cy + 1]) cy++;
    mapY[py] = h - 1 - cy;
  }

  const img = new ImageData(targetW, targetH);
  const pxArr = img.data;

  for (let py = 0; py < targetH; py++) {
    const srcRow = mapY[py];
    for (let px = 0; px < targetW; px++) {
      const srcCol = mapX[px];
      const v = data[srcRow * w + srcCol];
      if (Number.isNaN(v)) continue;
      assignPixel(pxArr, (py * targetW + px) * 4, v);
    }
  }
  return img;
}

