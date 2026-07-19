import { useLayoutEffect, useRef } from 'react';

// Animazione FLIP: dopo ogni render confronta posizione e dimensione dei figli
// diretti del contenitore con quelle del render precedente e anima la
// differenza via transform. Il layout vero cambia subito (niente scroll
// laterale, niente conflitti col riflusso), è solo il movimento a essere
// animato. I figli vanno marcati con data-flip-key.
export function useFlip({ duration = 380, easing = 'cubic-bezier(0.22, 1, 0.36, 1)' } = {}) {
  const containerRef = useRef(null);
  const prevRects = useRef(new Map());

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const children = Array.from(container.children).filter((el) => el.dataset.flipKey);

    // annulla le animazioni in corso, così le misure sono sul layout reale
    children.forEach((el) => el.getAnimations().forEach((a) => a.cancel()));

    // coordinate relative al contenitore: immuni allo scroll di pagina
    const origin = container.getBoundingClientRect();
    const next = new Map();
    children.forEach((el) => {
      const r = el.getBoundingClientRect();
      next.set(el.dataset.flipKey, {
        left: r.left - origin.left,
        top: r.top - origin.top,
        width: r.width,
        height: r.height,
      });
    });

    children.forEach((el) => {
      const before = prevRects.current.get(el.dataset.flipKey);
      const after = next.get(el.dataset.flipKey);
      if (!before) {
        // card appena comparsa (es. cambio modalità confronto): dissolvenza
        if (prevRects.current.size) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration, easing });
        return;
      }
      const dx = before.left - after.left;
      const dy = before.top - after.top;
      const sx = after.width ? before.width / after.width : 1;
      const sy = after.height ? before.height / after.height : 1;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(sx - 1) < 0.003 && Math.abs(sy - 1) < 0.003) return;
      el.animate(
        [
          { transformOrigin: '0 0', transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
          { transformOrigin: '0 0', transform: 'none' },
        ],
        { duration, easing }
      );
    });

    prevRects.current = next;
  });

  return containerRef;
}
