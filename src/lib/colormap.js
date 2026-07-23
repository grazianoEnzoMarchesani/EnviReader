// Mappatura valori → colori: LUT a 256 gradini interpolata dalla palette
// e scrittura diretta dei pixel in una ImageData (i NaN restano trasparenti).

const LUT_STEPS = 256;

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Palette verde dell'overlay Objects (rv 11..15), condivisa con la
// ricostruzione voxel della vegetazione nel viewer 3D.
export const VEGETATION_COLORS = ['#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d'];

// Frazioni del raggio inscritto per lo "stile 1" (cerchi) della vegetazione,
// una per rv 11..15. Curva non lineare (concava): nello stile standard anche
// il LAD più basso occupava un'intera cella, quindi qui parte già a metà del
// raggio massimo invece che da un puntino, e cresce con incrementi decrescenti
// fino a riempire (rv=15) il lato più corto della cella.
export const VEG_STYLE1_RADIUS_FRACTIONS = [0.5, 0.72, 0.83, 0.92, 1];

// Edifici (rv=1): stile "sezione tecnica" invece del riempimento grigio pieno
// — contorno nero spesso sul solo perimetro esterno della sagoma e retino
// diagonale a 45° all'interno. Valori in pixel di output, indipendenti dalla
// dimensione reale della cella.
const BUILDING_BORDER_PX = 3;
const BUILDING_HATCH_SPACING = 10;
const BUILDING_HATCH_WIDTH = 2;
// Larghezza (in unità di px+py, quindi ~1/sqrt(2) px reali) della rampa di
// sfumatura ai due bordi del retino: senza questa il confronto (px+py)%spacing
// è un test binario e la diagonale a 45° viene renderizzata "a scalini".
const BUILDING_HATCH_AA = 1.5;

