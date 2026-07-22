// Collega il percorso solare del modello 3D alla sequenza reale dei timestep
// dei risultati (state.seriesLabels, la stessa serie dello slider dell'Analisi
// e dei widget calendario/orologio): ogni timestep porta già la propria data e
// ora esatta letta dal nome file EDT/EDX (vedi seriesLabel in envimet.js), quindi
// non si sintetizza alcun "giorno tipo" di 24h. Una simulazione può iniziare a
// qualsiasi ora e durare più giorni: scorrendo lo slider si avanza timestep per
// timestep nell'ordine del file, attraversando i cambi di giorno quando ci sono.
//
// Senza un fileset con risultati caricato non esiste una sequenza reale da
// leggere: si ripiega su un'unica giornata odierna esplorabile con un cursore
// ora-del-giorno (0-24h), utile per un'anteprima rapida sulla sola geometria INX.

// "2023-06-21 · 14:00" (formato di seriesLabel in envimet.js) → { date, hour } | null
export function parseSeriesLabel(label) {
  const match = label?.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s*·\s*(\d{2}):(\d{2}))?/);
  if (!match) return null;
  const [, y, m, d, hh, mm] = match;
  return {
    date: new Date(Number(y), Number(m) - 1, Number(d)),
    hour: hh != null ? Number(hh) + Number(mm) / 60 : 12,
  };
}

// Campione solare corrente: legge alla lettera il timestep dei risultati
// (index = state.time, lo stesso slider del timer usato nell'Analisi), oppure
// "adesso" come singola giornata di anteprima se non ci sono risultati.
export function getSunSample(state) {
  const labels = state.seriesLabels;
  if (labels?.length) {
    const max = labels.length - 1;
    const index = Math.max(0, Math.min(state.time, max));
    const parsed = parseSeriesLabel(labels[index]);
    if (parsed) {
      return {
        ...parsed,
        hasSeries: true,
        index,
        count: labels.length,
        label: labels[index],
      };
    }
  }
  const now = new Date();
  return {
    date: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    hour: now.getHours() + now.getMinutes() / 60,
    hasSeries: false,
    index: 0,
    count: 0,
    label: null,
  };
}

export function formatDateLabel(date) {
  return date.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatHourLabel(hour) {
  const wrapped = ((hour % 24) + 24) % 24;
  const h = Math.floor(wrapped);
  const m = Math.round((wrapped - h) * 60) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
