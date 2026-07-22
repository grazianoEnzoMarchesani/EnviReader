import { useEffect, useState } from 'react';

// Ritarda la propagazione di un valore che cambia rapidamente (es. lo slider
// del tempo trascinato dall'utente): restituisce l'ultimo valore stabile,
// aggiornato solo delayMs dopo l'ultimo cambiamento. Usato dal campo di vento
// volumetrico 3D per evitare di ricaricare/ritracciare l'intero volume ad
// ogni tick intermedio del trascinamento (operazione pesante), rifacendolo
// una sola volta quando l'utente si ferma.
export function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
