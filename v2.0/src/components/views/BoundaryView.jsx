import { useMemo, useRef } from 'react';
import { useAppState } from '../../state/AppStateContext';
import { useI18n } from '../../i18n/I18nContext';
import { useForcing } from '../../lib/useForcing';
import ForcingChart from '../ForcingChart';
import Segmented from '../controls/Segmented';

// Condizioni al contorno: contenuto del SIMX (impostazioni + eventuale Simple
// Forcing orario) e serie meteo del FOX quando la simulazione è in Full Forcing.

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
const SERIES_COLORS = ['--series-a', '--series-b', '--series-c']; // ordine validato (rosso, blu, verde)
const KNOWN_SECTIONS = ['Header', 'mainData', 'FullForcing', 'SimpleForcing', 'Parallel'];

const num = (v) => parseFloat(v);
const fmt = (v, digits = 2) => (Number.isFinite(num(v)) ? String(+num(v).toFixed(digits)) : v || '—');
const compass = (deg) => COMPASS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];

// Righe della card SIMX: etichetta, valore formattato, unità
function mainDataRows(md, tr) {
  if (!md) return [];
  const kelvin = num(md.T_H) > 200;
  const rows = [
    ['simx_simname', md.simName || '—'],
    ['simx_inx', md.INXFile || '—'],
    ['simx_start', md.startDate ? `${md.startDate} · ${(md.startTime || '').slice(0, 5)}` : '—'],
    ['simx_duration', fmt(md.simDuration), 'h'],
    ['simx_windspeed', fmt(md.windSpeed), 'm/s'],
    ['simx_winddir', `${fmt(md.windDir, 0)}° (${compass(num(md.windDir))})`],
    ['simx_z0', fmt(md.z0, 3), 'm'],
    ['simx_th', kelvin ? `${fmt(num(md.T_H) - 273.15, 1)} °C (${fmt(md.T_H, 1)} K)` : `${fmt(md.T_H, 1)} °C`],
    ['simx_qh', fmt(md.Q_H), 'g/kg'],
    ['simx_q2m', fmt(md.Q_2m), '%'],
    ['simx_windlimit', fmt(md.windLimit), 'm/s'],
    ['simx_windaccuracy', md.windAccuracy || '—'],
  ];
  if (md.outDir) rows.push(['simx_outdir', md.outDir]);
  if (md.scenario) rows.push(['simx_scenario', md.scenario]);
  return rows.map(([key, value, unit]) => ({ key, label: tr(key), value, unit }));
}

