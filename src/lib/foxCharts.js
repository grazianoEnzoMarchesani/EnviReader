// Grafici delle condizioni al contorno (FOX): quali serie mostrare, con quali
// colori, unità e intervallo temporale. Condiviso tra la vista Boundary
// conditions (BoundaryView, canvas) e l'export SVG (exportBoundary), che
// devono produrre esattamente gli stessi grafici.

const SERIES_COLORS = ['--series-a', '--series-b', '--series-c']; // ordine validato (rosso, blu, verde)

// Serie per quota di un profilo FOX → input per ForcingChart (max 3 quote)
export function heightSeries(profile, pick) {
  return profile.slice(0, 3).map((p, i) => ({
    name: `${p.height} m`,
    color: profile.length > 1 ? SERIES_COLORS[i] : '--series-b',
    values: pick(p),
  }));
}

// Un grafico per grandezza presente nel file: temperatura, umidità, vento
// (velocità + direzione), radiazione, precipitazioni, pressione, nuvolosità e
// un grafico per ciascun inquinante di fondo.
export function buildFoxCharts(fox, tr) {
  if (!fox) return [];
  const charts = [];
  if (fox.t.length) charts.push({ key: 't', title: tr('boundary_param_temp'), unit: '°C', series: heightSeries(fox.t, (p) => p.values) });
  if (fox.q.length) charts.push({ key: 'q', title: tr('forcing_q'), unit: 'g/kg', series: heightSeries(fox.q, (p) => p.values) });
  if (fox.wind.length) {
    charts.push({ key: 'wspd', title: tr('boundary_param_windspeed'), unit: 'm/s', series: heightSeries(fox.wind, (p) => p.speed) });
    charts.push({
      key: 'wdir',
      title: tr('boundary_param_winddir'),
      unit: '°',
      yDomain: [0, 360],
      yTickStep: 90,
      series: heightSeries(fox.wind, (p) => p.dir).map((s) => ({ ...s, kind: 'dots' })),
    });
  }
  const rad = [
    fox.swDir && { name: tr('forcing_rad_dir'), color: SERIES_COLORS[0], values: fox.swDir },
    fox.swDif && { name: tr('forcing_rad_dif'), color: SERIES_COLORS[1], values: fox.swDif },
    fox.lwRad && { name: tr('forcing_rad_lw'), color: SERIES_COLORS[2], values: fox.lwRad },
  ].filter(Boolean);
  if (rad.length) charts.push({ key: 'rad', title: tr('boundary_param_radiation'), unit: 'W/m²', series: rad });
  if (fox.precip) {
    charts.push({ key: 'precip', title: tr('forcing_precip'), unit: 'mm', series: [{ name: tr('forcing_precip'), color: '--series-b', values: fox.precip, kind: 'area' }] });
  }
  if (fox.p.length) charts.push({ key: 'press', title: tr('forcing_press'), unit: 'hPa', series: heightSeries(fox.p, (p) => p.values) });
  if (fox.clouds) {
    charts.push({
      key: 'clouds',
      title: tr('forcing_clouds'),
      unit: '/8',
      series: [
        { name: tr('forcing_clouds_l'), color: SERIES_COLORS[0], values: fox.clouds.l },
        { name: tr('forcing_clouds_m'), color: SERIES_COLORS[1], values: fox.clouds.m },
        { name: tr('forcing_clouds_h'), color: SERIES_COLORS[2], values: fox.clouds.h },
      ],
    });
  }
  for (const [name, values] of Object.entries(fox.pollutants || {})) {
    charts.push({ key: `poll-${name}`, title: `${tr('forcing_poll')} · ${name}`, unit: 'µg/m³', series: [{ name, color: '--series-b', values }] });
  }
  return charts;
}

// Intervallo [i0, i1] della serie FOX per il periodo scelto in sidebar;
// null = tutto il file
export function resolveRange(forcing, period, customRange) {
  const fox = forcing?.fox;
  if (!fox) return null;
  if (period === 'sim') return forcing.window;
  if (period === 'custom') return customRange;
  if (period?.startsWith('m:')) {
    const month = fox.months.find((m) => m.key === period.slice(2));
    return month ? [month.start, month.end - 1] : null;
  }
  return null;
}
