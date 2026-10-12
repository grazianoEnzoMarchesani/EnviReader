import { useSyncExternalStore } from 'react';

// Consenso a caricare lo sfondo del Web GIS da un servizio esterno (tile
// OpenFreeMap). Finché non è concesso l'app non fa nessuna richiesta a terzi. La scelta resta in localStorage per sei mesi.
// Se la sezione "dati memorizzati" dell'informativa (src/data/privacyText.js)
// cambia, cambiala nello stesso commit.

export const MAP_CONSENT_KEY = 'envireader.mapConsent.v1';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 183;

const read = () => {
  try {
    const raw = window.localStorage.getItem(MAP_CONSENT_KEY);
    if (!raw) return 'unset';
    const { value, at } = JSON.parse(raw);
    if ((value !== 'granted' && value !== 'denied') || !(Date.now() - at <= MAX_AGE_MS)) return 'unset';
    return value;
  } catch {
    return 'unset';
  }
};

let current = read();
const listeners = new Set();

export function setMapConsent(value) {
  current = value === 'granted' ? 'granted' : value === 'denied' ? 'denied' : 'unset';
  try {
    if (current === 'unset') window.localStorage.removeItem(MAP_CONSENT_KEY);
    else window.localStorage.setItem(MAP_CONSENT_KEY, JSON.stringify({ value: current, at: Date.now() }));
  } catch {
    // storage bloccato: la scelta vale comunque finché la scheda resta aperta
  }
  listeners.forEach((l) => l());
}

// Chiamata dal pulsante "cancella i dati" dell'informativa, dopo aver svuotato lo storage
export function resetMapConsent() {
  current = 'unset';
  listeners.forEach((l) => l());
}

export function useMapConsent() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => current,
  );
}