function KvGrid({ rows }) {
  return (
    <div className="kv-grid">
      {rows.map((row) => (
        <div key={row.key} className="kv">
          <span className="kv-label">{row.label}</span>
          <span className="kv-value">
            {row.value}
            {row.unit ? <span className="kv-unit"> {row.unit}</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}

function Flag({ on, label }) {
  return (
    <span className={`flag${on ? ' on' : ''}`}>
      <span className="flag-mark">{on ? '✓' : '—'}</span>
      {label}
    </span>
  );
}

// Serie per quota di un profilo FOX → input per ForcingChart (max 3 quote)
const heightSeries = (profile, pick) =>
  profile.slice(0, 3).map((p, i) => ({
    name: `${p.height} m`,
    color: profile.length > 1 ? SERIES_COLORS[i] : '--series-b',
    values: pick(p),
  }));

function buildFoxCharts(fox, tr) {
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

// Intervallo [i0, i1] della serie FOX per il periodo scelto in sidebar
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

export default function BoundaryView() {
  const { state, set } = useAppState();
  const { tr } = useI18n();

  // fileset mostrato: quello selezionato, con fallback su quello disponibile
  const shown = state[`fileset${state.boundaryFileset}`] ? state.boundaryFileset : state.filesetA ? 'A' : state.filesetB ? 'B' : null;
  const fileset = shown ? state[`fileset${shown}`] : null;
  const forcing = useForcing(fileset, shown ? state[`foxFile${shown}`] : null);
  const fox = forcing?.fox;
  const foxInputRef = useRef(null);

  const range = resolveRange(forcing, state.boundaryPeriod, state.boundaryRange);
  const charts = useMemo(() => buildFoxCharts(fox, tr), [fox, tr]);
  const simxRows = useMemo(() => mainDataRows(forcing?.simx?.mainData, tr), [forcing, tr]);

  const filesetLabel = (key) => {
    const fs = state[`fileset${key}`];
    const name = fs?.name ?? fs?.rootDir;
    const base = tr(key === 'A' ? 'chart_fileset_a' : 'chart_fileset_b');
    return name ? `${base} · ${name}` : base;
  };

  // sezioni del SIMX non gestite esplicitamente, mostrate in modo generico
  const otherSections = Object.entries(forcing?.simx ?? {}).filter(
    ([key, value]) => !KNOWN_SECTIONS.includes(key) && typeof value === 'object',
  );

  const ff = forcing?.simx?.FullForcing;
  const md = forcing?.simx?.mainData;
  const isFull = forcing?.mode === 'full';

  const foxLocationRows = fox
    ? [
        { key: 'name', label: tr('fox_location'), value: fox.location?.name ?? '—' },
        { key: 'lat', label: tr('fox_lat'), value: fmt(fox.location?.lat, 4), unit: '°' },
        { key: 'lon', label: tr('fox_lon'), value: fmt(fox.location?.lon, 4), unit: '°' },
        { key: 'tz', label: tr('fox_tzlon'), value: fmt(fox.location?.timezoneLon, 1), unit: '°' },
        { key: 'alt', label: tr('fox_altitude'), value: fmt(fox.location?.altitude, 0), unit: 'm' },
        { key: 'period', label: tr('fox_period'), value: `${fox.labels[0]} → ${fox.labels[fox.n - 1]}` },
        { key: 'steps', label: tr('fox_steps'), value: String(fox.n) },
        { key: 'version', label: tr('fox_version'), value: String(fox.meta?.version ?? '—') },
      ]
    : [];

  return (
    <>
      <div className="status-strip">
        {(state.filesetA || state.filesetB) && (
          <Segmented
            options={[
              { key: 'A', label: filesetLabel('A'), disabled: !state.filesetA },
              { key: 'B', label: filesetLabel('B'), disabled: !state.filesetB },
            ]}
            value={shown}
            onSelect={(key) => set({ boundaryFileset: key })}
          />
        )}
        {forcing && <div className="chip accent">{tr(isFull ? 'source_full' : 'source_simple')}</div>}
        {forcing?.simxFileName && <div className="chip">SIMX · {forcing.simxFileName}</div>}
        {forcing?.foxFileName && fox && <div className="chip">FOX · {forcing.foxFileName}</div>}
        {fox?.location?.name && <div className="chip">{fox.location.name}</div>}
      </div>

      {!fileset && (
        <div className="boundary-empty">
          <span className="model-hint">{tr('boundary_no_fileset')}</span>
        </div>
      )}
      {fileset && !forcing && (
        <div className="boundary-empty">
          <span className="model-hint">{tr('boundary_loading')}</span>
        </div>
      )}
      {fileset && forcing && !forcing.simx && (
        <div className="boundary-empty">
          <span className="model-hint">{tr('boundary_no_simx')}</span>
        </div>
      )}

      {forcing?.simx && (
        <div className="boundary-stack">
          {/* impostazioni della simulazione dal SIMX */}
          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title">{tr('boundary_simx_title')}</div>
            </div>
            <div className="boundary-card-body">
              <KvGrid rows={simxRows} />
              {ff && (
                <div className="ff-block">
                  <div className="group-label">{tr('boundary_ff_title')} · {ff.fileName?.trim() || '—'}</div>
                  <div className="flag-row">
                    <Flag on={ff.forceT === '1'} label={tr('flag_force_t')} />
                    <Flag on={ff.forceQ === '1'} label={tr('flag_force_q')} />
                    <Flag on={ff.forceWind === '1'} label={tr('flag_force_wind')} />
                    <Flag on={ff.forcePrecip === '1'} label={tr('flag_force_precip')} />
                    <Flag on={ff.forceRadClouds === '1'} label={tr('flag_force_rad')} />
                    <Flag on={ff.verticalTAir === '1'} label={tr('flag_vertical_t')} />
                    <Flag on={ff.nudging === '1'} label={`${tr('flag_nudging')}${ff.nudging === '1' ? ` × ${fmt(ff.nudgingFactor, 2)}` : ''}`} />
                  </div>
                </div>
              )}
              {otherSections.length > 0 && (
                <details className="simx-other">
                  <summary>{tr('boundary_other_settings')}</summary>
                  {otherSections.map(([section, values]) => (
                    <KvGrid
                      key={section}
                      rows={Object.entries(values).map(([key, value]) => ({
                        key: `${section}.${key}`,
                        label: `${section} · ${key}`,
                        value: typeof value === 'object' ? JSON.stringify(value) : value || '—',
                      }))}
                    />
                  ))}
                </details>
              )}
            </div>
          </div>

          {/* FOX referenziato ma non trovato nella cartella */}
          {forcing.foxMissing && (
            <div className="chart-card">
              <div className="boundary-card-body fox-missing">
                <span>{tr('boundary_fox_missing')} <code>{forcing.foxRef}</code></span>
                <button className="option-btn" onClick={() => foxInputRef.current?.click()}>{tr('btn_open_fox')}</button>
                <input
                  ref={foxInputRef}
                  type="file"
                  accept=".fox,.FOX"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && shown) set({ [`foxFile${shown}`]: file });
                    e.target.value = '';
                  }}
                />
              </div>
            </div>
          )}

          {/* dati meteo del FOX: info file + overview con brush + grafici */}
          {fox && (
            <>
              <div className="chart-card">
                <div className="chart-header">
                  <div className="chart-title">{tr('boundary_fox_title')}</div>
                  <span className="chart-caption">{tr('boundary_overview_hint')}</span>
                </div>
                <div className="boundary-card-body">
                  <KvGrid rows={foxLocationRows} />
                  <ForcingChart
                    series={heightSeries(fox.t, (p) => p.values)}
                    labels={fox.labels}
                    height={110}
                    unit="°C"
                    theme={state.theme}
                    brush
                    range={range}
                    mark={forcing.window}
                    onBrush={(r) => set(r ? { boundaryRange: r, boundaryPeriod: 'custom' } : { boundaryRange: null, boundaryPeriod: 'all' })}
                  />
                </div>
              </div>
              <div className="boundary-grid">
                {charts.map((chart) => (
                  <div key={chart.key} className="chart-card">
                    <div className="chart-header">
                      <div className="chart-title">{chart.title}</div>
                      <span className="chart-caption">{chart.unit}</span>
                    </div>
                    <div className="boundary-chart-body">
                      <ForcingChart
                        series={chart.series}
                        labels={fox.labels}
                        range={range}
                        unit={chart.unit}
                        theme={state.theme}
                        yDomain={chart.yDomain}
                        yTickStep={chart.yTickStep}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Simple Forcing: serie orarie scritte nel SIMX stesso */}
          {!isFull && forcing.simple && (
            <div className="boundary-grid">
              <div className="chart-card">
                <div className="chart-header">
                  <div className="chart-title">{tr('boundary_param_temp')}</div>
                  <span className="chart-caption">°C</span>
                </div>
                <div className="boundary-chart-body">
                  <ForcingChart
                    series={[{ name: tr('boundary_param_temp'), color: '--series-b', values: forcing.simple.t }]}
                    labels={forcing.simple.t.map((_, i) => `${String(i % 24).padStart(2, '0')}:00`)}
                    unit="°C"
                    theme={state.theme}
                  />
                </div>
              </div>
              {forcing.simple.q && (
                <div className="chart-card">
                  <div className="chart-header">
                    <div className="chart-title">{tr('boundary_param_humidity')}</div>
                    <span className="chart-caption">%</span>
                  </div>
                  <div className="boundary-chart-body">
                    <ForcingChart
                      series={[{ name: tr('boundary_param_humidity'), color: '--series-b', values: forcing.simple.q }]}
                      labels={forcing.simple.q.map((_, i) => `${String(i % 24).padStart(2, '0')}:00`)}
                      unit="%"
                      theme={state.theme}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          {!isFull && !forcing.simple && md && (
            <p className="sidebar-desc boundary-note">{tr('boundary_simple_novalues')}</p>
          )}
        </div>
      )}
    </>
  );
}
