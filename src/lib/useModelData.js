// Hook di caricamento/composizione del modello INX condivisi tra la vista 3D
// (ModelView) e la vista WebGIS (WebGisView): estratti qui per essere usati
// da entrambe senza duplicare la logica di parsing/overlay.
import { useEffect, useMemo, useState } from 'react';
import { findInxFile, readINX } from './inx';
import { loadObjectsVolume } from './envimet';

// Carica e parsa l'INX (inputData/*.INX) del fileset, se presente
export function useInxModel(fileset) {
  const [loaded, setLoaded] = useState(null); // { model, fileName }
  useEffect(() => {
    setLoaded(null);
    const structure = fileset?.structure;
    if (!structure) return;
    const file = findInxFile(structure);
    if (!file) return;
    let cancelled = false;
    readINX(file)
      .then((model) => { if (!cancelled) setLoaded({ model, fileName: file.name }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [fileset]);
  return loaded;
}

// Volume "Objects" (EDT/EDX) del fileset per la vegetazione 3D, se ci sono risultati
export function useObjectsVolume(fileset) {
  const [volume, setVolume] = useState(null);
  useEffect(() => {
    setVolume(null);
    const structure = fileset?.structure;
    if (!structure) return;
    let cancelled = false;
    loadObjectsVolume(structure)
      .then((v) => { if (!cancelled) setVolume(v); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [fileset]);
  return volume;
}

// Confeziona l'overlay voxel di un fileset per il viewer 3D: stesso dato e
// stessa palette della vista 2D, con un range unico condiviso tra i piani
// attivi (pianta/sezioni) così i colori restano confrontabili quando più piani
// sono visibili insieme. null se non c'è nulla da mostrare (overlay spento,
// nessun piano attivo, o dataset non ancora caricato).
export function useDataOverlay(slices, terrainCut, views, colors, reversed, sectionX, sectionY, level, dimZ, smooth, spacingZ, range, contour) {
  return useMemo(() => {
    if (!dimZ || (!views.plan && !views.sectionX && !views.sectionY)) return null;
    if (!(views.plan && slices.plan) && !(views.sectionX && slices.sectionX) && !(views.sectionY && slices.sectionY)) return null;
    return {
      views: {
        plan: views.plan ? slices.plan : null,
        sectionX: views.sectionX ? slices.sectionX : null,
        sectionY: views.sectionY ? slices.sectionY : null,
      },
      range,
      colors,
      reversed,
      pivot: { sectionX, sectionY },
      terrainCut,
      level,
      dimZ,
      smooth,
      spacingZ,
      contour,
    };
  }, [slices.plan, slices.sectionX, slices.sectionY, terrainCut, views.plan, views.sectionX, views.sectionY, colors, reversed, sectionX, sectionY, level, dimZ, smooth, spacingZ, range, contour]);
}

export function computeStats(model) {
  if (!model) return null;
  const { I, J, Z, dx, dy } = model.geometry;
  let max = 0;
  const zTop = model.buildings2D.zTop?.data;
  if (zTop) for (let i = 0; i < zTop.length; i++) if (zTop[i] > max) max = zTop[i];
  return {
    grid: `${I} × ${J} × ${Z}`,
    res: dx === dy ? `${dx} m` : `${dx} × ${dy} m`,
    height: `${Math.round(max)} m`,
  };
}
