import { loadForcing } from './forcing';

const SERIES_COLORS = ['--series-a', '--series-b', '--series-c'];

function heightSeries(profile, pick) {
  return profile.slice(0, 3).map((p, i) => ({
    name: `${p.height} m`,
    color: profile.length > 1 ? SERIES_COLORS[i] : '--series-b',
    values: pick(p),
  }));
}

function resolveRange(forcing, period, customRange) {
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

function buildFoxCharts(fox, tr) {
  if (!fox) return [];
  const charts = [];
  if (fox.t.length) charts.push({ key: 't', title: tr('boundary_param_temp') || 'Air temperature', unit: '°C', series: heightSeries(fox.t, (p) => p.values) });
  if (fox.q.length) charts.push({ key: 'q', title: tr('forcing_q') || 'Specific humidity', unit: 'g/kg', series: heightSeries(fox.q, (p) => p.values) });
  if (fox.wind.length) {
    charts.push({ key: 'wspd', title: tr('boundary_param_windspeed') || 'Wind speed', unit: 'm/s', series: heightSeries(fox.wind, (p) => p.speed) });
    charts.push({
      key: 'wdir',
      title: tr('boundary_param_winddir') || 'Wind direction',
      unit: '°',
      yDomain: [0, 360],
      yTickStep: 90,
      series: heightSeries(fox.wind, (p) => p.dir).map((s) => ({ ...s, kind: 'dots' })),
    });
  }
  const rad = [
    fox.swDir && { name: tr('forcing_rad_dir') || 'Direct SW', color: SERIES_COLORS[0], values: fox.swDir },
    fox.swDif && { name: tr('forcing_rad_dif') || 'Diffuse SW', color: SERIES_COLORS[1], values: fox.swDif },
    fox.lwRad && { name: tr('forcing_rad_lw') || 'Longwave', color: SERIES_COLORS[2], values: fox.lwRad },
  ].filter(Boolean);
  if (rad.length) charts.push({ key: 'rad', title: tr('boundary_param_radiation') || 'Radiation', unit: 'W/m²', series: rad });
  if (fox.precip) {
    charts.push({ key: 'precip', title: tr('forcing_precip') || 'Precipitation', unit: 'mm', series: [{ name: tr('forcing_precip') || 'Precipitation', color: '--series-b', values: fox.precip, kind: 'area' }] });
  }
  if (fox.p.length) charts.push({ key: 'press', title: tr('forcing_press') || 'Pressure', unit: 'hPa', series: heightSeries(fox.p, (p) => p.values) });
  if (fox.clouds) {
    charts.push({
      key: 'clouds',
      title: tr('forcing_clouds') || 'Clouds',
      unit: '/8',
      series: [
        { name: tr('forcing_clouds_l') || 'Low', color: SERIES_COLORS[0], values: fox.clouds.l },
        { name: tr('forcing_clouds_m') || 'Medium', color: SERIES_COLORS[1], values: fox.clouds.m },
        { name: tr('forcing_clouds_h') || 'High', color: SERIES_COLORS[2], values: fox.clouds.h },
      ],
    });
  }
  for (const [name, values] of Object.entries(fox.pollutants || {})) {
    charts.push({ key: `poll-${name}`, title: `${tr('forcing_poll') || 'Pollutant'} · ${name}`, unit: 'µg/m³', series: [{ name, color: '--series-b', values }] });
  }
  return charts;
}

function niceTicks(min, max, count = 4) {
  const span = max - min || 1;
  const mag = 10 ** Math.floor(Math.log10(span / count));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) || 10 * mag;
  const ticks = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-6; v += step) ticks.push(v);
  return ticks;
}

function formatValue(val, rangeSpan = null) {
  if (val == null || Number.isNaN(val)) return '—';
  const v = Number(val);
  if (v === 0) return '0';
  if (rangeSpan != null) {
    if (rangeSpan <= 2) return v.toFixed(3);
    if (rangeSpan <= 10) return v.toFixed(2);
    if (rangeSpan <= 50) return v.toFixed(1);
    return v.toFixed(0);
  }
  return v.toFixed(2);
}

function tickLabel(label, shortRange) {
  const [date, time] = String(label).split(' · ');
  if (!time) return date ?? '';
  if (shortRange) return time;
  const [, m, d] = date.split('-');
  return `${d}/${m}`;
}

const resolveColor = (name) => {
  const vars = {
    '--series-a': '#3b82f6',
    '--series-b': '#d97706',
    '--series-c': '#10b981',
    '--border': '#e5e7eb',
    '--text-secondary': '#6b7280',
    '--text': '#111827',
    '--surface': '#ffffff'
  };
  return vars[name] || name;
};

