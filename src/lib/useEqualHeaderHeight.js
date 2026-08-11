import { useEffect } from 'react';

// Allinea l'altezza degli header delle card di una riga (chart-grid): quando
// la sottoriga di stats va a capo su alcune card ma non su altre (es. Diff
// con un testo più corto di A/B), senza questo hook la card più corta
// parte più in alto perché il suo header occupa meno spazio verticale.
// Misura l'altezza naturale dei figli di ogni header selezionato (non quella
// dell'header stesso, che una volta forzato dal min-height non rifletterebbe
// più il bisogno reale del contenuto) e la scrive come CSS var sul
// contenitore, cosicché tutti gli header condividano la stessa altezza minima.
export function useEqualHeaderHeight(containerRef, selector, varName, deps) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const measure = () => {
      const headers = container.querySelectorAll(selector);
      let max = 0;
      headers.forEach((header) => {
        const natural = Array.from(header.children).reduce(
          (sum, child) => sum + child.getBoundingClientRect().height,
          0,
        );
        if (natural > max) max = natural;
      });
      container.style.setProperty(varName, `${max}px`);
    };
    const observer = new ResizeObserver(measure);
    container.querySelectorAll(selector).forEach((header) => observer.observe(header));
    measure();
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
