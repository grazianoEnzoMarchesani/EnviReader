export const PALETTES = [
  { id: 'Turbo', labelKey: null, colors: ['#30123b', '#4662d8', '#36b8b0', '#a0da39', '#fbb938', '#d9411e'] },
  { id: 'Viridis', labelKey: null, colors: ['#440154', '#3b528b', '#21908c', '#5dc963', '#fde725'] },
  { id: 'Thermal', labelKey: null, colors: ['#053061', '#4393c3', '#f7f7f7', '#d6604d', '#67001f'] },
  { id: 'Coolwarm', labelKey: null, colors: ['#3b4cc0', '#7396f5', '#dddddd', '#f29477', '#b40426'] },
  { id: 'Mono', labelKey: 'palette_mono', colors: ['#1c2024', '#4b5158', '#8a9099', '#c3c7cc', '#f0f1f3'] },
];

export const DIFF_PALETTES = [
  { id: 'RdBu', labelKey: null, colors: ['#2166ac', '#67a9cf', '#f7f7f7', '#ef8a62', '#b2182b'] },
  { id: 'PiYG', labelKey: null, colors: ['#8e0152', '#c994c7', '#f7f7f7', '#7fbc41', '#276419'] },
  { id: 'WarmCool', labelKey: 'palette_diff_warm_cool', colors: ['#023858', '#4292c6', '#ffffff', '#fb6a4a', '#67000d'] },
];

export const DATA_GROUPS = ['opt_data_group_2d', 'opt_data_group_3d', 'opt_data_group_veg', 'opt_data_group_receptors'];
export const DATASETS = ['opt_dataset_temp', 'opt_dataset_humidity', 'opt_dataset_wind', 'opt_dataset_mrt'];

export const SIDEBAR_TABS = [
  { key: 'data', labelKey: 'tab_data' },

  { key: 'wind', labelKey: 'tab_wind' },
  { key: 'palette', labelKey: 'tab_palette' },
  { key: 'presets', labelKey: 'tab_presets' },
];

export const VIEW_TYPES = [
  { key: 'plan', labelKey: 'view_plan', captionKey: 'caption_plan' },
  { key: 'sectionX', labelKey: 'view_sectionx', captionKey: 'caption_sectionx' },
  { key: 'sectionY', labelKey: 'view_sectiony', captionKey: 'caption_sectiony' },
];

export const NAV_VIEWS = [
  { key: 'analysis', labelKey: 'nav_analysis' },
  { key: 'model', labelKey: 'nav_model' },
  { key: 'boundary', labelKey: 'nav_boundary' },
];

export const MODEL_LAYERS = [
  { key: 'showBuildings', labelKey: 'layer_buildings' },
  { key: 'showVegetation', labelKey: 'layer_vegetation' },
  { key: 'showTerrain', labelKey: 'layer_terrain' },
  { key: 'showReceptors', labelKey: 'layer_receptors' },
  { key: 'showGrid', labelKey: 'layer_grid' },
];

export const SCALE_TYPES = [
  { value: 'individual', labelKey: 'legend_individual' },
  { value: 'syncedViews', labelKey: 'legend_synced' },
  { value: 'filesetGlobal', labelKey: 'legend_fileset' },
  { value: 'allFilesets', labelKey: 'legend_all' },
  { value: 'custom', labelKey: 'legend_custom' },
];

// Sottoinsieme di SCALE_TYPES rilevante per la vista 3D: niente "singolo
// grafico"/"tra viste" perché lì non esiste una vista alla volta, ogni
// fileset ha una sola legenda condivisa da tutti i piani attivi.
export const SCALE_TYPES_3D = SCALE_TYPES.filter((s) => s.value === 'filesetGlobal' || s.value === 'allFilesets' || s.value === 'custom');

export const GITHUB_URL = 'https://github.com/grazianoEnzoMarchesani/EnviReader';
