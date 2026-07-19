// I 15 preset di fabbrica della vecchia EnviReader: 5 variabili × 3 momenti
// della giornata, con le stesse palette di catalogo di allora (differenza: C62).
// Qui l'orario è un'ora del giorno: all'applicazione si sceglie il passo più vicino.

const TIMES = [
  { key: 'preset_time_morning', hour: '08:00' },
  { key: 'preset_time_afternoon', hour: '14:00' },
  { key: 'preset_time_evening', hour: '20:00' },
];

const VARS = [
  { key: 'preset_var_temp', dataGroup: 'atmosphere', dataset: 'Potential Air Temperature (°C)', palette: 'C61' },
  { key: 'preset_var_wind', dataGroup: 'atmosphere', dataset: 'Wind Speed (m/s)', palette: 'C53', wind: true },
  { key: 'preset_var_rh', dataGroup: 'atmosphere', dataset: 'Relative Humidity (%)', palette: 'C25' },
  { key: 'preset_var_mrt', dataGroup: 'atmosphere', dataset: 'Mean Radiant Temp. (°C)', palette: 'C29' },
  { key: 'preset_var_utci', dataGroup: 'biomet/UTCI', dataset: 'UTCI (°C)', palette: 'C45' },
];

export const DEFAULT_PRESETS = VARS.flatMap((v) =>
  TIMES.map((t) => ({
    id: `default-${v.palette}-${t.hour}`,
    varKey: v.key,
    timeKey: t.key,
    settings: {
      dataGroup: v.dataGroup,
      dataset: v.dataset,
      hour: t.hour,
      level: 0,
      followTerrain: true,
      showWindField: !!v.wind,
      scaleType: 'syncedViews',
      palette: v.palette,
      paletteReversed: false,
      diffPalette: 'C62',
      diffPaletteReversed: false,
    },
  })),
);
