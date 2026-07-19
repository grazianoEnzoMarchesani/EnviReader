import { useEffect, useMemo, useRef, useState } from 'react';
import { formatValue } from '../lib/colormap';

// Grafico canvas per le serie meteo del forcing (fino a 8760 punti orari).
// Quando i punti superano i pixel disponibili disegna l'inviluppo min–max per
// colonna; da vicino torna una polilinea. kind: 'line' | 'dots' | 'area'.
// Con brush attivo il trascinamento seleziona l'intervallo (onBrush), il
// doppio click lo azzera.
const M = { top: 12, right: 14, bottom: 24, left: 52 };

function niceTicks(min, max, count = 4) {
  const span = max - min || 1;
  const mag = 10 ** Math.floor(Math.log10(span / count));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) || 10 * mag;
  const ticks = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-6; v += step) ticks.push(v);
  return ticks;
}

// "2018-03-21 · 14:00" → etichetta asse breve (data, oppure ora se il range è corto)
function tickLabel(label, shortRange) {
  const [date, time] = String(label).split(' · ');
  if (!time) return date ?? '';
  if (shortRange) return time;
  const [, m, d] = date.split('-');
  return `${d}/${m}`;
}

export default function ForcingChart({
  series,
  labels,
  range = null, // [i0, i1] inclusivo; null = tutto
  height = 190,
  unit = '',
  theme,
  yDomain = null, // es. [0, 360] per la direzione del vento
  yTickStep = null,
  brush = false,
  onBrush,
  mark = null, // [i0, i1] evidenziato nell'overview (periodo simulazione)
}) {
  const boxRef = useRef(null);
  const canvasRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState(null);
  const [drag, setDrag] = useState(null); // { x0, x1 } in px durante il brush

  const n = labels.length;
  const [i0, i1] = range && !brush ? range : [0, n - 1];
  const count = Math.max(1, i1 - i0 + 1);
  const innerW = Math.max(0, width - M.left - M.right);
  const innerH = height - M.top - M.bottom;

  // dominio y sui soli punti visibili (o fisso, es. gradi bussola)
  const domain = useMemo(() => {
    if (yDomain) return yDomain;
    let min = Infinity;
    let max = -Infinity;
    for (const s of series) {
      for (let i = i0; i <= i1; i++) {
        const v = s.values[i];
        if (Number.isNaN(v)) continue;
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    if (min === Infinity) return [0, 1];
    if (series.some((s) => s.kind === 'area') && min > 0) min = 0;
    const pad = (max - min || Math.abs(max) || 1) * 0.08;
    return [min - (min === 0 ? 0 : pad), max + pad];
  }, [series, i0, i1, yDomain]);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(boxRef.current);
    return () => observer.disconnect();
  }, []);

  const xAt = (i) => M.left + (count > 1 ? ((i - i0) / (count - 1)) * innerW : innerW / 2);
  const yAt = (v) => M.top + (1 - (v - domain[0]) / (domain[1] - domain[0])) * innerH;
  const indexAt = (px) => {
    const frac = (px - M.left) / (innerW || 1);
    return Math.min(i1, Math.max(i0, Math.round(i0 + frac * (count - 1))));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0) return;
    // il disegno avviene in un rAF: al cambio tema l'attributo data-theme sul
    // <html> è aggiornato da un effect del provider (che gira DOPO questo),
    // quindi i token CSS vanno letti al frame successivo
    const raf = requestAnimationFrame(() => draw(canvas));
    return () => cancelAnimationFrame(raf);

    function draw(canvas) {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      const css = getComputedStyle(canvas);
      const ink = (name) => css.getPropertyValue(name).trim();
      ctx.clearRect(0, 0, width, height);
      ctx.font = `10.5px ${ink('--mono') || 'monospace'}`;

      // griglia e assi
      const yTicks = yTickStep
        ? niceTicks(domain[0], domain[1], Math.round((domain[1] - domain[0]) / yTickStep))
        : niceTicks(domain[0], domain[1]);
      ctx.strokeStyle = ink('--border');
      ctx.fillStyle = ink('--text-secondary');
      ctx.lineWidth = 1;
      for (const v of yTicks) {
        const y = Math.round(yAt(v)) + 0.5;
        if (y < M.top - 1 || y > M.top + innerH + 1) continue;
        ctx.beginPath();
        ctx.moveTo(M.left, y);
        ctx.lineTo(M.left + innerW, y);
        ctx.stroke();
        ctx.textAlign = 'right';
        ctx.fillText(formatValue(v, domain[1] - domain[0]), M.left - 7, y + 3.5);
      }
      const shortRange = count <= 72; // fino a 3 giorni: etichette con l'ora
      const xTickCount = Math.max(2, Math.floor(innerW / 96));
      const xStep = Math.max(1, Math.ceil(count / xTickCount));
      ctx.textAlign = 'center';
      for (let i = i0; i <= i1; i += xStep) {
        ctx.fillText(tickLabel(labels[i], shortRange), xAt(i), height - 8);
      }

      // serie
      for (const s of series) {
        const color = s.color.startsWith('--') ? ink(s.color) : s.color;
        const perPx = count / (innerW || 1);
        ctx.fillStyle = color;
        ctx.strokeStyle = color;

        if (s.kind === 'dots') {
          for (let i = i0; i <= i1; i++) {
            const v = s.values[i];
            if (Number.isNaN(v)) continue;
            ctx.fillRect(xAt(i) - 1, yAt(v) - 1, 2, 2);
          }
          continue;
        }

        if (perPx > 2) {
          // denso: inviluppo min–max per colonna di pixel
          const y0 = yAt(Math.max(0, domain[0]));
          for (let px = 0; px < innerW; px++) {
            const from = i0 + Math.floor(px * perPx);
            const to = Math.min(i1, i0 + Math.floor((px + 1) * perPx));
            let lo = Infinity;
            let hi = -Infinity;
            for (let i = from; i <= to; i++) {
              const v = s.values[i];
              if (Number.isNaN(v)) continue;
              if (v < lo) lo = v;
              if (v > hi) hi = v;
            }
            if (lo === Infinity) continue;
            const x = M.left + px;
            if (s.kind === 'area') ctx.fillRect(x, yAt(hi), 1, Math.max(1, y0 - yAt(hi)));
            else ctx.fillRect(x, yAt(hi), 1, Math.max(1, yAt(lo) - yAt(hi)));
          }
        } else {
          ctx.lineWidth = 2;
          ctx.lineJoin = 'round';
          ctx.beginPath();
          let pen = false;
          for (let i = i0; i <= i1; i++) {
            const v = s.values[i];
            if (Number.isNaN(v)) {
              pen = false;
              continue;
            }
            if (pen) ctx.lineTo(xAt(i), yAt(v));
            else ctx.moveTo(xAt(i), yAt(v));
            pen = true;
          }
          ctx.stroke();
          if (s.kind === 'area') {
            ctx.globalAlpha = 0.18;
            ctx.lineTo(xAt(i1), yAt(Math.max(0, domain[0])));
            ctx.lineTo(xAt(i0), yAt(Math.max(0, domain[0])));
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        }
      }
    }
  }, [width, height, series, labels, i0, i1, domain, theme, yTickStep]);

  /* ---------- interazione ---------- */

  const pointerPx = (e) => e.clientX - e.currentTarget.getBoundingClientRect().left;

  const handleMove = (e) => {
    const px = pointerPx(e);
    if (drag) setDrag((d) => ({ ...d, x1: px }));
    setHover(px >= M.left && px <= M.left + innerW ? indexAt(px) : null);
  };

  const handleDown = (e) => {
    if (!brush) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const px = pointerPx(e);
    setDrag({ x0: px, x1: px });
  };

  const handleUp = () => {
    if (!drag) return;
    const [a, b] = [drag.x0, drag.x1].sort((x, y) => x - y);
    setDrag(null);
    if (b - a > 4) onBrush?.([indexAt(a), indexAt(b)].sort((x, y) => x - y));
  };

  const clampX = (px) => Math.min(M.left + innerW, Math.max(M.left, px));

  return (
    <div ref={boxRef} className="fc-chart">
      {width > 0 && (
        <canvas
          ref={canvasRef}
          style={{ width, height, cursor: brush ? 'ew-resize' : 'crosshair' }}
          onPointerMove={handleMove}
          onPointerLeave={() => { setHover(null); setDrag(null); }}
          onPointerDown={handleDown}
          onPointerUp={handleUp}
          onDoubleClick={() => brush && onBrush?.(null)}
        />
      )}

      {/* selezione attiva e periodo simulazione, solo nell'overview */}
      {brush && range && (
        <div
          className="fc-range"
          style={{ left: xAt(Math.max(i0, range[0])), width: Math.max(2, xAt(Math.min(i1, range[1])) - xAt(Math.max(i0, range[0]))), top: M.top, height: innerH }}
        />
      )}
      {brush && mark && (
        <div
          className="fc-mark"
          style={{ left: xAt(mark[0]), width: Math.max(2, xAt(mark[1]) - xAt(mark[0])), top: M.top, height: innerH }}
        />
      )}
      {drag && (
        <div
          className="fc-drag"
          style={{ left: Math.min(clampX(drag.x0), clampX(drag.x1)), width: Math.abs(clampX(drag.x1) - clampX(drag.x0)), top: M.top, height: innerH }}
        />
      )}

      {hover != null && !drag && (
        <>
          <div className="fc-crosshair" style={{ left: xAt(hover), top: M.top, height: innerH }} />
          <div
            className="ts-tooltip"
            style={{ left: xAt(hover), top: M.top + 4, transform: hover - i0 > count * 0.6 ? 'translate(calc(-100% - 12px), 0)' : 'translate(12px, 0)' }}
          >
            <div className="ts-tooltip-title">{labels[hover]}</div>
            {series.map((s) => {
              const v = s.values[hover];
              return (
                <div key={s.name} className="ts-tooltip-row">
                  <span className="ts-key" style={{ background: s.color.startsWith('--') ? `var(${s.color})` : s.color }} />
                  <span className="ts-tooltip-value">
                    {Number.isNaN(v) ? '–' : `${formatValue(v, domain[1] - domain[0])}${unit ? ` ${unit}` : ''}`}
                  </span>
                  <span className="ts-tooltip-name">{s.name}</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {series.length > 1 && (
        <div className="ts-legend fc-legend">
          {series.map((s) => (
            <span key={s.name} className="ts-legend-item">
              <span className="ts-key" style={{ background: s.color.startsWith('--') ? `var(${s.color})` : s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
