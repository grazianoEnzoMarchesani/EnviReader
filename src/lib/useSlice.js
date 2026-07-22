import { useEffect, useMemo, useRef, useState } from 'react';
import { getFilesInFolder, getFileCoupleSeries, readEDX, loadSlice, loadPointSeries, findWindVariables, sectionLinePath, terrainCut } from './envimet';
import { findInxFile, readInxRotation } from './inx';

const clamp = (v, max) => Math.min(Math.max(0, v), Math.max(0, max));

// Config di estrazione per la vista corrente. Con un angolo di sezione ≠ 0 le
// sezioni campionano lungo la traccia ruotata (sempre passante per il perno
// sectionX/sectionY); la pianta non dipende mai dall'angolo.
// terrain è la quota di taglio già pronta (terrainCut in envimet.js) o null:
// calcolata una volta a monte, i cicli di estrazione non fanno alcuna scelta.
// biometFix attiva, solo nelle sezioni, il fix del bug biomet (vedi
// extractSlice in envimet.js): true quando l'utente lo ha acceso e il
// dataset corrente è un output biomet.
function sliceConfig(viewType, dims, level, sectionX, sectionY, angle, terrain, biometFix) {
  if (viewType === 'sectionX' || viewType === 'sectionY') {
    if (angle) {
      return { line: sectionLinePath(dims, clamp(sectionX, dims.x - 1), clamp(sectionY, dims.y - 1), angle, viewType), biometFix };
    }
    return viewType === 'sectionX'
      ? { sectionX: clamp(sectionX, dims.x - 1), biometFix }
      : { sectionY: clamp(sectionY, dims.y - 1), biometFix };
  }
  return { level: clamp(level, dims.z - 1), terrain };
}

// Le tre viste (pianta, sezione X, sezione Y) di un fileset in un colpo solo:
// usata sia dalla vista 2D (le card A/B/Diff) sia dal viewer 3D (overlay voxel).
export function useSlices(fileset, group, dataset, time, level, sectionX, sectionY, sectionAngle, terrain, biometFix) {
  return {
    plan: useSlice(fileset, group, dataset, time, 'plan', level, sectionX, sectionY, sectionAngle, terrain, biometFix),
    sectionX: useSlice(fileset, group, dataset, time, 'sectionX', level, sectionX, sectionY, sectionAngle, terrain, biometFix),
    sectionY: useSlice(fileset, group, dataset, time, 'sectionY', level, sectionX, sectionY, sectionAngle, terrain, biometFix),
  };
}

// Carica in modo asincrono lo slice corrente (pianta o sezione) di un fileset.
export function useSlice(fileset, groupPath, variableName, timeIndex, viewType, level, sectionX, sectionY, sectionAngle, terrain, biometFix) {
  const [slice, setSlice] = useState(null);
  // la pianta ignora l'angolo: evita di ricaricarla mentre si ruota la sezione
  const angle = viewType === 'plan' ? 0 : sectionAngle || 0;

  useEffect(() => {
    if (!fileset || groupPath == null || !variableName) {
      setSlice(null);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const series = getFileCoupleSeries(getFilesInFolder(fileset.structure, groupPath));
        if (!series.length) {
          if (alive) setSlice(null);
          return;
        }
        const pair = series[clamp(timeIndex, series.length - 1)];
        const edx = await readEDX(pair.EDX);
        const config = sliceConfig(viewType, edx.dimensions, level, sectionX, sectionY, angle, terrain, biometFix);
        const result = await loadSlice(pair.EDT, edx, variableName, config);
        if (alive) setSlice(result);
      } catch (err) {
        console.error('Errore nel caricamento dello slice:', err);
        if (alive) setSlice(null);
      }
    })();
    return () => { alive = false; };
  }, [fileset, groupPath, variableName, timeIndex, viewType, level, sectionX, sectionY, angle, terrain, biometFix]);

  return slice;
}

// Componenti del vento proiettate sul piano dello slice corrente:
// pianta → (u, v), sezione X (piano y-z) → (v, w), sezione Y (piano x-z) → (u, w).
const WIND_PLANE = { plan: ['u', 'v'], sectionX: ['v', 'w'], sectionY: ['u', 'w'] };

