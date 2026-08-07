import { useEffect, useRef, useState } from 'react';
import { formatValue, legendTickValues, CONTOUR_BANDS } from '../lib/colormap';

// Spaziatura minima (px) tra due etichette di tick centrate, sotto la quale
// il testo si tocca ed è illeggibile (misurata: "30.30" in mono 8.5px ≈ 26px
// di larghezza, serve margine).
const MIN_TICK_SPACING_PX = 34;

// font-size base di .map-legend-label (vedi app.css): usata per calcolare la
// dimensione reale in px quando textScale la ingrandisce (serve il valore in
// px, non "em"/CSS var, per tenerla in sync con MIN_TICK_SPACING_PX sopra).
const LABEL_BASE_PX = 10.5;

function divisorsOf(n) {
  const out = [];
  for (let i = 1; i <= n; i++) if (n % i === 0) out.push(i);
  return out;
}
// Passi possibili tra i CONTOUR_BANDS confini di fascia: solo i divisori,
// così i tick mostrati restano sempre un sottoinsieme simmetrico degli
// stessi confini (mai valori "storti" fuori dalla griglia del contour).
const STEP_CANDIDATES = divisorsOf(CONTOUR_BANDS);

// Sceglie, tra i divisori di CONTOUR_BANDS, il passo più fitto (più
// etichette) che la larghezza reale della barra riesce comunque a mostrare
// con una spaziatura leggibile: una card stretta (compare mode, export a
// colonne) mostra meno numeri di una card larga, invece di sovrapporli.
// textScale ingrandisce solo il testo (via CSS transform, vedi sotto): la
// soglia di spaziatura minima cresce di pari passo, così un testo più grande
// fa scartare più tick invece di sovrapporsi.
function pickStep(barWidthPx, textScale) {
  if (!barWidthPx) return CONTOUR_BANDS;
  const bandWidth = barWidthPx / CONTOUR_BANDS;
  const minSpacing = MIN_TICK_SPACING_PX * textScale;
  for (const step of STEP_CANDIDATES) {
    if (step * bandWidth >= minSpacing) return step;
  }
  return CONTOUR_BANDS;
}

// Legenda orizzontale condivisa dalle viste principali (mappa 2D, overlay 3D,
// WebGIS). Normalmente min/max sono le due sole etichette, affiancate alla
// barra. Con showTicks attivo (opzione avanzata in ViewSettingsModal) min e
// max diventano il primo e l'ultimo punto della STESSA fila di tick invece di
// stare fuori dalla barra con una spaziatura propria: così restano alla
// stessa cadenza degli intermedi invece di sembrare due etichette a parte.
// Le posizioni coincidono con i confini di fascia del filled contour (vedi
// legendTickValues/CONTOUR_BANDS in colormap.js): in modalità 'contour'
// combaciano con le isolinee disegnate sulla mappa, in 'pixel'/'vector'
// restano comunque punti di lettura utili sul gradiente continuo.
// Non usata nelle miniature (thumb): lì la legenda resta sempre min/max.
//
// Il wrapper della barra (ref) resta SEMPRE lo stesso nodo DOM (un solo
// return, niente rami JSX alternativi): l'osservatore di resize deve poter
// continuare a misurarlo anche quando hasTicks passa da false a true al
// primo giro (larghezza 0 -> reale), altrimenti resterebbe agganciato a un
// nodo smontato e la fila di tick non comparirebbe mai.
// textScale (%, 100..200 da ViewSettingsModal) ingrandisce il testo delle
// etichette senza mai far sforare la legenda dallo spazio della card:
// - min/max (nessun tick): font-size reale, non transform. Le due etichette
//   sono dentro lo stesso flex della barra (che è flex: 1), quindi un
//   font-size più grande fa crescere il loro box e la barra si restringe di
//   conseguenza — la riga intera resta larga uguale (100% della card), non
//   sfora mai. Con transform: scale() il box sarebbe rimasto piccolo e il
//   testo sarebbe cresciuto "sopra" senza far posto, uscendo dalla card.
// - tick intermedi: restano con transform: scale(), perché la loro riga è in
//   position: absolute (fuori dal flusso, non partecipa al flex) e non ha
//   comunque bisogno di riservare spazio nella card: qui serve solo evitare
//   sovrapposizioni fra tick vicini, già gestito da pickStep con una soglia
//   di spaziatura proporzionale a textScale.
export default function LegendBar({ min, max, gradient, showTicks, onClick, textScale = 100 }) {
  const wrapRef = useRef(null);
  const [barWidth, setBarWidth] = useState(0);
  const scale = (textScale || 100) / 100;

  useEffect(() => {
    if (!showTicks) return;
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setBarWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, [showTicks]);

  const span = max - min;
  const step = showTicks ? pickStep(barWidth, scale) : CONTOUR_BANDS;
  const ticks = showTicks
    ? legendTickValues(min, max).map((v, idx) => ({ v, idx })).filter(({ idx }) => idx % step === 0)
    : [];
  // Sotto i due estremi non c'è nessun intermedio da mostrare (card troppo
  // stretta): la legenda torna al semplice min/max fuori dalla barra.
  const hasTicks = ticks.length > 2;

  return (
    <button type="button" className={`map-legend${hasTicks ? ' has-ticks' : ''}`} onClick={onClick}>
      {!hasTicks && (
        <span className="map-legend-label" style={{ fontSize: `${LABEL_BASE_PX * scale}px` }}>
          {formatValue(min, span)}
        </span>
      )}
      <span className="map-legend-bar-wrap" ref={wrapRef}>
        <span className="map-legend-bar" style={{ background: gradient }} />
        {hasTicks && (
          <span className="map-legend-ticks">
            {ticks.map(({ v, idx }) => {
              const isEdge = idx === 0 || idx === CONTOUR_BANDS;
              const edgeOrigin = idx === 0 ? 'left top' : idx === CONTOUR_BANDS ? 'right top' : 'center top';
              const edgeTransform = idx === 0 ? `scale(${scale})` : idx === CONTOUR_BANDS ? `translateX(-100%) scale(${scale})` : `translateX(-50%) scale(${scale})`;
              return (
                <span
                  key={idx}
                  className={`map-legend-tick${isEdge ? ' map-legend-tick-edge' : ''}`}
                  style={{ left: `${(idx / CONTOUR_BANDS) * 100}%`, transform: edgeTransform, transformOrigin: edgeOrigin }}
                >
                  {formatValue(v, span)}
                </span>
              );
            })}
          </span>
        )}
      </span>
      {!hasTicks && (
        <span className="map-legend-label" style={{ fontSize: `${LABEL_BASE_PX * scale}px` }}>
          {formatValue(max, span)}
        </span>
      )}
    </button>
  );
}
