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
export function sliceToImageData(data, w, h, min, max, lut, spacingX, spacingY, extentW, extentH, maxDim = 1024) {
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

  const MAX_DIM = maxDim;
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

// Numero di fasce del filled contour: compromesso tra leggibilità delle
// bande e granularità del dato, condiviso tra la mappa 2D e l'overlay 3D
// (vedi CONTOUR_BANDS in inxScene.js) così i due viewer restano coerenti.
export const CONTOUR_BANDS = 12;

// Centro fisico (coordinata continua, origine 0) di ciascuna cella lungo un
// asse: con spacing forniti usa i passi reali (tasselli non uniformi),
// altrimenti celle di dimensione costante extent/n. Esportata: la superficie
// a fasce del viewer 3D (buildContourPlanSurface/buildContourSectionSurface
// in inxScene.js) la riusa per campionare con la stessa interpolazione della
// mappa 2D invece di duplicarne la logica.
export function axisCenters(spacing, n, extent) {
  const centers = new Float64Array(n);
  let cur = 0;
  for (let i = 0; i < n; i++) {
    const s = spacing ? spacing[i] : extent / n;
    centers[i] = cur + s / 2;
    cur += s;
  }
  return centers;
}

// Indice continuo (frazionario, clampato a [0, n-1]) del centro cella più
// vicino alla coordinata fisica x, per interpolazione bilineare tra celle.
function centerIndex(centers, n, x) {
  if (x <= centers[0]) return 0;
  if (x >= centers[n - 1]) return n - 1;
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (centers[mid] <= x) lo = mid; else hi = mid;
  }
  return lo + (x - centers[lo]) / (centers[hi] - centers[lo]);
}

// Indice continuo per ciascuno dei `target` campioni equispaziati lungo
// l'asse (centro pixel di output); flip=true inverte la direzione (asse Y:
// riga 0 dei dati a sud, ma l'alto del canvas è il nord — vedi sliceToImageData).
export function continuousIndex(centers, n, extent, target, flip) {
  const idx = new Float64Array(target);
  for (let p = 0; p < target; p++) {
    const raw = (p + 0.5) * (extent / target);
    idx[p] = centerIndex(centers, n, flip ? extent - raw : raw);
  }
  return idx;
}

// Valore bilineare ai 4 centri cella più vicini a (colF, rowF). Prima verifica
// la cella "proprietaria" del punto (il centro cella più vicino, quello di cui
// fa parte in modalità pixel): se è NaN il punto resta vuoto punto e basta,
// qualunque sia il valore dei vicini — altrimenti un ostacolo mascherato (es.
// un edificio, dove l'aria non viene calcolata) verrebbe "eroso" fin dentro
// la sua metà più vicina al bordo invece di restare vuoto per intero. Solo se
// la cella proprietaria ha dato, si media sui 4 angoli pesando solo quelli
// validi (i pesi dei mancanti si redistribuiscono sugli altri): così il
// colore resta liscio ed esteso fino al bordo esatto della cella vuota, senza
// l'alone di mezza cella che si aveva scartando il campione a ogni angolo NaN.
export function bilinearSample(data, w, h, colF, rowF) {
  const c0 = Math.floor(colF), r0 = Math.floor(rowF);
  const c1 = Math.min(c0 + 1, w - 1), r1 = Math.min(r0 + 1, h - 1);
  const fc = colF - c0, fr = rowF - r0;
  const ownCol = fc < 0.5 ? c0 : c1;
  const ownRow = fr < 0.5 ? r0 : r1;
  if (Number.isNaN(data[ownRow * w + ownCol])) return NaN;

  const v00 = data[r0 * w + c0], v10 = data[r0 * w + c1];
  const v01 = data[r1 * w + c0], v11 = data[r1 * w + c1];
  const w00 = (1 - fc) * (1 - fr), w10 = fc * (1 - fr);
  const w01 = (1 - fc) * fr, w11 = fc * fr;
  let sum = 0, wsum = 0;
  if (!Number.isNaN(v00)) { sum += v00 * w00; wsum += w00; }
  if (!Number.isNaN(v10)) { sum += v10 * w10; wsum += w10; }
  if (!Number.isNaN(v01)) { sum += v01 * w01; wsum += w01; }
  if (!Number.isNaN(v11)) { sum += v11 * w11; wsum += w11; }
  return wsum > 0 ? sum / wsum : NaN;
}

