import tonerStyle from '../data/tonerStyle.json';

// Sfondo del Web GIS. Due sorgenti, entrambe solo dopo il consenso (mapConsent.js):
//  - "streets": stile Toner (Stamen, implementazione GL di MapTiler/OpenMapTiles,
//    github.com/openmaptiles/maptiler-toner-gl-style, BSD-3) sui tile vettoriali
//    di OpenFreeMap: tutto il pianeta, nessuna chiave, nessun account.
//  - "satellite": World Imagery di Esri (tile raster pubblici, con CORS).
// Senza consenso lo stile è solo un colore di fondo: nessuna sorgente, nessun
// glyph, nessuno sprite, nessuna richiesta di rete.

const TILES_URL = 'https://tiles.openfreemap.org/planet';
const GLYPHS_URL = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
const SATELLITE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

const STREETS_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> ' +
  '<a href="https://www.openmaptiles.org/" target="_blank" rel="noopener noreferrer">&copy; OpenMapTiles</a> ' +
  'Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> · ' +
  'Toner style &copy; <a href="https://stamen.com" target="_blank" rel="noopener noreferrer">Stamen</a>';
const SATELLITE_ATTRIBUTION = 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community';

// Lo stile Toner usa Nunito, che OpenFreeMap non ospita: si ripiega sui Noto Sans che ha.
const FONT_MAP = {
  'Nunito Regular': 'Noto Sans Regular',
  'Nunito Semi Bold': 'Noto Sans Bold',
  'Nunito Bold': 'Noto Sans Bold',
  'Nunito Extra Bold': 'Noto Sans Bold',
  'Noto Sans Bold Italic': 'Noto Sans Italic',
};

const mapFonts = (value) => {
  if (typeof value === 'string') return FONT_MAP[value] ?? value;
  if (Array.isArray(value)) return value.map(mapFonts);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapFonts(v)]));
  }
  return value;
};

const absoluteUrl = (path) => new URL(import.meta.env.BASE_URL + path, window.location.href).href;

export const SATELLITE_LAYER_ID = 'basemap-satellite';
const STREETS_LAYER_IDS = tonerStyle.layers.map((l) => l.id);

export function buildBaseStyle(withTiles, basemap) {
  const background = { id: 'basemap-background', type: 'background', paint: { 'background-color': '#eceeef' } };
  if (!withTiles) return { version: 8, name: 'No base map', sources: {}, layers: [background] };

  const vis = (on) => ({ visibility: on ? 'visible' : 'none' });
  const streetsLayers = tonerStyle.layers.map((l) => {
    const layer = mapFonts(l);
    return { ...layer, layout: { ...(layer.layout || {}), ...vis(basemap === 'streets') } };
  });
  return {
    version: 8,
    name: 'Toner + World Imagery',
    sources: {
      openmaptiles: { type: 'vector', url: TILES_URL, attribution: STREETS_ATTRIBUTION },
      satellite: { type: 'raster', tiles: [SATELLITE_URL], tileSize: 256, maxzoom: 19, attribution: SATELLITE_ATTRIBUTION },
    },
    glyphs: GLYPHS_URL,
    sprite: absoluteUrl('map/sprites/toner'),
    layers: [
      background,
      { id: SATELLITE_LAYER_ID, type: 'raster', source: 'satellite', layout: vis(basemap === 'satellite') },
      ...streetsLayers,
    ],
  };
}

// Mostra lo sfondo scelto e nasconde l'altro, senza ricaricare lo stile
export function applyBasemapVisibility(map, basemap) {
  if (map.getLayer(SATELLITE_LAYER_ID)) {
    map.setLayoutProperty(SATELLITE_LAYER_ID, 'visibility', basemap === 'satellite' ? 'visible' : 'none');
  }
  for (const id of STREETS_LAYER_IDS) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', basemap === 'streets' ? 'visible' : 'none');
  }
}
