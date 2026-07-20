import { useEffect, useState } from 'react';
import { getFilesInFolder, getFileCoupleSeries, readEDX, loadSlice, loadPointSeries, findWindVariables, sectionLinePath } from './envimet';
import { findInxFile, readInxRotation } from './inx';

const clamp = (v, max) => Math.min(Math.max(0, v), Math.max(0, max));

// Config di estrazione per la vista corrente. Con un angolo di sezione ≠ 0 le
// sezioni campionano lungo la traccia ruotata (sempre passante per il perno
// sectionX/sectionY); la pianta non dipende mai dall'angolo.
// terrain è la quota di taglio già pronta (terrainCut in envimet.js) o null:
// calcolata una volta a monte, i cicli di estrazione non fanno alcuna scelta
function sliceConfig(viewType, dims, level, sectionX, sectionY, angle, terrain) {
  if (viewType === 'sectionX' || viewType === 'sectionY') {
    if (angle) {
      return { line: sectionLinePath(dims, clamp(sectionX, dims.x - 1), clamp(sectionY, dims.y - 1), angle, viewType) };
    }
    return viewType === 'sectionX' ? { sectionX: clamp(sectionX, dims.x - 1) } : { sectionY: clamp(sectionY, dims.y - 1) };
  }
  return { level: clamp(level, dims.z - 1), terrain };
}

// Carica in modo asincrono lo slice corrente (pianta o sezione) di un fileset.
export function useSlice(fileset, groupPath, variableName, timeIndex, viewType, level, sectionX, sectionY, sectionAngle, terrain) {
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
        const config = sliceConfig(viewType, edx.dimensions, level, sectionX, sectionY, angle, terrain);
        const result = await loadSlice(pair.EDT, edx, variableName, config);
        if (alive) setSlice(result);
      } catch (err) {
        console.error('Errore nel caricamento dello slice:', err);
        if (alive) setSlice(null);
      }
    })();
    return () => { alive = false; };
  }, [fileset, groupPath, variableName, timeIndex, viewType, level, sectionX, sectionY, angle, terrain]);

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
        if (alive) setWind({ u: horiz.data, v: vert.data, w: horiz.w, h: horiz.h, maxMag });
      } catch (err) {
        console.error('Errore nel caricamento del campo di vento:', err);
        if (alive) setWind(null);
      }
    })();
    return () => { alive = false; };
  }, [enabled, fileset, groupPath, timeIndex, viewType, level, sectionX, sectionY, angle, terrain]);

  return wind;
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