// Filled contour / mappa isaritmica: come sliceToImageData ma il valore è
// interpolato bilinearmente tra i centri cella (invece che a blocchi pieni
// per cella) e quantizzato in CONTOUR_BANDS fasce di colore piatto; i pixel
// al confine tra due fasce vengono scuriti per disegnare l'isolinea. Sempre
// ricampionato a risoluzione fissa (serve spazio per l'interpolazione anche
// su griglie piccole), indipendentemente da spacingX/spacingY.
export function sliceToContourImageData(data, w, h, min, max, lut, spacingX, spacingY, extentW, extentH, maxDim = 1024) {
  const extW = extentW || w;
  const extH = extentH || h;
  const MAX_DIM = maxDim;
  let targetW, targetH;
  if (extW > extH) {
    targetW = MAX_DIM;
    targetH = Math.max(1, Math.round(MAX_DIM * (extH / extW)));
  } else {
    targetH = MAX_DIM;
    targetW = Math.max(1, Math.round(MAX_DIM * (extW / extH)));
  }

  const centersX = axisCenters(spacingX, w, extW);
  const centersY = axisCenters(spacingY, h, extH);
  const colIdx = continuousIndex(centersX, w, extW, targetW, false);
  const rowIdx = continuousIndex(centersY, h, extH, targetH, true);

  const range = max - min || 1;
  const bandOf = new Int16Array(targetW * targetH).fill(-1);
  const img = new ImageData(targetW, targetH);
  const px = img.data;

  for (let py = 0; py < targetH; py++) {
    const rowF = rowIdx[py];
    for (let pxi = 0; pxi < targetW; pxi++) {
      const v = bilinearSample(data, w, h, colIdx[pxi], rowF);
      if (Number.isNaN(v)) continue;
      let t = (v - min) / range;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const band = Math.min(CONTOUR_BANDS - 1, Math.floor(t * CONTOUR_BANDS));
      const tBand = (band + 0.5) / CONTOUR_BANDS;
      const k = (tBand * (LUT_STEPS - 1)) | 0;
      const o = (py * targetW + pxi) * 4;
      bandOf[py * targetW + pxi] = band;
      px[o] = lut[k * 3];
      px[o + 1] = lut[k * 3 + 1];
      px[o + 2] = lut[k * 3 + 2];
      px[o + 3] = 255;
    }
  }

  // Isolinee: scurisce i pixel dove la fascia cambia rispetto al vicino a
  // destra/sotto. Scurire (invece di un tratto a tinta fissa, es. nero) resta
  // leggibile su qualunque palette, chiara o scura che sia.
  for (let py = 0; py < targetH; py++) {
    for (let pxi = 0; pxi < targetW; pxi++) {
      const i = py * targetW + pxi;
      const band = bandOf[i];
      if (band < 0) continue;
      const rightBand = pxi + 1 < targetW ? bandOf[i + 1] : band;
      const downBand = py + 1 < targetH ? bandOf[i + targetW] : band;
      if (rightBand !== band || downBand !== band) {
        const o = i * 4;
        px[o] *= 0.4; px[o + 1] *= 0.4; px[o + 2] *= 0.4;
      }
    }
  }

  return img;
}

