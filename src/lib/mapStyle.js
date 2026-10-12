import tonerStyle from '../data/tonerStyle.json';

// Sfondo del Web GIS: stile Toner (Stamen, implementazione GL di
// MapTiler/OpenMapTiles, github.com/openmaptiles/maptiler-toner-gl-style, BSD-3)
// sui tile vettoriali di OpenFreeMap: tutto il pianeta, nessuna chiave, nessun
// account. Solo dopo il consenso (mapConsent.js): senza, lo stile è un colore di
// fondo, senza sorgenti, glyph né sprite, quindi nessuna richiesta di rete.
//
// Niente immagini satellitari: l'unico servizio gratuito con la risoluzione che
// serve a un modello alla scala di edificio (Esri World Imagery) è coperto dalla
// Master License di Esri e per uso in app di terzi richiede un account e una
// chiave ArcGIS Location Platform. Non lo usiamo.

const TILES_URL = 'https://tiles.openfreemap.org/planet';
const GLYPHS_URL = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';

const STREETS_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> ' +
  '<a href="https://www.openmaptiles.org/" target="_blank" rel="noopener noreferrer">&copy; OpenMapTiles</a> ' +
  'Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> · ' +
  'Toner style &copy; <a href="https://stamen.com" target="_blank" rel="noopener noreferrer">Stamen</a>';

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

export function buildBaseStyle(withTiles) {
  const background = { id: 'basemap-background', type: 'background', paint: { 'background-color': '#eceeef' } };
  if (!withTiles) return { version: 8, name: 'No base map', sources: {}, layers: [background] };
  return {
    version: 8,
    name: 'Toner',
    sources: {
      openmaptiles: { type: 'vector', url: TILES_URL, attribution: STREETS_ATTRIBUTION },
    },
    glyphs: GLYPHS_URL,
    sprite: absoluteUrl('map/sprites/toner'),
    layers: [background, ...tonerStyle.layers.map(mapFonts)],
  };
}

// Le richieste di tile partono da un Worker, che non eredita il <meta name="referrer">
// della pagina: la politica si passa richiesta per richiesta.
export const transformRequest = (url) => ({ url, referrerPolicy: 'no-referrer' });