// Carica il campo di vento per la vista corrente: { u, v, w, h, maxMag } dove
// u è la componente orizzontale nel piano e v quella verticale (positiva verso
// l'alto della griglia). null se disabilitato o senza variabili Flow u/v/w.
export function useWindField(enabled, fileset, groupPath, timeIndex, viewType, level, sectionX, sectionY, sectionAngle, terrain) {
  const [wind, setWind] = useState(null);
  const angle = viewType === 'plan' ? 0 : sectionAngle || 0;

  useEffect(() => {
    if (!enabled || !fileset || groupPath == null) {
      setWind(null);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const series = getFileCoupleSeries(getFilesInFolder(fileset.structure, groupPath));
        if (!series.length) {
          if (alive) setWind(null);
          return;
        }
        const pair = series[clamp(timeIndex, series.length - 1)];
        const edx = await readEDX(pair.EDX);
        const names = findWindVariables(edx.variableNames);
        if (!names) {
          if (alive) setWind(null);
          return;
        }
        const config = sliceConfig(viewType, edx.dimensions, level, sectionX, sectionY, angle, terrain);
        let horiz, vert;
        if (config.line) {
          // sezione ruotata: componente orizzontale = proiezione di (u, v)
          // sulla direzione della traccia, componente verticale = w
          const [su, sv, sw] = await Promise.all(
            [names.u, names.v, names.w].map((name) => loadSlice(pair.EDT, edx, name, config)),
          );
          if (!su || !sv || !sw) {
            if (alive) setWind(null);
            return;
          }
          const data = new Float32Array(su.data.length);
          for (let i = 0; i < data.length; i++) data[i] = su.data[i] * config.line.dx + sv.data[i] * config.line.dy;
          horiz = { ...su, data };
          vert = sw;
        } else {
          const [horizName, vertName] = WIND_PLANE[viewType] ?? WIND_PLANE.plan;
          [horiz, vert] = await Promise.all([
            loadSlice(pair.EDT, edx, names[horizName], config),
            loadSlice(pair.EDT, edx, names[vertName], config),
          ]);
        }
        if (!horiz || !vert) {
          if (alive) setWind(null);
          return;
        }
        let maxMag = 0;
        for (let i = 0; i < horiz.data.length; i++) {
          const mag = Math.hypot(horiz.data[i], vert.data[i]);
          if (mag > maxMag) maxMag = mag;
        }
        if (alive) setWind({ u: horiz.data, v: vert.data, w: horiz.w, h: horiz.h, maxMag, line: horiz.line ?? null });
      } catch (err) {
        console.error('Errore nel caricamento del campo di vento:', err);
        if (alive) setWind(null);
      }
    })();
    return () => { alive = false; };
  }, [enabled, fileset, groupPath, timeIndex, viewType, level, sectionX, sectionY, angle, terrain]);

  return wind;
}

// Le tre viste (pianta, sezione X, sezione Y) del campo di vento di un
// fileset in un colpo solo: usata sia dalla vista 2D (le card A/B/Diff) sia
// dal viewer 3D (vento disegnato sulle fette già posizionate nel modello).
export function useWindFields(enabled, fileset, group, time, level, sectionX, sectionY, sectionAngle, terrain) {
  return {
    plan: useWindField(enabled, fileset, group, time, 'plan', level, sectionX, sectionY, sectionAngle, terrain),
    sectionX: useWindField(enabled, fileset, group, time, 'sectionX', level, sectionX, sectionY, sectionAngle, terrain),
    sectionY: useWindField(enabled, fileset, group, time, 'sectionY', level, sectionX, sectionY, sectionAngle, terrain),
  };
}

// Contatore globale di richieste al worker del vento volumetrico: ogni
// richiesta ha un id crescente, così una risposta che arriva "in ritardo" (il
// worker era ancora a metà del calcolo precedente quando ne è partito uno
// nuovo) si riconosce confrontando l'id con l'ultimo inviato e si scarta,
// invece di sovrascrivere un risultato più recente con uno superato.
let windVolumeRequestId = 0;

