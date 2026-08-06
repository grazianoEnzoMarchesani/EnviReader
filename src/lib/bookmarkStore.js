// Bookmark di posizione: salvano solo il punto del mirino di sezione
// (sectionX, sectionY, sectionAngle, level), non l'intera vista come i preset
// (vedi presetStore.js). Persistenza in localStorage, stesso pattern.
// Un bookmark è { id, name, sectionX, sectionY, sectionAngle, level }.

import { makeId } from './paletteStore';

const STORAGE_KEY = 'envireader.positionBookmarks.v1';

const INT_FIELDS = ['sectionX', 'sectionY', 'level'];

function sanitizeBookmark(item) {
  if (!item || typeof item !== 'object') return null;
  const b = { id: typeof item.id === 'string' ? item.id : makeId(), name: String(item.name || '').trim() || 'Bookmark' };
  for (const k of INT_FIELDS) {
    const n = Number(item[k]);
    if (Number.isFinite(n)) b[k] = Math.round(n);
  }
  const angle = Number(item.sectionAngle);
  b.sectionAngle = Number.isFinite(angle) ? angle : 0;
  if (b.sectionX == null || b.sectionY == null || b.level == null) return null;
  return b;
}

export function loadPositionBookmarks() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.map(sanitizeBookmark).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function persistPositionBookmarks(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // quota piena o storage disabilitato: i bookmark restano comunque in memoria
  }
}

// Colore per indice nella lista bookmark: cicla sulla terzina --bookmark-1/2/3
// (vedi tokens.css). Oltre 3 bookmark i colori si ripetono, ma l'identità
// resta comunque affidata al nome, sempre visibile in legenda/tooltip/lista.
export function bookmarkColor(index) {
  return `var(--bookmark-${(index % 3) + 1})`;
}