// Legenda per la modalità contour: stessi CONTOUR_BANDS colori piatti usati
// da sliceToContourImageData (LUT campionata al centro fascia), disposti in
// una gradient CSS a stop doppi così le transizioni sono nette invece che
// sfumate — la legenda deve mostrare la stessa quantizzazione della mappa.
export function contourLegendGradient(colors, reversed) {
  const lut = buildLUT(colors, reversed);
  const stops = [];
  for (let band = 0; band < CONTOUR_BANDS; band++) {
    const tBand = (band + 0.5) / CONTOUR_BANDS;
    const k = (tBand * (LUT_STEPS - 1)) | 0;
    const rgb = `rgb(${lut[k * 3]},${lut[k * 3 + 1]},${lut[k * 3 + 2]})`;
    const p0 = (band / CONTOUR_BANDS) * 100;
    const p1 = ((band + 1) / CONTOUR_BANDS) * 100;
    stops.push(`${rgb} ${p0}%`, `${rgb} ${p1}%`);
  }
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

export function formatValue(value, span = 0) {
  if (!Number.isFinite(value)) return '–';
  const decimals = Math.abs(span || value) >= 100 ? 1 : 2;
  return value.toFixed(decimals);
}

// Genera una ImageData per l'overlay degli oggetti
export function objectsToImageData(data, w, h, spacingX, spacingY, extentW, extentH, opts = {}, maxDim = 1024) {
  const {
    opacity = 70,
    showBuildings = true,
    showTerrain = true,
    showVegetation = true,
    style1 = false,
    objectStyle = null,
  } = opts;
  const opF = opacity / 100;
  const activeStyle = objectStyle || (style1 ? 'style1' : 'default');

  // Riquadro di pixel di output occupato da ciascuna cella sorgente (indicizzato
  // per riga/colonna dati), popolato più sotto solo nel percorso ricampionato:
  // serve sia al contorno degli edifici sia ai cerchi della vegetazione.
  let colStart, colEnd, rowStart, rowEnd;

  const isBuildingAt = (r, c) => r >= 0 && r < h && c >= 0 && c < w && Math.round(data[r * w + c]) === 1;

  const paintBuildingDefault = (pxArr, o) => {
    pxArr[o] = 75; pxArr[o+1] = 85; pxArr[o+2] = 99; pxArr[o+3] = 230 * opF;
  };

  const paintBuilding = (pxArr, o, px, py, r, c) => {
    if (colStart == null || activeStyle === 'default') {
      // Stile di default: riempimento piatto grigio slate.
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

    if (activeStyle === 'style1') {
      // Stile 1: Contorno tecnico + retino a 45°
      if (isBorder) {
        pxArr[o] = 20; pxArr[o+1] = 20; pxArr[o+2] = 20; pxArr[o+3] = 255 * opF;
        return;
      }
      const cov = hatchCoverage(px, py);
      const gray = 255 - cov * (255 - 20);
      const alpha = (210 + cov * (220 - 210)) * opF;
      pxArr[o] = gray; pxArr[o+1] = gray; pxArr[o+2] = gray; pxArr[o+3] = alpha;
    } else if (activeStyle === 'style2' || activeStyle === 'style3') {
      // Stile 2 / Stile 3: Modello architettonico bianco con bordo definito
      if (isBorder) {
        // Bordo blu navy scuro per stile 3, ardesia per stile 2
        if (activeStyle === 'style3') {
          pxArr[o] = 27; pxArr[o+1] = 42; pxArr[o+2] = 74; pxArr[o+3] = 255 * opF;
        } else {
          pxArr[o] = 30; pxArr[o+1] = 41; pxArr[o+2] = 59; pxArr[o+3] = 255 * opF;
        }
      } else {
        pxArr[o] = 255; pxArr[o+1] = 255; pxArr[o+2] = 255; pxArr[o+3] = 240 * opF;
      }
    } else {
      paintBuildingDefault(pxArr, o);
    }
  };

  const assignPixel = (pxArr, o, v, px, py, r, c) => {
    const rv = Math.round(v);
    if (rv === 1 && showBuildings) {
      paintBuilding(pxArr, o, px, py, r, c);
    } else if (rv === 2 && showTerrain) {
      if (activeStyle === 'style2' || activeStyle === 'style3') {
        pxArr[o] = 255; pxArr[o+1] = 255; pxArr[o+2] = 255; pxArr[o+3] = 200 * opF;
      } else {
        pxArr[o] = 163; pxArr[o+1] = 113; pxArr[o+2] = 84; pxArr[o+3] = 180 * opF;
      }
    } else if (rv === 4) {
      pxArr[o] = 190; pxArr[o+1] = 40; pxArr[o+2] = 190; pxArr[o+3] = 200 * opF;
    } else if (rv >= 11 && rv <= 15 && showVegetation) {
      if (activeStyle === 'style2' || activeStyle === 'style3') {
        pxArr[o] = 255; pxArr[o+1] = 255; pxArr[o+2] = 255; pxArr[o+3] = 230 * opF;
      } else {
        const [rC, gC, bC] = hexToRgb(VEGETATION_COLORS[rv - 11]);
        pxArr[o] = rC; pxArr[o+1] = gC; pxArr[o+2] = bC; pxArr[o+3] = 200 * opF;
      }
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

  const MAX_DIM = maxDim;
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

  // Riquadro di pixel di output occupato da ciascuna cella
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

      if ((activeStyle === 'style1' || activeStyle === 'style2' || activeStyle === 'style3') && showVegetation) {
        const rv = Math.round(v);
        if (rv >= 11 && rv <= 15) {
          const cellW = colEnd[srcCol] - colStart[srcCol] + 1;
          const cellH = rowEnd[srcRow] - rowStart[srcRow] + 1;
          const centerX = colStart[srcCol] + cellW / 2;
          const centerY = rowStart[srcRow] + cellH / 2;
          const maxRadius = (Math.min(cellW, cellH) / 2);
          const radius = maxRadius * VEG_STYLE1_RADIUS_FRACTIONS[rv - 11];
          const dx = px + 0.5 - centerX;
          const dy = py + 0.5 - centerY;
          const distSq = dx * dx + dy * dy;

          if (distSq > radius * radius) pxArr[o + 3] = 0;
        }
      }
    }
  }
  return img;
}

