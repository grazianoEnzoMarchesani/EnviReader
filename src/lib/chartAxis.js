// Assi dei grafici a linee: tacche "pulite" ed etichette temporali. Condiviso
// da TimeSeriesChart (serie nel punto), ForcingChart (serie meteo del FOX) e
// dall'export SVG delle condizioni al contorno, che devono mostrare gli stessi
// valori sugli assi degli stessi dati.

// Tacche allineate a 1/2/2.5/5 per potenza di dieci, dentro [min, max]
export function niceTicks(min, max, count = 4) {
  const span = max - min || 1;
  const mag = 10 ** Math.floor(Math.log10(span / count));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) || 10 * mag;
  const ticks = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-6; v += step) ticks.push(v);
  return ticks;
}

// "2018-03-21 · 14:00" → etichetta asse breve: la data, oppure la sola ora
// quando l'intervallo mostrato è corto (shortRange)
export function tickLabel(label, shortRange) {
  const [date, time] = String(label).split(' · ');
  if (!time) return date ?? '';
  if (shortRange) return time;
  const [, m, d] = date.split('-');
  return `${d}/${m}`;
}
