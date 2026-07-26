import { useEffect, useRef, useState } from 'react';

// Disposizione dei selettori di modalità (confronto, tipo di vista) nella
// view-bar, scelta misurando lo spazio davvero disponibile:
// 'inline'  -> affiancati, condividono la riga col pannello, ancorati a destra
// 'stacked' -> impilati (compatti), a destra: sulla riga del pannello se lo
//              spazio libero dopo di esso basta a contenerli anche solo
//              impilati, altrimenti scendono impilati su una riga propria
// 'wrapped' -> affiancati, ma solo quando anche impilati non condividerebbero
//              la riga col pannello: scendono su una riga propria, e siccome
//              lì hanno tutta la larghezza per stare in fila, tornano
//              affiancati, ancorati a sinistra
//
// `childSelector` seleziona gli elementi da misurare dentro il contenitore dei
// modi (i .segmented in Analisi, i figli diretti nel 3D, dove un gruppo può
// contenere anche un toggle); `deps` sono i cambi di stato che alterano la
// larghezza dei controlli e impongono una nuova misura.
// Ritorna { modesLayout, topRef, panelRef, modesRef }: i tre ref vanno messi
// sulla riga superiore, sul pannello dei controlli e sul gruppo dei modi.
const MODES_GAP = 12;
const PANEL_MARGIN = 16;

export function useModesLayout(childSelector, deps) {
  const topRef = useRef(null);
  const panelRef = useRef(null);
  const modesRef = useRef(null);
  const [modesLayout, setModesLayout] = useState('stacked');

  useEffect(() => {
    const topEl = topRef.current;
    const panelEl = panelRef.current;
    const modesEl = modesRef.current;
    if (!topEl || !panelEl || !modesEl) return undefined;
    const measure = () => {
      const items = childSelector ? modesEl.querySelectorAll(childSelector) : modesEl.children;
      const widths = Array.from(items).map((el) => el.getBoundingClientRect().width);
      const unstackedWidth = widths.reduce((sum, w) => sum + w, 0) + MODES_GAP * (widths.length - 1);
      const stackedWidth = Math.max(0, ...widths);
      const topWidth = topEl.getBoundingClientRect().width;
      const leftover = topWidth - panelEl.getBoundingClientRect().width - PANEL_MARGIN;
      if (unstackedWidth <= leftover) setModesLayout('inline');
      else if (stackedWidth > leftover && unstackedWidth <= topWidth) setModesLayout('wrapped');
      else setModesLayout('stacked');
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(topEl);
    observer.observe(panelEl);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { modesLayout, topRef, panelRef, modesRef };
}
