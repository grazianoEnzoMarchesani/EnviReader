// Etichette condivise dalle tre viste (Analisi 2D, modello 3D, condizioni al
// contorno): la stessa dicitura dello stesso dato deve comparire identica
// ovunque, quindi vive qui una volta sola invece che in ogni vista.

// "Fileset A · nomeSimulazione" (il prefisso A/B resta: serve a leggere A − B).
// Senza fileset aperto resta la sola dicitura "Fileset A".
export function filesetLabel(state, tr, key) {
  const fs = state[`fileset${key}`];
  const name = fs?.name ?? fs?.rootDir;
  const base = tr(key === 'A' ? 'chart_fileset_a' : 'chart_fileset_b');
  return name ? `${base} · ${name}` : base;
}

// Data/ora dell'istante corrente, come la scrivono i badge calendario/orologio:
// l'etichetta reale del passo temporale dei risultati (vedi seriesLabel in
// envimet.js) oppure, senza serie caricata, un ripiego a quarti d'ora
// sull'indice dello slider.
export function timeLabel(state) {
  const label = state.seriesLabels[state.time];
  if (label != null) return label;
  const h = String(Math.floor(state.time / 4)).padStart(2, '0');
  const m = String((state.time % 4) * 15).padStart(2, '0');
  return `t · ${h}:${m}`;
}
