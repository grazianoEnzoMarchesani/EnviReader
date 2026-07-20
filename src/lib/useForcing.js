import { useEffect, useState } from 'react';
import { loadForcing } from './forcing';

// Condizioni al contorno del fileset (SIMX + eventuale FOX), con cache in loadForcing
export function useForcing(fileset, foxOverride = null) {
  const [forcing, setForcing] = useState(null);

  useEffect(() => {
    setForcing(null);
    if (!fileset) return;
    let cancelled = false;
    loadForcing(fileset, foxOverride)
      .then((result) => { if (!cancelled) setForcing(result); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [fileset, foxOverride]);

  return forcing;
}
