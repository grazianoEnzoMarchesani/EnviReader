// Preset di vista: fotografano gruppo dati, variabile, orario, palette e
// impostazioni di visualizzazione. Persistenza in localStorage ed export/import
// su file JSON; il parser accetta anche il preset.json della vecchia EnviReader.
// I preset nuovi salvano l'ora del giorno ("14:00") e all'applicazione si sceglie
// il passo temporale più vicino; in quelli vecchi il tempo era un indice grezzo,
// che resta come timeIndex di ripiego.
// Un preset è { id, name, settings } (i predefiniti hanno varKey/timeKey al posto di name).

import { makeId } from './paletteStore';
import { SCALE_TYPES } from '../data/constants';

const STORAGE_KEY = 'envireader.customPresets.v1';
const SCALE_VALUES = SCALE_TYPES.map((s) => s.value);

const BOOL_FIELDS = ['followTerrain', 'levelOut', 'showWindField', 'paletteReversed', 'diffPaletteReversed'];
const INT_FIELDS = ['timeIndex', 'level', 'sectionX', 'sectionY', 'levelOutHeight', 'windOpacity', 'windSize', 'windDensity'];
const STR_FIELDS = ['dataGroup', 'dataset', 'palette', 'diffPalette'];

const isHex = (s) => typeof s === 'string' && /^#[0-9a-f]{6}$/i.test(s);

function sanitizeSettings(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const s = {};
  for (const k of BOOL_FIELDS) if (typeof raw[k] === 'boolean') s[k] = raw[k];
  for (const k of INT_FIELDS) {
    const n = Number(raw[k]);
    if (Number.isFinite(n)) s[k] = Math.round(n);
  }
  for (const k of STR_FIELDS) if (typeof raw[k] === 'string' && raw[k]) s[k] = raw[k];
  const angle = Number(raw.sectionAngle);
  if (Number.isFinite(angle)) s.sectionAngle = angle;
  if (typeof raw.hour === 'string' && /^\d{1,2}:\d{2}$/.test(raw.hour)) s.hour = raw.hour;
  if (raw.windStyle === 'arrows' || raw.windStyle === 'streamlines') s.windStyle = raw.windStyle;
  if (SCALE_VALUES.includes(raw.scaleType)) s.scaleType = raw.scaleType;
  return Object.keys(s).length ? s : null;
}

function sanitizePreset(item) {
  const settings = sanitizeSettings(item?.settings);
  if (!settings) return null;
  return {
    id: typeof item.id === 'string' ? item.id : makeId(),
    name: String(item.name || '').trim() || 'Preset',
    settings,
  };
}

export function loadCustomPresets() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.map(sanitizePreset).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function persistCustomPresets(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // quota piena o storage disabilitato: i preset restano comunque in memoria
  }
}

/* ---------- orario ---------- */

// "2030-06-21 · 14:00" → minuti dalla mezzanotte; null se l'etichetta non ha l'ora
function labelMinutes(label) {
  const m = String(label).match(/(\d{1,2}):(\d{2})\s*$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

// Indice del passo temporale la cui ora del giorno è più vicina a hour ("HH:MM");
// a parità di distanza vince il primo (il primo giorno di simulazione).
export function nearestTimeIndex(labels, hour) {
  const target = labelMinutes(hour);
  if (target == null) return 0;
  let best = 0;
  let bestDist = Infinity;
  labels.forEach((label, i) => {
    const m = labelMinutes(label);
    if (m == null) return;
    const d = Math.abs(m - target);
    const dist = Math.min(d, 1440 - d);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  });
  return best;
}

/* ---------- fotografia dello stato corrente ---------- */

export function settingsFromState(state) {
  const s = {
    dataGroup: state.dataGroup,
    dataset: state.dataset,
    level: state.level,
    sectionX: state.sectionX,
    sectionY: state.sectionY,
    sectionAngle: state.sectionAngle,
    followTerrain: state.followTerrain,
    levelOut: state.levelOut,
    levelOutHeight: state.levelOutHeight,
    showWindField: state.showWindField,
    windStyle: state.windStyle,
    windOpacity: state.windOpacity,
    windSize: state.windSize,
    windDensity: state.windDensity,
    scaleType: state.scaleType,
    palette: state.palette,
    paletteReversed: state.paletteReversed,
    diffPalette: state.diffPalette,
    diffPaletteReversed: state.diffPaletteReversed,
  };
  const minutes = labelMinutes(state.seriesLabels[state.time] ?? '');
  if (minutes != null) s.hour = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  else s.timeIndex = state.time;
  return s;
}

/* ---------- export/import su file ---------- */

// Il file include anche le palette personalizzate usate dai preset, così un
// preset condiviso arriva completo dei suoi colori.
export function presetFilePayload(presets, customPalettes) {
  const usedIds = new Set(presets.flatMap((p) => [p.settings.palette, p.settings.diffPalette]));
  return JSON.stringify(
    {
      app: 'EnviReader',
      kind: 'presets',
      version: 1,
      presets: presets.map(({ name, settings }) => ({ name, settings })),
      palettes: customPalettes.filter((p) => usedIds.has(p.id)),
    },
    null,
    2,
  );
}

function sanitizeImportedPalette(item) {
  if (!item || typeof item.id !== 'string' || !Array.isArray(item.colors)) return null;
  const colors = item.colors.filter(isHex).map((c) => c.toLowerCase());
  if (colors.length < 2 || colors.length > 8) return null;
  return { id: item.id, name: String(item.name || '').trim() || 'Palette', colors };
}

// Vecchio formato ({ nome: { "Data group", "Data", time, colorPalette… } }):
// stessa semantica di allora, con le palette mappate sul catalogo C1..C62.
function convertOldPreset(name, p) {
  if (!p || typeof p !== 'object') return null;
  const raw = {
    dataGroup: p['Data group'],
    dataset: p['Data'],
    timeIndex: p.time,
    level: p.level,
    sectionX: p.sectionX,
    sectionY: p.sectionY,
    followTerrain: p.followTerrain,
    showWindField: p['Show Wind Field'],
    windOpacity: p.windOpacity,
    windSize: p.windSize,
    windDensity: p.windDensity,
    scaleType: p['Legend bounds'],
  };
  if (p.colorPalette?.number) raw.palette = `C${p.colorPalette.number}`;
  if (p.colorDiffPalette?.number) raw.diffPalette = `C${p.colorDiffPalette.number}`;
  return sanitizePreset({ name, settings: raw });
}

// Ritorna { presets, palettes } o null se il file non è riconosciuto.
export function parsePresetFile(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (data?.kind === 'presets' && Array.isArray(data.presets)) {
    const presets = data.presets.map(sanitizePreset).filter(Boolean);
    const palettes = Array.isArray(data.palettes) ? data.palettes.map(sanitizeImportedPalette).filter(Boolean) : [];
    return presets.length ? { presets, palettes } : null;
  }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const presets = Object.entries(data)
      .map(([name, p]) => convertOldPreset(name, p))
      .filter(Boolean);
    return presets.length ? { presets, palettes: [] } : null;
  }
  return null;
}