// Calcola in un Web Worker dedicato (windVolumeWorker.js) le celle
// (frecce/segmenti streamline) del campo di vento volumetrico 3D: a
// differenza di useWindField (una sola fetta 2D alla volta, sul thread
// principale) qui il lavoro — caricare l'intero volume (u, v, w) e tracciare
// le streamline in 3D — è pesante, quindi gira fuori dal thread della UI, che
// resta reattivo (camera, controlli) anche mentre il worker calcola. Un
// worker per istanza dell'hook (quindi uno per fileset A, uno per B): nasce
// alla prima richiesta utile e vive finché il componente resta montato.
// Ritorna { cells, loading }: `loading` è true dall'invio della richiesta al
// worker fino alla risposta (o all'errore), usato in ModelView.jsx per
// mostrare un indicatore di caricamento sul toggle "Wind volume" — il vento
// già disegnato resta visibile nel frattempo (`cells` non viene azzerato
// all'invio di una nuova richiesta), quindi `loading` serve solo a far capire
// che quello a schermo sta per essere aggiornato, non a nasconderlo.
export function useWindVolumeCells(enabled, fileset, groupPath, timeIndex, geometry, spacingZ, style, size, density) {
  const [cells, setCells] = useState(null);
  const [loading, setLoading] = useState(false);
  const workerRef = useRef(null);
  const latestIdRef = useRef(0);

  // Il worker termina solo allo smontaggio: ricrearlo ad ogni richiesta
  // costerebbe di più del tenerlo vivo, e le richieste successive lo trovano
  // già pronto.
  useEffect(() => () => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  useEffect(() => {
    if (!enabled || !fileset?.structure || groupPath == null || !geometry) {
      // Invalida l'id "corrente": se una risposta del worker per una
      // richiesta precedente arriva dopo che l'utente ha spento il vento
      // volumetrico, va comunque ignorata (l'id 0 non corrisponde a nessuna
      // richiesta reale, essendo windVolumeRequestId incrementato da 1 in su).
      latestIdRef.current = 0;
      setCells(null);
      setLoading(false);
      return undefined;
    }
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('./windVolumeWorker.js', import.meta.url), { type: 'module' });
    }
    const worker = workerRef.current;
    const requestId = ++windVolumeRequestId;
    latestIdRef.current = requestId;
    setLoading(true);

    const onMessage = (e) => {
      if (e.data.requestId !== latestIdRef.current) return; // risposta superata da una richiesta più recente
      setLoading(false);
      if (e.data.error) {
        console.error('Errore nel calcolo del vento volumetrico:', e.data.error);
        setCells(null);
        return;
      }
      setCells(e.data.empty ? null : { arrowCells: e.data.arrowCells, segCells: e.data.segCells, headCells: e.data.headCells });
    };
    worker.addEventListener('message', onMessage);
    worker.postMessage({ requestId, structure: fileset.structure, groupPath, timeIndex, geometry, spacingZ, style, size, density });

    return () => worker.removeEventListener('message', onMessage);
  }, [enabled, fileset, groupPath, timeIndex, geometry, spacingZ, style, size, density]);

  return { cells, loading };
}

// Rotazione del modello (modelRotation dell'INX in inputData) per orientare
// il simbolo del nord sulle piante; null finché non è nota o senza INX.
export function useInxRotation(fileset) {
  const [rotation, setRotation] = useState(null);

  useEffect(() => {
    setRotation(null);
    if (!fileset?.structure) return;
    const file = findInxFile(fileset.structure);
    if (!file) return;
    let alive = true;
    readInxRotation(file)
      .then((value) => { if (alive) setRotation(value); })
      .catch(() => {});
    return () => { alive = false; };
  }, [fileset]);

  return rotation;
}

// Quota di taglio "segui il terreno" (con l'eventuale "livella salendo") di un
// fileset: memoizzata così i suoi coefficienti si calcolano una volta sola e
// gli hook a valle ricaricano solo quando cambia davvero qualcosa
export function useTerrainCut(terrain, state) {
  const { followTerrain, level, levelOut, levelOutHeight } = state;
  return useMemo(
    () => (followTerrain ? terrainCut(terrain, level, levelOut, levelOutHeight) : null),
    [terrain, followTerrain, level, levelOut, levelOutHeight],
  );
}

// Andamento nel tempo del valore nel punto (sectionX, sectionY) al livello corrente
export function usePointSeries(fileset, groupPath, variableName, sectionX, sectionY, level, terrain) {
  const [values, setValues] = useState(null);

  useEffect(() => {
    if (!fileset || groupPath == null || !variableName) {
      setValues(null);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const series = getFileCoupleSeries(getFilesInFolder(fileset.structure, groupPath));
        if (!series.length) {
          if (alive) setValues(null);
          return;
        }
        const config = { x: Math.max(0, sectionX), y: Math.max(0, sectionY), level: Math.max(0, level), terrain };
        const result = await loadPointSeries(series, variableName, config);
        if (alive) setValues(result);
      } catch (err) {
        console.error('Errore nel caricamento della serie temporale:', err);
        if (alive) setValues(null);
      }
    })();
    return () => { alive = false; };
  }, [fileset, groupPath, variableName, sectionX, sectionY, level, terrain]);

  return values;
}