// Copertura frazionaria [0..1] della riga del retino nel pixel (px, py):
// 1 = pieno tratto, 0 = pieno sfondo, valori intermedi solo nella rampa di
// transizione — è l'anti-aliasing analitico della diagonale a 45°.
function hatchCoverage(px, py) {
  let m = (px + py) % BUILDING_HATCH_SPACING;
  if (m < 0) m += BUILDING_HATCH_SPACING;
  m -= BUILDING_HATCH_WIDTH / 2; // banda centrata sullo zero
  m -= BUILDING_HATCH_SPACING * Math.round(m / BUILDING_HATCH_SPACING); // wrap in [-spacing/2, spacing/2)
  const dist = Math.abs(m) - BUILDING_HATCH_WIDTH / 2; // <0 dentro la banda, >0 fuori
  return Math.min(1, Math.max(0, 0.5 - dist / BUILDING_HATCH_AA));
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
    style1 = false,
  } = opts;
  const opF = opacity / 100;

  // Riquadro di pixel di output occupato da ciascuna cella sorgente (indicizzato
  // per riga/colonna dati), popolato più sotto solo nel percorso ricampionato:
  // serve sia al contorno degli edifici sia ai cerchi della vegetazione (stile 1).
  let colStart, colEnd, rowStart, rowEnd;

  const isBuildingAt = (r, c) => r >= 0 && r < h && c >= 0 && c < w && Math.round(data[r * w + c]) === 1;

  const paintBuildingDefault = (pxArr, o) => {
    pxArr[o] = 75; pxArr[o+1] = 85; pxArr[o+2] = 99; pxArr[o+3] = 230 * opF;
  };

  const paintBuilding = (pxArr, o, px, py, r, c) => {
    if (colStart == null || !style1) {
      // Stile di default (style1 off, o percorso 1:1 senza ricampionamento
      // dove non c'è spazio per contorno/retino): riempimento piatto grigio.
      paintBuildingDefault(pxArr, o);
      return;
    }
    const distTop = py - rowStart[r];
    const distBottom = rowEnd[r] - py;
    const distLeft = px - colStart[c];
    const distRight = colEnd[c] - px;
    const isBorder =
      (distTop < BUILDING_BORDER_PX && !isBuildingAt(r + 1, c)) ||
      (distBottom < BUILDING_BORDER_PX && !isBuildingAt(r - 1, c)) ||
      (distLeft < BUILDING_BORDER_PX && !isBuildingAt(r, c - 1)) ||
      (distRight < BUILDING_BORDER_PX && !isBuildingAt(r, c + 1));
    if (isBorder) {
      pxArr[o] = 20; pxArr[o+1] = 20; pxArr[o+2] = 20; pxArr[o+3] = 255 * opF;
      return;
    }
    const cov = hatchCoverage(px, py);
    const gray = 255 - cov * (255 - 20);
    const alpha = (210 + cov * (220 - 210)) * opF;
    pxArr[o] = gray; pxArr[o+1] = gray; pxArr[o+2] = gray; pxArr[o+3] = alpha;
  };

  const assignPixel = (pxArr, o, v, px, py, r, c) => {
    // 1: Building (default: piatto grigio; style1: contorno + retino a 45°)
    // 2: Terrain (marrone chiaro)
    // 4: Contained source (rosso/viola trasparente)
    // 11-15: Vegetation (verde; style1: ritagliata a cerchio)
    const rv = Math.round(v);
    if (rv === 1 && showBuildings) {
      paintBuilding(pxArr, o, px, py, r, c);
    } else if (rv === 2 && showTerrain) {
      pxArr[o] = 163; pxArr[o+1] = 113; pxArr[o+2] = 84; pxArr[o+3] = 180 * opF;
    } else if (rv === 4) {
      pxArr[o] = 190; pxArr[o+1] = 40; pxArr[o+2] = 190; pxArr[o+3] = 200 * opF;
    } else if (rv >= 11 && rv <= 15 && showVegetation) {
      const [rC, gC, bC] = hexToRgb(VEGETATION_COLORS[rv - 11]);
      pxArr[o] = rC; pxArr[o+1] = gC; pxArr[o+2] = bC; pxArr[o+3] = 200 * opF;
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
        assignPixel(px, (row * w + col) * 4, v, col, row, srcRow, col);
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

  // Riquadro di pixel di output occupato da ciascuna cella (mapX/mapY sono
  // monotone, quindi ogni cella corrisponde a un intervallo contiguo di
  // pixel): serve al contorno degli edifici e ai cerchi della vegetazione,
  // che devono restare tali (mai ovalizzati) anche su celle rettangolari.
  colStart = new Int32Array(w).fill(-1);
  colEnd = new Int32Array(w);
  for (let px = 0; px < targetW; px++) {
    const c = mapX[px];
    if (colStart[c] === -1) colStart[c] = px;
    colEnd[c] = px;
  }
  rowStart = new Int32Array(h).fill(-1);
  rowEnd = new Int32Array(h);
  for (let py = 0; py < targetH; py++) {
    const r = mapY[py];
    if (rowStart[r] === -1) rowStart[r] = py;
    rowEnd[r] = py;
  }

  const img = new ImageData(targetW, targetH);
  const pxArr = img.data;

  for (let py = 0; py < targetH; py++) {
    const srcRow = mapY[py];
    for (let px = 0; px < targetW; px++) {
      const srcCol = mapX[px];
      const v = data[srcRow * w + srcCol];
      if (Number.isNaN(v)) continue;
      const o = (py * targetW + px) * 4;
      assignPixel(pxArr, o, v, px, py, srcRow, srcCol);
      if (style1 && showVegetation) {
        const rv = Math.round(v);
        if (rv >= 11 && rv <= 15) {
          const cellW = colEnd[srcCol] - colStart[srcCol] + 1;
          const cellH = rowEnd[srcRow] - rowStart[srcRow] + 1;
          const centerX = colStart[srcCol] + cellW / 2;
          const centerY = rowStart[srcRow] + cellH / 2;
          const radius = (Math.min(cellW, cellH) / 2) * VEG_STYLE1_RADIUS_FRACTIONS[rv - 11];
          const dx = px + 0.5 - centerX;
          const dy = py + 0.5 - centerY;
          if (dx * dx + dy * dy > radius * radius) pxArr[o + 3] = 0;
        }
      }
    }
  }
  return img;
}

