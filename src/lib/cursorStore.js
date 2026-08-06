// Cursori di posizione: salvano il punto del mirino di sezione (sectionX,
// sectionY, sectionAngle, level) più la modalità "segui il terreno" attiva in
// quel momento (followTerrain, levelOutMode, levelOutHeight) — senza questi
// ultimi il livello salvato cambierebbe quota reale se richiamato con
// un'impostazione di terreno diversa da quella corrente. Non l'intera vista
// come i preset (vedi presetStore.js). Persistenza in localStorage, stesso
// pattern. Un cursore è { id, name, color, sectionX, sectionY, sectionAngle,
// level, followTerrain, levelOutMode, levelOutHeight }. `color` è opzionale
// (null finché l'utente non lo sceglie a mano): in assenza, il colore
// visualizzato ricade sulla terzina ciclica di cursorColor(), vedi
// effectiveCursorColor().

import { makeId, sanitizeName } from './paletteStore';

const STORAGE_KEY = 'envireader.positionCursors.v1';
const LEGACY_STORAGE_KEY = 'envireader.positionBookmarks.v1';

const INT_FIELDS = ['sectionX', 'sectionY', 'level', 'levelOutHeight'];
const LEVEL_OUT_MODES = ['off', 'levelOut', 'cascade'];

function sanitizeCursor(item) {
  if (!item || typeof item !== 'object') return null;
  const b = { id: typeof item.id === 'string' ? item.id : makeId(), name: sanitizeName(item.name).trim() || 'Cursore' };
  for (const k of INT_FIELDS) {
    const n = Number(item[k]);
    if (Number.isFinite(n)) b[k] = Math.round(n);
  }
  const angle = Number(item.sectionAngle);
  b.sectionAngle = Number.isFinite(angle) ? angle : 0;
  b.followTerrain = typeof item.followTerrain === 'boolean' ? item.followTerrain : true;
  b.levelOutMode = LEVEL_OUT_MODES.includes(item.levelOutMode) ? item.levelOutMode : 'cascade';
  if (b.levelOutHeight == null) b.levelOutHeight = 1;
  b.color = typeof item.color === 'string' && /^#[0-9a-f]{6}$/i.test(item.color) ? item.color : null;
  if (b.sectionX == null || b.sectionY == null || b.level == null) return null;
  return b;
}

// Migra i dati dalla vecchia chiave 'envireader.positionBookmarks.v1' (feature
// prima chiamata "bookmark") se la nuova chiave non è ancora popolata.
function migrateLegacyStorage() {
  try {
    if (localStorage.getItem(STORAGE_KEY) != null) return;
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy == null) return;
    localStorage.setItem(STORAGE_KEY, legacy);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // storage disabilitato: nessuna migrazione possibile, si riparte da vuoto
  }
}

export function loadPositionCursors() {
  try {
    migrateLegacyStorage();
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.map(sanitizeCursor).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function persistPositionCursors(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // quota piena o storage disabilitato: i cursori restano comunque in memoria
  }
}

// Colore per indice nella lista cursori: cicla sulla terzina --cursor-1/2/3
// (vedi tokens.css). Oltre 3 cursori i colori si ripetono, ma l'identità
// resta comunque affidata al nome, sempre visibile in legenda/tooltip/lista.
export function cursorColor(index) {
  return `var(--cursor-${(index % 3) + 1})`;
}

// Colore effettivo di un cursore: quello scelto a mano dall'utente se
// presente, altrimenti il colore ciclico per indice.
export function effectiveCursorColor(cursor, index) {
  return cursor.color || cursorColor(index);
}

// Equivalenti esadecimali (tema chiaro) della terzina --cursor-1/2/3, per
// dare un valore di partenza valido a <input type="color"> — che non accetta
// var(...) come value. Una volta scelto un colore dall'utente, questo hex
// diventa il valore permanente del cursore.
const DEFAULT_HEX = ['#7c4fd1', '#b83a8e', '#1a8f4c'];
export function cursorColorHex(index) {
  return DEFAULT_HEX[index % DEFAULT_HEX.length];
}

// ---------- export/import su file ----------

export function cursorFilePayload(list) {
  return JSON.stringify(
    {
      app: 'EnviReader',
      kind: 'cursors',
      version: 1,
      cursors: list.map(({ name, color, sectionX, sectionY, sectionAngle, level, followTerrain, levelOutMode, levelOutHeight }) => ({
        name,
        color,
        sectionX,
        sectionY,
        sectionAngle,
        level,
        followTerrain,
        levelOutMode,
        levelOutHeight,
      })),
    },
    null,
    2,
  );
}

export function parseCursorFile(text) {
  try {
    const data = JSON.parse(text);
    if (data?.kind !== 'cursors' || !Array.isArray(data.cursors)) return null;
    const items = data.cursors.map(sanitizeCursor).filter(Boolean);
    return items.length ? items : null;
  } catch {
    return null;
  }
}
