import { useEffect, useRef, useState } from 'react';

// Deve combaciare con la durata di uscita definita in app.css (.modal-backdrop.is-closing).
const EXIT_MS = 200;

// I modali si aprono/chiudono con un semplice "if (!x) return null": React
// smonta il nodo nello stesso istante in cui lo stato passa a null, quindi
// non c'è tempo per un'animazione di uscita via CSS. Questo hook tiene il
// modale montato per la durata dell'animazione e congela l'ultimo valore
// "aperto" (utile quando il chiamante azzera i dati insieme al flag di
// apertura, es. { customRangeModal: null }).
export function useModalTransition(value) {
  const [snapshot, setSnapshot] = useState(value);
  const [closing, setClosing] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (value) {
      clearTimeout(timerRef.current);
      setClosing(false);
      setSnapshot(value);
    } else if (snapshot) {
      setClosing(true);
      timerRef.current = setTimeout(() => {
        setSnapshot(null);
        setClosing(false);
      }, EXIT_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return { data: snapshot, closing };
}
