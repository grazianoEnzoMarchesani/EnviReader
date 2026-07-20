// Palette personalizzate: persistenza in localStorage, export/import su file JSON
// e "codice palette" testuale (EVR1:hex-hex-…:Nome) per condividerne una al volo.
// Una palette personalizzata è { id, name, colors: ['#rrggbb', …] }.

const STORAGE_KEY = 'envireader.customPalettes.v1';
export const MIN_STOPS = 2;
export const MAX_STOPS = 8;

const isHex = (s) => typeof s === 'string' && /^#[0-9a-f]{6}$/i.test(s);

function sanitize(item) {
  if (!item || !Array.isArray(item.colors)) return null;
  const colors = item.colors.filter(isHex).map((c) => c.toLowerCase());
  if (colors.length < MIN_STOPS || colors.length > MAX_STOPS) return null;
  return { id: typeof item.id === 'string' ? item.id : makeId(), name: String(item.name || '').trim() || 'Palette', colors };
}

export function loadCustomPalettes() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.map(sanitize).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function persistCustomPalettes(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // quota piena o storage disabilitato: la palette resta comunque in memoria
  }
}

export function makeId() {
  return `u${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

// In caso di nomi già presenti l'import aggiunge " (2)", " (3)", …
export function uniqueName(name, taken) {
  if (!taken.includes(name)) return name;
  let n = 2;
  while (taken.includes(`${name} (${n})`)) n++;
  return `${name} (${n})`;
}

// ---------- codice palette condivisibile ----------

export function encodePaletteCode(name, colors) {
  return `EVR1:${colors.map((c) => c.slice(1).toLowerCase()).join('-')}:${name}`;
}

export function decodePaletteCode(text) {
  const m = String(text).trim().match(/^EVR1:([0-9a-f]{6}(?:-[0-9a-f]{6})+):(.*)$/i);
  if (!m) return null;
  const colors = m[1].toLowerCase().split('-').map((h) => `#${h}`);
  if (colors.length > MAX_STOPS) return null;
  return { name: m[2].trim(), colors };
}

// ---------- export/import su file ----------

export function paletteFilePayload(list) {
  return JSON.stringify(
    { app: 'EnviReader', kind: 'palettes', version: 1, palettes: list.map(({ name, colors }) => ({ name, colors })) },
    null,
    2,
  );
}

export function parsePaletteFile(text) {
  try {
    const data = JSON.parse(text);
    if (data?.kind !== 'palettes' || !Array.isArray(data.palettes)) return null;
    const items = data.palettes.map(sanitize).filter(Boolean);
    return items.length ? items : null;
  } catch {
    return null;
  }
}

// ---------- ricampionamento (bottoni +/− dell'editor) ----------

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]) {
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// N tappe equidistanti campionate lungo il gradiente attuale: cambiare il
// numero di tappe preserva l'aspetto complessivo della palette.
export function resampleColors(colors, n) {
  n = Math.max(MIN_STOPS, Math.min(MAX_STOPS, n));
  if (n === colors.length) return colors;
  const stops = colors.map(hexToRgb);
  const out = [];
  for (let i = 0; i < n; i++) {
    const pos = (i / (n - 1)) * (stops.length - 1);
    const k = Math.min(Math.floor(pos), stops.length - 2);
    const f = pos - k;
    out.push(rgbToHex(stops[k].map((c, ch) => Math.round(c + (stops[k + 1][ch] - c) * f))));
  }
  return out;
}
