import { useEffect, useMemo, useRef, useState } from 'react';
import { buildLUT, sliceToImageData, orientColors, formatValue, objectsToImageData } from '../lib/colormap';

// Anteprima in miniatura di uno slice, usata nei riquadri di cambio vista.
// Mantiene le proporzioni fisiche: altezza fissa e larghezza proporzionale,
// ridotta (senza deformare) solo se non entra nel riquadro.
const THUMB_HEIGHT = 52;

export function MapThumb({ slice, objectsSlice, objectsOpts, colors, reversed, wind, min, max, showLegend, onLegendClick }) {
  const boxRef = useRef(null);
  const canvasRef = useRef(null);
  const objectsCanvasRef = useRef(null);
  const windCanvasRef = useRef(null);
  const [boxWidth, setBoxWidth] = useState(0);
  const lut = useMemo(() => buildLUT(colors, reversed), [colors, reversed]);

  const sliceMin = min ?? slice?.min;
  const sliceMax = max ?? slice?.max;

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setBoxWidth(entry.contentRect.width));
    observer.observe(boxRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!slice || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const imgData = sliceToImageData(slice.data, slice.w, slice.h, sliceMin, sliceMax, lut, slice.spacingX, slice.spacingY, slice.extentW, slice.extentH);
    canvas.width = imgData.width;
    canvas.height = imgData.height;
    canvas.getContext('2d').putImageData(imgData, 0, 0);
  }, [slice, sliceMin, sliceMax, lut]);

  useEffect(() => {
    if (!objectsSlice || !objectsCanvasRef.current) return;
    const canvas = objectsCanvasRef.current;
    const imgData = objectsToImageData(objectsSlice.data, objectsSlice.w, objectsSlice.h, objectsSlice.spacingX, objectsSlice.spacingY, objectsSlice.extentW, objectsSlice.extentH, objectsOpts);
    canvas.width = imgData.width;
    canvas.height = imgData.height;
    canvas.getContext('2d').putImageData(imgData, 0, 0);
  }, [objectsSlice, objectsOpts]);

  const ratio = slice ? slice.extentW / slice.extentH : 1;
  let cssW = THUMB_HEIGHT * ratio;
  let cssH = THUMB_HEIGHT;
  if (boxWidth && cssW > boxWidth) {
    cssW = boxWidth;
    cssH = boxWidth / ratio;
  }

  useEffect(() => {
    if (wind && windCanvasRef.current && boxWidth) {
      const frameSize = { w: cssW, h: cssH };
      renderWindOnCanvas(windCanvasRef.current, wind, frameSize);
    }
  }, [wind, boxWidth, cssW, cssH]);

  return (
    <span ref={boxRef} className="thumb-map" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <span style={{ position: 'relative', width: cssW, height: cssH, display: 'block' }}>
        {slice && <canvas ref={canvasRef} className="thumb-canvas" style={{ width: cssW, height: cssH, display: 'block' }} />}
        {objectsSlice && <canvas ref={objectsCanvasRef} className="thumb-objects-canvas" style={{ width: cssW, height: cssH, position: 'absolute', top: 0, left: 0, pointerEvents: 'none', imageRendering: 'pixelated' }} />}
        {wind && <canvas ref={windCanvasRef} className="thumb-wind-canvas" style={{ width: cssW, height: cssH, position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />}
      </span>
      {showLegend && slice && (
        <span className="thumb-legend" onClick={onLegendClick} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px', width: '100%', padding: '0 4px 4px 4px', boxSizing: 'border-box' }}>
          <span style={{ color: 'var(--text-faint)' }}>{formatValue(sliceMin, sliceMax - sliceMin)}</span>
          <span style={{ flex: 1, height: '4px', background: `linear-gradient(90deg, ${orientColors(colors, reversed).join(',')})`, borderRadius: '2px' }} />
          <span style={{ color: 'var(--text-faint)' }}>{formatValue(sliceMax, sliceMax - sliceMin)}</span>
        </span>
      )}
    </span>
  );
}

/* ---------- campo di vento a frecce ---------- */

// Arrotonda per eccesso a un valore "tondo" 1/2/5 × 10^k: è il valore di
// riferimento della legenda del vento (nessuna freccia lo supera).
export function niceCeil(value) {
  if (!(value > 0)) return 0;
  const exp = Math.floor(Math.log10(value));
  const base = value / 10 ** exp;
  const nice = base <= 1 ? 1 : base <= 2 ? 2 : base <= 5 ? 5 : 10;
  return nice * 10 ** exp;
}

// Passo di campionamento della griglia e lunghezza (px CSS) della freccia di
// riferimento; usato sia dal disegno sia dalla legenda, così coincidono sempre.
function windLayout(field, frameSize, density, size, isThumb) {
  const across = isThumb ? 10 + (density / 100) * 15 : 10 + (density / 100) * 35; // frecce lungo l'asse maggiore
  const step = Math.max(1, Math.round(Math.max(field.w, field.h) / across));
  const cell = Math.min(frameSize.w / field.w, frameSize.h / field.h);
  const minLen = isThumb ? 2 : 6;
  const maxLen = Math.max(minLen, step * cell * (0.4 + 1.2 * (size / 100)));
  return { step, maxLen };
}

// Spessore massimo delle streamline (px) in funzione dello slider "dimensione"
const streamWidth = (size) => 0.6 + 3 * (size / 100);

// Interpolazione bilineare delle componenti del vento nel punto (x, y) in
// coordinate di griglia (centri cella sugli interi); null su celle senza dati.
function sampleField(field, x, y) {
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
function traceStreamlines(field, sep, refValue) {
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

export function renderWindOnCanvas(canvas, wind, frameSize) {
  if (!canvas || !wind || !frameSize || !(wind.refValue > 0)) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(frameSize.w * dpr);
  canvas.height = Math.round(frameSize.h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const { field, refValue, opacity, size, density, style, isThumb } = wind;
  const { step, maxLen } = windLayout(field, frameSize, density, size, isThumb);
  const alpha = Math.min(1, Math.max(0, opacity / 100));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // riga 0 dei dati in basso sul canvas; v positiva verso l'alto
  const centerX = new Float64Array(field.w);
  let curX = 0;
  for (let i = 0; i < field.w; i++) {
    centerX[i] = curX + (field.spacingX ? field.spacingX[i] : 1) * 0.5;
    curX += (field.spacingX ? field.spacingX[i] : 1);
  }
  const centerY = new Float64Array(field.h);
  let curY = 0;
  for (let i = 0; i < field.h; i++) {
    centerY[i] = curY + (field.spacingY ? field.spacingY[i] : 1) * 0.5;
    curY += (field.spacingY ? field.spacingY[i] : 1);
  }
  const extW = field.spacingX ? field.extentW : field.w;
  const extH = field.spacingY ? field.extentH : field.h;

  const toPx = (x) => {
    const i = Math.floor(x);
    const f = x - i;
    const cx = (i >= 0 && i < field.w - 1) ? centerX[i] * (1 - f) + centerX[i + 1] * f : centerX[Math.max(0, Math.min(i, field.w - 1))];
    return (cx / extW) * frameSize.w;
  };
  const toPy = (y) => {
    const i = Math.floor(y);
    const f = y - i;
    const cy = (i >= 0 && i < field.h - 1) ? centerY[i] * (1 - f) + centerY[i + 1] * f : centerY[Math.max(0, Math.min(i, field.h - 1))];
    return (1 - cy / extH) * frameSize.h;
  };

  if (style === 'streamlines') {
    const BUCKETS = 6;
    const wMin = 0.3;
    const wMax = streamWidth(size);
    const paths = Array.from({ length: BUCKETS }, () => new Path2D());
    for (const line of traceStreamlines(field, step, refValue)) {
      for (let p = 1; p < line.length; p++) {
        const speed = (line[p - 1][2] + line[p][2]) / 2;
        const t = Math.min(1, speed / refValue);
        const q = Math.min(BUCKETS - 1, Math.floor(t * BUCKETS));
        paths[q].moveTo(toPx(line[p - 1][0]), toPy(line[p - 1][1]));
        paths[q].lineTo(toPx(line[p][0]), toPy(line[p][1]));
      }
    }
    const passes = [
      { color: `rgba(255,255,255,${alpha * 0.6})`, extra: 1.4 },
      { color: `rgba(15,23,42,${alpha})`, extra: 0 },
    ];
    for (const pass of passes) {
      ctx.strokeStyle = pass.color;
      for (let q = 0; q < BUCKETS; q++) {
        ctx.lineWidth = wMin + ((q + 0.5) / BUCKETS) * (wMax - wMin) + pass.extra;
        ctx.stroke(paths[q]);
      }
    }
    return;
  }

  const scale = maxLen / refValue;
  const start = Math.floor(step / 2);
  const passes = [
    { style: `rgba(255,255,255,${alpha * 0.85})`, width: 3 },
    { style: `rgba(15,23,42,${alpha})`, width: 1.4 },
  ];
  for (const pass of passes) {
    ctx.strokeStyle = pass.style;
    ctx.lineWidth = pass.width;
    for (let gy = start; gy < field.h; gy += step) {
      for (let gx = start; gx < field.w; gx += step) {
        const i = gy * field.w + gx;
        const u = field.u[i];
        const v = field.v[i];
        if (!Number.isFinite(u) || !Number.isFinite(v)) continue;
        const len = Math.hypot(u, v) * scale;
        if (len < (isThumb ? 0.5 : 1.5)) continue;
        drawArrow(ctx, toPx(gx), toPy(gy), Math.atan2(-v, u), len, isThumb);
      }
    }
  }
}

function drawArrow(ctx, x, y, angle, len, isThumb) {
  const head = Math.min(6, Math.max(isThumb ? 1.5 : 3, len * 0.35));
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(-len / 2, 0);
  ctx.lineTo(len / 2, 0);
  ctx.moveTo(len / 2 - head, -head * 0.45);
  ctx.lineTo(len / 2, 0);
  ctx.lineTo(len / 2 - head, head * 0.45);
  ctx.stroke();
  ctx.restore();
}

// Freccia del nord per le piante: north è modelRotation dell'INX, positivo in
// senso antiorario (0 = nord in alto, +5° = nord verso nord-ovest), quindi la
// rotazione CSS (oraria) va negata.
function NorthArrow({ rotation }) {
  return (
    <span className="map-north">
      <svg viewBox="0 0 24 24" style={{ transform: `rotate(${-rotation}deg)` }} fill="currentColor">
        <text x="12" y="9.5" textAnchor="middle" fill="currentColor">N</text>
        <path d="M12 11.5 L15.4 21 L12 18.4 L8.6 21 Z" fill="currentColor" />
      </svg>
    </span>
  );
}

function MapCalendar({ timeLabel }) {
  if (!timeLabel) return null;
  const parts = timeLabel.split(' · ');
  const dateStr = parts[0];
  const dateParts = dateStr.split('-');
  const day = dateParts.length === 3 ? dateParts[2] : '';
  let weekday = '';
  if (dateParts.length === 3) {
      const d = new Date(dateParts[0], parseInt(dateParts[1], 10) - 1, dateParts[2]);
      const wdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      weekday = wdays[d.getDay()];
  }
  return (
    <span className="map-calendar">
      <span className="map-calendar-dayname">{weekday || '-'}</span>
      <span className="map-calendar-day">{day || '-'}</span>
    </span>
  );
}

function MapClock({ timeLabel, withCalendar }) {
  if (!timeLabel) return null;
  const parts = timeLabel.split(' · ');
  const timeStr = parts.length > 1 ? parts[1] : '--:--';
  return (
    <span className={`map-clock ${withCalendar ? 'with-calendar' : ''}`}>
       <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
       </svg>
       <span className="map-clock-time">{timeStr}</span>
    </span>
  );
}

function SectionCompass({ type, rotation, sectionAngle = 0 }) {
  if (rotation == null) return null;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  
  const baseAzimuth = type === 'sectionX' ? rotation : (rotation + 90);
  const rightAzimuth = baseAzimuth - sectionAngle;
  const leftAzimuth = rightAzimuth + 180;
  
  const leftStr = dirs[Math.round(((leftAzimuth % 360 + 360) % 360) / 45) % 8];
  const rightStr = dirs[Math.round(((rightAzimuth % 360 + 360) % 360) / 45) % 8];

  return (
    <span className="map-section-compass">
      <span>{leftStr}</span>
      <svg width="24" height="12" viewBox="0 0 24 12" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 6 L20 6 M7 3 L4 6 L7 9 M17 3 L20 6 L17 9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{rightStr}</span>
    </span>
  );
}

// Geometria (in px CSS della cornice) della croce di sezioni in pianta:
// centro sul perno e versori a schermo delle due tracce 'v' (sezione X, a 0°
// verticale) e 'h' (sezione Y, a 0° orizzontale). L'angolo è in coordinate di
// griglia (antiorario, y in alto): il passaggio ai px tiene conto del
// ribaltamento della y e di eventuali celle non quadrate a schermo.
function crossGeometry(control, slice, W, H) {
  const rad = (control.angle * Math.PI) / 180;
  let cx, cy;
  if (slice.spacingX && slice.spacingY) {
    let sumX = 0;
    for (let i = 0; i < control.x; i++) sumX += slice.spacingX[i];
    cx = ((sumX + slice.spacingX[control.x] * 0.5) / slice.extentW) * W;

    let sumY = 0;
    for (let i = 0; i < control.y; i++) sumY += slice.spacingY[i];
    const physY = sumY + slice.spacingY[control.y] * 0.5;
    cy = (1 - physY / slice.extentH) * H;
  } else {
    cx = ((control.x + 0.5) / slice.w) * W;
    cy = ((slice.h - 1 - control.y + 0.5) / slice.h) * H;
  }
  const dirs = {};
  for (const which of ['v', 'h']) {
    const gx = which === 'v' ? -Math.sin(rad) : Math.cos(rad);
    const gy = which === 'v' ? Math.cos(rad) : Math.sin(rad);
    const sx = gx * (W / slice.w);
    const sy = -gy * (H / slice.h);
    const len = Math.hypot(sx, sy) || 1;
    dirs[which] = [sx / len, sy / len];
  }
  return { cx, cy, dirs };
}

// Mappa raster: il canvas ha la risoluzione della griglia ENVI-met e viene
// ingrandito via CSS (image-rendering: pixelated), come le celle di Leonardo.
export default function MapChart({ slice, objectsSlice, objectsOpts, colors, reversed, min, max, onCellClick, marks, sectionControl, sectionLineStyle, compass, showCalendar, showClock, timeLabel, wind, onLegendClick }) {
  const canvasRef = useRef(null);
  const objectsCanvasRef = useRef(null);
  const frameRef = useRef(null);
  const windCanvasRef = useRef(null);
  const [hover, setHover] = useState(null);
  const [frameSize, setFrameSize] = useState(null);
  // maniglia di rotazione delle sezioni (solo pianta): appare vicino alle linee
  const [rotHandle, setRotHandle] = useState(null); // { which: 'v'|'h', x, y }
  const [rotDragging, setRotDragging] = useState(false);
  const lut = useMemo(() => buildLUT(colors, reversed), [colors, reversed]);
  const hasSlice = !!slice;

  useEffect(() => {
    if (!slice || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const imgData = sliceToImageData(slice.data, slice.w, slice.h, min, max, lut, slice.spacingX, slice.spacingY, slice.extentW, slice.extentH);
    canvas.width = imgData.width;
    canvas.height = imgData.height;
    canvas.getContext('2d').putImageData(imgData, 0, 0);
  }, [slice, min, max, lut]);

  useEffect(() => {
    if (!objectsSlice || !objectsCanvasRef.current) return;
    const canvas = objectsCanvasRef.current;
    const imgData = objectsToImageData(objectsSlice.data, objectsSlice.w, objectsSlice.h, objectsSlice.spacingX, objectsSlice.spacingY, objectsSlice.extentW, objectsSlice.extentH, objectsOpts);
    canvas.width = imgData.width;
    canvas.height = imgData.height;
    canvas.getContext('2d').putImageData(imgData, 0, 0);
  }, [objectsSlice, objectsOpts]);

  // Dimensione in px CSS della cornice mappa: serve al canvas del vento, che
  // (a differenza della mappa raster) disegna alla risoluzione dello schermo
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setFrameSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasSlice]);

  // Frecce del vento: campionate a passo costante, orientate con atan2 e
  // scalate sul valore di riferimento della legenda. Doppio tratto (alone
  // chiaro + freccia scura) per restare leggibili su qualsiasi palette.
  useEffect(() => {
    if (windCanvasRef.current && wind && frameSize) {
      renderWindOnCanvas(windCanvasRef.current, wind, frameSize);
    }
  }, [wind, frameSize]);

  if (!slice) return null;
  const span = max - min;

  // Dalla posizione del mouse alla cella di griglia: la riga è ribaltata
  // perché in ENVI-met la y cresce verso l'alto, sul canvas verso il basso
  const cellFromEvent = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width;
    const fy = (e.clientY - rect.top) / rect.height;
    
    let col = 0;
    if (slice.spacingX) {
      const physX = fx * slice.extentW;
      let currX = 0;
      for (let i = 0; i < slice.w; i++) {
        currX += slice.spacingX[i];
        if (physX <= currX || i === slice.w - 1) { col = i; break; }
      }
    } else {
      col = Math.min(slice.w - 1, Math.max(0, Math.floor(fx * slice.w)));
    }
    
    let rowCanvas = 0;
    if (slice.spacingY) {
      const physY = fy * slice.extentH;
      let currY = 0;
      for (let i = 0; i < slice.h; i++) {
        currY += slice.spacingY[slice.h - 1 - i];
        if (physY <= currY || i === slice.h - 1) { rowCanvas = i; break; }
      }
    } else {
      rowCanvas = Math.min(slice.h - 1, Math.max(0, Math.floor(fy * slice.h)));
    }
    const row = slice.h - 1 - rowCanvas;

    return { col, row, px: e.clientX - rect.left, py: e.clientY - rect.top, rect };
  };

  const handleMove = (e) => {
    const { col, row, px, py, rect } = cellFromEvent(e);
    const value = slice.data[row * slice.w + col];
    setHover({
      px,
      py,
      // vicino al bordo destro il tooltip si ribalta a sinistra del cursore
      flip: px > rect.width * 0.6,
      text: `${col}, ${row} · ${Number.isNaN(value) ? '–' : formatValue(value, span)}`,
    });
  };

  const handleClick = (e) => {
    if (!onCellClick) return;
    const { col, row } = cellFromEvent(e);
    onCellClick(col, row);
  };

  /* ---------- rotazione delle sezioni dalla pianta ---------- */

  // Avvicinandosi a una delle due linee di sezione la maniglia compare sulla
  // proiezione del cursore sulla linea; vicino al perno resta nascosta (lì il
  // click sposta l'incrocio e una rotazione sarebbe mal definita).
  const handleFrameMove = (e) => {
    if (!sectionControl || rotDragging) return;
    const rect = frameRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const { cx, cy, dirs } = crossGeometry(sectionControl, slice, rect.width, rect.height);
    let best = null;
    if (Math.hypot(mx - cx, my - cy) > 18) {
      for (const which of ['v', 'h']) {
        const [ux, uy] = dirs[which];
        const dist = Math.abs((mx - cx) * uy - (my - cy) * ux);
        if (dist < 9 && (!best || dist < best.dist)) {
          const t = (mx - cx) * ux + (my - cy) * uy;
          best = { which, dist, x: cx + ux * t, y: cy + uy * t };
        }
      }
    }
    setRotHandle(
      best
        ? {
            which: best.which,
            x: Math.min(rect.width - 8, Math.max(8, best.x)),
            y: Math.min(rect.height - 8, Math.max(8, best.y)),
          }
        : null,
    );
  };

  const rotDragTo = (e) => {
    if (!rotDragging || !rotHandle || !sectionControl) return;
    const rect = frameRef.current.getBoundingClientRect();
    let gx, gy;
    if (slice.spacingX && slice.spacingY) {
      const physX = ((e.clientX - rect.left) / rect.width) * slice.extentW;
      let currX = 0; gx = 0;
      for (let i = 0; i < slice.w; i++) {
        currX += slice.spacingX[i];
        if (physX <= currX || i === slice.w - 1) { gx = i + (physX - (currX - slice.spacingX[i])) / slice.spacingX[i] - 0.5; break; }
      }
      const physY = ((rect.bottom - e.clientY) / rect.height) * slice.extentH;
      let currY = 0; gy = 0;
      for (let i = 0; i < slice.h; i++) {
        currY += slice.spacingY[i];
        if (physY <= currY || i === slice.h - 1) { gy = i + (physY - (currY - slice.spacingY[i])) / slice.spacingY[i] - 0.5; break; }
      }
    } else {
      gx = ((e.clientX - rect.left) / rect.width) * slice.w - 0.5;
      gy = ((rect.bottom - e.clientY) / rect.height) * slice.h - 0.5;
    }
    const vx = gx - sectionControl.x;
    const vy = gy - sectionControl.y;
    if (Math.hypot(vx, vy) < 0.75) return; // troppo vicino al perno: angolo instabile
    let deg = (rotHandle.which === 'v' ? Math.atan2(-vx, vy) : Math.atan2(vy, vx)) * (180 / Math.PI);
    while (deg > 90) deg -= 180;
    while (deg <= -90) deg += 180;
    deg = Math.round(deg);
    if (Math.abs(deg) < 3) deg = 0; // snap: tornare all'ortogonale è facile
    if (deg === -90) deg = 90;
    sectionControl.onRotate(deg);
    setRotHandle((h) =>
      h && {
        ...h,
        x: Math.min(rect.width - 8, Math.max(8, e.clientX - rect.left)),
        y: Math.min(rect.height - 8, Math.max(8, e.clientY - rect.top)),
      },
    );
  };

  // Legenda del vento. Frecce: una freccia lunga quanto quella di riferimento
  // sul canvas (stesso windLayout) col valore che rappresenta. Streamline: un
  // cuneo da 0 allo spessore massimo, che sulle linee corrisponde a refValue.
  const windLegend =
    wind && frameSize && wind.refValue > 0
      ? {
          style: wind.style,
          len: windLayout(wind.field, frameSize, wind.density, wind.size).maxLen,
          width: streamWidth(wind.size),
          value: wind.refValue,
        }
      : null;

  // Croce di sezioni in pianta: linee SVG (possono essere oblique) al posto
  // degli span ortogonali usati dalle sezioni.
  const cross = sectionControl && frameSize ? crossGeometry(sectionControl, slice, frameSize.w, frameSize.h) : null;
  const crossLen = frameSize ? frameSize.w + frameSize.h : 0;

  const getMarkPctX = (col) => {
    if (!slice.spacingX) return ((col + 0.5) / slice.w) * 100;
    let sum = 0;
    for (let i = 0; i < col; i++) sum += slice.spacingX[i];
    return ((sum + slice.spacingX[col] * 0.5) / slice.extentW) * 100;
  };
  const getMarkPctY = (row) => {
    if (!slice.spacingY) return ((slice.h - 1 - row + 0.5) / slice.h) * 100;
    let sum = 0;
    for (let i = 0; i < row; i++) sum += slice.spacingY[i];
    return (1 - (sum + slice.spacingY[row] * 0.5) / slice.extentH) * 100;
  };

  // Linea del livello come profilo a gradini: un segmento orizzontale al centro
  // di ogni cella davvero campionata; con profilo costante coincide con la retta
  const profilePoints = (profile) => {
    const pts = [];
    let sum = 0;
    for (let i = 0; i < profile.length; i++) {
      const x0 = (sum / slice.extentW) * 100;
      sum += slice.spacingX ? slice.spacingX[i] : slice.extentW / slice.w;
      const x1 = (sum / slice.extentW) * 100;
      const y = getMarkPctY(profile[i]);
      pts.push(`${x0},${y} ${x1},${y}`);
    }
    return pts.join(' ');
  };

  return (
    <div className="map-body">
      <div
        className="map-frame"
        ref={frameRef}
        style={{
          aspectRatio: `${slice.extentW} / ${slice.extentH}`,
          '--section-line-width': `${sectionLineStyle?.width ?? 1}px`,
          '--section-line-dash': `4 ${sectionLineStyle?.gap ?? 3}`,
          ...(sectionLineStyle?.color ? { '--section-line-color': sectionLineStyle.color } : {}),
        }}
        onMouseMove={sectionControl ? handleFrameMove : undefined}
        onMouseLeave={sectionControl ? () => { if (!rotDragging) setRotHandle(null); } : undefined}
      >
        <canvas ref={canvasRef} className="map-canvas" onMouseMove={handleMove} onMouseLeave={() => setHover(null)} onClick={handleClick} />
        {objectsSlice && <canvas ref={objectsCanvasRef} className="map-objects-canvas" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', imageRendering: 'pixelated' }} />}
        {wind && <canvas ref={windCanvasRef} className="map-wind-canvas" />}
        {!sectionControl && marks?.x != null && marks.x >= 0 && marks.x < slice.w && (
          <svg className="map-mark-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line x1={getMarkPctX(marks.x)} y1={0} x2={getMarkPctX(marks.x)} y2={100} vectorEffect="non-scaling-stroke" />
          </svg>
        )}
        {!sectionControl && marks?.y != null && marks.y >= 0 && marks.y < slice.h && (
          marks.profile ? (
            <svg className="map-mark-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline points={profilePoints(marks.profile)} vectorEffect="non-scaling-stroke" />
            </svg>
          ) : (
            <svg className="map-mark-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line x1={0} y1={getMarkPctY(marks.y)} x2={100} y2={getMarkPctY(marks.y)} vectorEffect="non-scaling-stroke" />
            </svg>
          )
        )}
        {cross && (
          <svg className="map-section-svg" width={frameSize.w} height={frameSize.h} opacity="0.6">
            {['v', 'h'].map((which) => {
              const [ux, uy] = cross.dirs[which];
              return (
                <line
                  key={which}
                  x1={cross.cx - ux * crossLen}
                  y1={cross.cy - uy * crossLen}
                  x2={cross.cx + ux * crossLen}
                  y2={cross.cy + uy * crossLen}
                />
              );
            })}
          </svg>
        )}
        {sectionControl && rotHandle && (
          <div
            className="map-rot-handle"
            style={{ left: rotHandle.x, top: rotHandle.y }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              setRotDragging(true);
            }}
            onPointerMove={rotDragTo}
            onPointerUp={() => setRotDragging(false)}
            onPointerCancel={() => setRotDragging(false)}
            onClick={(e) => e.stopPropagation()}
          >
            <svg viewBox="0 0 24 24">
              <path d="M19.5 12a7.5 7.5 0 1 1-2.4-5.5" />
              <path d="M17.5 2.8l-.3 4.1 4.1.3" />
            </svg>
          </div>
        )}
        {sectionControl && sectionControl.angle !== 0 && (
          <button type="button" className="map-angle-chip" title={sectionControl.resetTitle} onClick={sectionControl.onReset}>
            <svg viewBox="0 0 24 24">
              <path d="M6.5 12a5.5 5.5 0 1 0 1.7-4" />
              <path d="M8.5 3.5l-.4 4.6 4.6.4" />
            </svg>
            {Math.round(sectionControl.angle)}°
          </button>
        )}
        {compass != null && compass.type === 'plan' && <NorthArrow rotation={compass.rotation} />}
        {compass != null && compass.type !== 'plan' && <SectionCompass type={compass.type} rotation={compass.rotation} sectionAngle={compass.sectionAngle} />}
        {showCalendar && <MapCalendar timeLabel={timeLabel} />}
        {showClock && <MapClock timeLabel={timeLabel} withCalendar={showCalendar} />}
        {hover && (
          <div
            className="map-tooltip"
            style={{
              left: hover.px,
              top: hover.py,
              transform: hover.flip ? 'translate(calc(-100% - 14px), -26px)' : 'translate(14px, -26px)',
            }}
          >
            {hover.text}
          </div>
        )}
      </div>
      <div className="map-legend" onClick={onLegendClick}>
        <span className="map-legend-label">{formatValue(min, span)}</span>
        <span
          className="map-legend-bar"
          style={{ background: `linear-gradient(90deg, ${orientColors(colors, reversed).join(',')})` }}
        />
        <span className="map-legend-label">{formatValue(max, span)}</span>
      </div>
      {windLegend && windLegend.style === 'streamlines' && (
        <div className="map-wind-legend">
          <span className="map-legend-label">0</span>
          <svg width="46" height="10" fill="currentColor" stroke="none">
            <path
              className="wind-wedge"
              d={`M1 ${5 - 0.2} L45 ${5 - windLegend.width / 2} L45 ${5 + windLegend.width / 2} L1 ${5 + 0.2} Z`}
            />
          </svg>
          <span className="map-legend-label">{String(windLegend.value)} m/s</span>
        </div>
      )}
      {windLegend && windLegend.style !== 'streamlines' && (
        <div className="map-wind-legend">
          <svg width={Math.ceil(windLegend.len) + 2} height="10" stroke="currentColor" fill="none" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="1" y1="5" x2={windLegend.len} y2="5" />
            <path d={`M${windLegend.len - 4} 2.5 L${windLegend.len} 5 L${windLegend.len - 4} 7.5`} />
          </svg>
          <span className="map-legend-label">= {String(windLegend.value)} m/s</span>
        </div>
      )}
    </div>
  );
}
