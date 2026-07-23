import { useEffect, useState } from 'react';

// Ritarda la propagazione di un valore che cambia rapidamente (es. lo slider
// del tempo trascinato dall'utente): restituisce l'ultimo valore stabile,
// aggiornato solo delayMs dopo l'ultimo cambiamento. Usato dal campo di vento
// volumetrico 3D per evitare di ricaricare/ritracciare l'intero volume ad
// ogni tick intermedio del trascinamento (operazione pesante), rifacendolo
// una sola volta quando l'utente si ferma.
// `bypass` disattiva il debounce e propaga il valore a ogni cambiamento: usato
// durante il play automatico, dove i tick del TimePlayer a 5x/10x sono più
// ravvicinati della finestra di debounce e la resetterebbero all'infinito,
// impedendo al vento volumetrico di aggiornarsi mai (si veda useWindVolumeCells).
export function useDebouncedValue(value, delayMs, bypass = false) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    if (bypass) {
      setDebounced(value);
      return undefined;
    }
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs, bypass]);

  return bypass ? value : debounced;
}
