// Estremi (min/max) della legenda a partire dagli slice caricati, secondo lo
// scope scelto in "Legend bounds". La vista 2D ha una legenda per vista
// (pianta/sezioni) di ciascun fileset; il viewer 3D una sola legenda per
// fileset, condivisa da tutti i piani attivi — da qui le due funzioni.

export const VIEW_KEYS = ['plan', 'sectionX', 'sectionY'];

export function minOf(...slices) {
  let m = Infinity;
  for (const s of slices) if (s && s.min < m) m = s.min;
  return m === Infinity ? 0 : m;
}

export function maxOf(...slices) {
  let m = -Infinity;
  for (const s of slices) if (s && s.max > m) m = s.max;
  return m === -Infinity ? 0 : m;
}

const rangeOf = (slice) => (slice ? { min: slice.min, max: slice.max } : null);

// Range delle tre viste per A, B e Diff (vista 2D). `thumbLegendA/B` dicono se
// le miniature devono mostrare la propria legenda: serve solo quando il range
// può cambiare da una vista all'altra — con uno scope per fileset o globale la
// legenda principale vale già per tutte.
export function viewRanges(scaleType, customRanges, slicesA, slicesB, slicesDiff) {
  const rangesA = {};
  const rangesB = {};
  const rangesDiff = {};

  for (const k of VIEW_KEYS) {
    rangesDiff[k] = (scaleType === 'custom' && customRanges[`Diff-${k}`]) || rangeOf(slicesDiff[k]);
  }

  if (scaleType === 'individual') {
    for (const k of VIEW_KEYS) {
      rangesA[k] = rangeOf(slicesA[k]);
      rangesB[k] = rangeOf(slicesB[k]);
    }
    return { rangesA, rangesB, rangesDiff, thumbLegendA: true, thumbLegendB: true };
  }

  if (scaleType === 'syncedViews') {
    // ogni vista ha il suo range, condiviso però tra A e B
    for (const k of VIEW_KEYS) {
      const r = slicesA[k] || slicesB[k] ? { min: minOf(slicesA[k], slicesB[k]), max: maxOf(slicesA[k], slicesB[k]) } : null;
      rangesA[k] = r;
      rangesB[k] = r;
    }
    return { rangesA, rangesB, rangesDiff, thumbLegendA: true, thumbLegendB: true };
  }

  if (scaleType === 'filesetGlobal' || scaleType === 'allFilesets') {
    const allA = VIEW_KEYS.map((k) => slicesA[k]);
    const allB = VIEW_KEYS.map((k) => slicesB[k]);
    const spanOf = (slices) => (slices.some(Boolean) ? { min: minOf(...slices), max: maxOf(...slices) } : null);
    const rA = spanOf(scaleType === 'allFilesets' ? [...allA, ...allB] : allA);
    const rB = scaleType === 'allFilesets' ? rA : spanOf(allB);
    for (const k of VIEW_KEYS) {
      rangesA[k] = rA;
      rangesB[k] = rB;
    }
    // la legenda principale basta per tutti i grafici di quel fileset
    return { rangesA, rangesB, rangesDiff, thumbLegendA: false, thumbLegendB: false };
  }

  if (scaleType === 'custom') {
    // dove l'utente non ha ancora fissato un range a mano si ripiega sugli
    // estremi del singolo slice
    for (const k of VIEW_KEYS) {
      rangesA[k] = customRanges[`A-${k}`] ?? rangeOf(slicesA[k]);
      rangesB[k] = customRanges[`B-${k}`] ?? rangeOf(slicesB[k]);
    }
    return { rangesA, rangesB, rangesDiff, thumbLegendA: true, thumbLegendB: true };
  }

  return { rangesA, rangesB, rangesDiff, thumbLegendA: false, thumbLegendB: false };
}

// Range dell'overlay voxel di un fileset nel viewer 3D (SCALE_TYPES_3D,
// sottoinsieme di quello 2D): qui ogni fileset ha una sola legenda condivisa da
// tutti i piani attivi, quindi ha senso solo lo scope per fileset, quello
// unificato tra i due filesets, o quello manuale — non "singolo grafico"/"tra
// viste", che presuppongono una vista alla volta come in 2D.
export function overlayRange(scaleType, customRanges, filesetKey, slices, otherSlices) {
  if (scaleType === 'custom') {
    const override = customRanges[`${filesetKey}-3d`];
    if (override) return override;
  }
  const candidates = VIEW_KEYS.map((k) => slices[k]);
  if (scaleType === 'allFilesets') candidates.push(...VIEW_KEYS.map((k) => otherSlices[k]));
  // 'filesetGlobal', e fallback di 'custom' finché non c'è un override salvato
  return { min: minOf(...candidates), max: maxOf(...candidates) };
}
