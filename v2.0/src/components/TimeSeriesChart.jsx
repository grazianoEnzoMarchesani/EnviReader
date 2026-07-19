import { useEffect, useRef, useState } from 'react';
import { formatValue } from '../lib/colormap';

// Grafico a linee della serie temporale nel punto selezionato, in SVG puro.
// La linea verticale piena marca l'istante mostrato nelle mappe; il crosshair
// tratteggiato segue il mouse e un click sposta lo slider del tempo.
const HEIGHT = 240;
const M = { top: 22, right: 16, bottom: 26, left: 56 };
const MAX_MARKERS = 60; // oltre, i punti diventano rumore: resta la sola linea

// Tacche "pulite" per l'asse y (1/2/2.5/5 per potenza di dieci)
function niceTicks(min, max, count = 5) {
  const span = max - min || 1;
  const mag = 10 ** Math.floor(Math.log10(span / count));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) || 10 * mag;
  const ticks = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-6; v += step) ticks.push(v);
  return ticks;
}

// Spezza la polilinea sui NaN (i "no data" di ENVI-met) invece di collegarli
function linePath(values, xAt, yAt) {
  let path = '';
  let pen = false;
  values.forEach((v, i) => {
    if (Number.isNaN(v)) {
      pen = false;
      return;
    }
    path += `${pen ? 'L' : 'M'}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`;
    pen = true;
  });
  return path;
}

export default function TimeSeriesChart({ series, labels, time, onSelectTime }) {
  const boxRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(boxRef.current);
    return () => observer.disconnect();
  }, []);

  const drawn = series.filter((s) => s.values);
  const n = Math.max(labels.length, ...drawn.map((s) => s.values.length));
  if (!drawn.length || n === 0) return null;

  let min = Infinity;
  let max = -Infinity;
  for (const s of drawn) {
    for (const v of s.values) {
      if (Number.isNaN(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (min === Infinity) { min = 0; max = 1; }
  const pad = (max - min || 1) * 0.06;
  min -= pad;
  max += pad;
  const span = max - min;

  const innerW = Math.max(0, width - M.left - M.right);
  const innerH = HEIGHT - M.top - M.bottom;
  const xAt = (i) => M.left + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2);
  const yAt = (v) => M.top + (1 - (v - min) / span) * innerH;
  const yTicks = niceTicks(min, max);
  const xStep = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(innerW / 90))));
  // delle etichette "2023-06-21 · 14:00" sull'asse resta la sola ora
  const shortLabel = (i) => (labels[i] ?? String(i)).split(' · ').pop();

  const indexFromEvent = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left - M.left) / (innerW || 1);
    return Math.min(n - 1, Math.max(0, Math.round(frac * (n - 1))));
  };

  const timeX = xAt(Math.min(time, n - 1));
  const timeFlip = timeX > M.left + innerW * 0.6;

  return (
    <div ref={boxRef} className="ts-chart">
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          onMouseMove={(e) => setHover(indexFromEvent(e))}
          onMouseLeave={() => setHover(null)}
          onClick={(e) => onSelectTime?.(indexFromEvent(e))}
        >
          {yTicks.map((v) => (
            <g key={v}>
              <line className="ts-grid" x1={M.left} x2={M.left + innerW} y1={yAt(v)} y2={yAt(v)} shapeRendering="crispEdges" />
              <text className="ts-tick" x={M.left - 8} y={yAt(v) + 3} textAnchor="end">{formatValue(v, span)}</text>
            </g>
          ))}
          {Array.from({ length: n }, (_, i) => i)
            .filter((i) => i % xStep === 0)
            .map((i) => (
              <text key={i} className="ts-tick" x={xAt(i)} y={HEIGHT - 8} textAnchor="middle">{shortLabel(i)}</text>
            ))}

          {hover != null && hover !== time && (
            <line className="ts-crosshair" x1={xAt(hover)} x2={xAt(hover)} y1={M.top} y2={M.top + innerH} />
          )}

          {/* istante corrente delle mappe */}
          <g className="ts-now">
            <line x1={timeX} x2={timeX} y1={M.top} y2={M.top + innerH} />
            <circle cx={timeX} cy={M.top} r="3" />
            <circle cx={timeX} cy={M.top + innerH} r="3" />
            <text x={timeX + (timeFlip ? -7 : 7)} y={M.top - 8} textAnchor={timeFlip ? 'end' : 'start'}>
              {labels[time] ?? ''}
            </text>
          </g>

          {drawn.map((s) => (
            <g key={s.name}>
              <path className="ts-line" d={linePath(s.values, xAt, yAt)} style={{ stroke: s.color }} />
              {n <= MAX_MARKERS &&
                s.values.map((v, i) =>
                  Number.isNaN(v) ? null : (
                    <circle key={i} className="ts-dot" cx={xAt(i)} cy={yAt(v)} r="4" style={{ fill: s.color }} />
                  ),
                )}
            </g>
          ))}
        </svg>
      )}

      {hover != null && (
        <div className="ts-tooltip" style={{ left: xAt(hover), transform: hover > n * 0.6 ? 'translate(calc(-100% - 12px), 0)' : 'translate(12px, 0)' }}>
          <div className="ts-tooltip-title">{labels[hover] ?? hover}</div>
          {drawn.map((s) => {
            const v = s.values[hover];
            return (
              <div key={s.name} className="ts-tooltip-row">
                <span className="ts-key" style={{ background: s.color }} />
                <span className="ts-tooltip-value">{v == null || Number.isNaN(v) ? '–' : formatValue(v, span)}</span>
                <span className="ts-tooltip-name">{s.name}</span>
              </div>
            );
          })}
        </div>
      )}

      {drawn.length > 1 && (
        <div className="ts-legend">
          {drawn.map((s) => (
            <span key={s.name} className="ts-legend-item">
              <span className="ts-key" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
