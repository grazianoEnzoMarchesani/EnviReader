import { PRIVACY_UPDATED } from '../data/privacyText';

// Ricorda quale revisione dell'informativa l'utente ha già visto: al primo
// avvio, e ogni volta che il testo cambia, il pannello Privacy si apre da solo.
// Se lo storage è bloccato si riapre a ogni caricamento.
export const PRIVACY_SEEN_KEY = 'envireader.privacySeen.v1';

export function needsPrivacyNotice() {
  try {
    return localStorage.getItem(PRIVACY_SEEN_KEY) !== PRIVACY_UPDATED;
  } catch {
    return true;
  }
}

export function markPrivacySeen() {
  try {
    localStorage.setItem(PRIVACY_SEEN_KEY, PRIVACY_UPDATED);
  } catch {
    // storage bloccato: nessuna memoria della scelta
  }
}