function generateChartSvg(chart, labels, range) {
  const width = 800;
  const height = 300;
  const M = { top: 30, right: 20, bottom: 40, left: 60 };
  const innerW = width - M.left - M.right;
  const innerH = height - M.top - M.bottom;

  const i0 = range ? Math.max(0, range[0]) : 0;
  const i1 = range ? Math.min(labels.length - 1, range[1]) : labels.length - 1;
  const count = Math.max(1, i1 - i0 + 1);

  let min = Infinity;
  let max = -Infinity;
  for (const s of chart.series) {
    for (let i = i0; i <= i1; i++) {
      const v = s.values[i];
      if (Number.isNaN(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (min === Infinity) { min = 0; max = 1; }
  if (chart.series.some((s) => s.kind === 'area') && min > 0) min = 0;
  const pad = (max - min || Math.abs(max) || 1) * 0.08;
  const domain = chart.yDomain || [min - (min === 0 ? 0 : pad), max + pad];

  const xAt = (i) => M.left + (count > 1 ? ((i - i0) / (count - 1)) * innerW : innerW / 2);
  const yAt = (v) => M.top + (1 - (v - domain[0]) / (domain[1] - domain[0])) * innerH;

  const yTicks = chart.yTickStep
    ? niceTicks(domain[0], domain[1], Math.round((domain[1] - domain[0]) / chart.yTickStep))
    : niceTicks(domain[0], domain[1]);

  let svg = `<?xml version="1.0" standalone="no"?>\n`;
  svg += `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="background-color: ${resolveColor('--surface')}; font-family: sans-serif;">\n`;
  
  // Title
  svg += `<text x="${M.left}" y="${M.top - 15}" fill="${resolveColor('--text')}" font-size="14" font-weight="bold">${chart.title}</text>\n`;
  svg += `<text x="${width - M.right}" y="${M.top - 15}" fill="${resolveColor('--text-secondary')}" font-size="12" text-anchor="end">${chart.unit}</text>\n`;

  // Grid & Y Ticks
  for (const v of yTicks) {
    const y = yAt(v);
    if (y < M.top - 1 || y > M.top + innerH + 1) continue;
    svg += `<line x1="${M.left}" y1="${y}" x2="${M.left + innerW}" y2="${y}" stroke="${resolveColor('--border')}" stroke-width="1" />\n`;
    svg += `<text x="${M.left - 8}" y="${y + 4}" fill="${resolveColor('--text-secondary')}" font-size="11" text-anchor="end">${formatValue(v, domain[1] - domain[0])}</text>\n`;
  }

  // X Ticks
  const shortRange = count <= 72;
  const xTickCount = Math.max(2, Math.floor(innerW / 96));
  const xStep = Math.max(1, Math.ceil(count / xTickCount));
  for (let i = i0; i <= i1; i += xStep) {
    const x = xAt(i);
    svg += `<text x="${x}" y="${height - 15}" fill="${resolveColor('--text-secondary')}" font-size="11" text-anchor="middle">${tickLabel(labels[i], shortRange)}</text>\n`;
  }

  // Series
  for (const s of chart.series) {
    const color = resolveColor(s.color);
    if (s.kind === 'dots') {
      for (let i = i0; i <= i1; i++) {
        const v = s.values[i];
        if (Number.isNaN(v)) continue;
        const x = xAt(i);
        const y = yAt(v);
        svg += `<rect x="${x - 1}" y="${y - 1}" width="2" height="2" fill="${color}" />\n`;
      }
    } else {
      let d = '';
      let pen = false;
      let firstX = null;
      let lastX = null;
      for (let i = i0; i <= i1; i++) {
        const v = s.values[i];
        if (Number.isNaN(v)) {
          pen = false;
          continue;
        }
        const x = xAt(i);
        const y = yAt(v);
        if (pen) d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
        else d += `M ${x.toFixed(2)} ${y.toFixed(2)}`;
        pen = true;
        if (firstX === null) firstX = x;
        lastX = x;
      }
      if (d) {
        svg += `<path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />\n`;
        if (s.kind === 'area' && firstX !== null) {
          const y0 = yAt(Math.max(0, domain[0]));
          svg += `<path d="${d} L ${lastX.toFixed(2)} ${y0} L ${firstX.toFixed(2)} ${y0} Z" fill="${color}" fill-opacity="0.18" />\n`;
        }
      }
    }
  }

  // Legend
  if (chart.series.length > 1) {
    let legendX = M.left;
    for (const s of chart.series) {
      const color = resolveColor(s.color);
      svg += `<rect x="${legendX}" y="${height - 10}" width="10" height="10" fill="${color}" />\n`;
      svg += `<text x="${legendX + 14}" y="${height - 1}" fill="${resolveColor('--text-secondary')}" font-size="11">${s.name}</text>\n`;
      legendX += 80; // approximate width
    }
  }

  svg += `</svg>`;
  return svg;
}

export async function generateBoundarySVGs(fileset, type, foxFileOverride, tr, period, customRange) {
  if (!fileset) return [];
  const forcing = await loadForcing(fileset, foxFileOverride);
  if (!forcing || (!forcing.fox && !forcing.simple)) return [];

  const range = resolveRange(forcing, period, customRange);

  const svgs = [];
  if (forcing.fox) {
    const charts = buildFoxCharts(forcing.fox, tr);
    for (const chart of charts) {
      const svgString = generateChartSvg(chart, forcing.fox.labels, range);
      svgs.push({ filename: `Boundary_${type}_${chart.key}.svg`, svgString });
    }
  } else if (forcing.simple) {
    const labels = forcing.simple.t.map((_, i) => `${String(i % 24).padStart(2, '0')}:00`);
    const tempChart = {
      key: 't',
      title: tr('boundary_param_temp') || 'Air temperature',
      unit: '°C',
      series: [{ name: tr('boundary_param_temp') || 'Air temperature', color: '--series-b', values: forcing.simple.t }]
    };
    svgs.push({ filename: `Boundary_${type}_t.svg`, svgString: generateChartSvg(tempChart, labels, range) });

    if (forcing.simple.q) {
      const qChart = {
        key: 'q',
        title: tr('boundary_param_humidity') || 'Specific humidity',
        unit: '%',
        series: [{ name: tr('boundary_param_humidity') || 'Specific humidity', color: '--series-b', values: forcing.simple.q }]
      };
      svgs.push({ filename: `Boundary_${type}_q.svg`, svgString: generateChartSvg(qChart, labels, range) });
    }
  }
  return svgs;
}
