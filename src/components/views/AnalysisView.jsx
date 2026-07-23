import { useMemo, useEffect, useRef, useState } from 'react';
import { VIEW_TYPES, SCALE_TYPES } from '../../data/constants';
import { findPalette } from '../../data/palettes';
import { useAppState } from '../../state/AppStateContext';
import { useI18n } from '../../i18n/I18nContext';
import Segmented from '../controls/Segmented';
import Slider from '../controls/Slider';
import Select from '../controls/Select';
import IconToggle from '../controls/IconToggle';
import HelpTooltip from '../controls/HelpTooltip';
import { IconLayers3D, IconBuilding, IconTerrain, IconTerrainFix, IconTree, IconCompass, IconCalendar, IconClock, IconSettings, IconWindGust } from '../icons/ToolbarIcons';
import ViewSettingsModal from '../ViewSettingsModal';
import MapChart, { MapThumb } from '../MapChart';
import TimeSeriesChart from '../TimeSeriesChart';
import { useSlices, usePointSeries, useInxRotation, useWindFields, useTerrainCut } from '../../lib/useSlice';
import { terrainCutProfile, isBiometDataset, hasVerticalExtent } from '../../lib/envimet';
import { useFlip } from '../../lib/useFlip';
import { formatValue } from '../../lib/colormap';
import { niceCeil } from '../../lib/windField';

function formatTime(time) {
  const h = String(Math.floor(time / 4)).padStart(2, '0');
  const m = String((time % 4) * 15).padStart(2, '0');
  return `${h}:${m}`;
}

// Valore mostrato dal color picker quando sectionLineColor è null (colore di
// tema): un grigio neutro, dato che l'input nativo non sa rendere "auto"
export const DEFAULT_SECTION_LINE_COLOR = '#808080';

// Differenza cella per cella tra due slice della stessa griglia, con range
// simmetrico attorno allo zero (il punto neutro della palette divergente)
function computeDiff(a, b, orderAB) {
  if (!a || !b || a.w !== b.w || a.h !== b.h) return null;
  const data = new Float32Array(a.data.length);
  let maxAbs = 0;
  for (let i = 0; i < data.length; i++) {
    const v = orderAB ? a.data[i] - b.data[i] : b.data[i] - a.data[i];
    data[i] = v;
    if (!Number.isNaN(v) && Math.abs(v) > maxAbs) maxAbs = Math.abs(v);
  }
  return { ...a, data, min: -maxAbs || 0, max: maxAbs || 0 };
}

function ChartCard({ flipKey, title, stats, body, stripe, caption, thumbs, objectsThumbs, objectsOpts, thumbRanges, thumbShowLegend, thumbWinds, colors, reversed, viewTypes, currentViewType, onSelectViewType, onThumbLegendClick, renderStyle }) {
  const { tr } = useI18n();
  const otherViews = viewTypes.filter((v) => v.key !== currentViewType);
  return (
    <div className="chart-card" data-flip-key={flipKey}>
      <div className="chart-header">
        <div className="chart-title">{title}</div>
        <div className="chart-stats">{stats}</div>
      </div>
      {body ?? (
        <div className={`chart-body stripe-${stripe}`}>
          <span className="chart-caption">{caption}</span>
        </div>
      )}
      {otherViews.length > 0 && (
      <div className="thumb-row">
        {otherViews.map((v) => (
          <div key={v.key} className="thumb" onClick={() => onSelectViewType(v.key)}>
            {thumbs?.[v.key] ? (
              <MapThumb
                slice={thumbs[v.key]}
                objectsSlice={objectsThumbs?.[v.key]}
                objectsOpts={objectsOpts}
                wind={thumbWinds?.[v.key]}
                colors={colors}
                reversed={reversed}
                min={thumbRanges?.[v.key]?.min}
                max={thumbRanges?.[v.key]?.max}
                showLegend={thumbShowLegend}
                renderStyle={renderStyle}
                onLegendClick={(e) => {
                  e.stopPropagation();
                  onThumbLegendClick?.(v.key, thumbRanges?.[v.key] ?? thumbs[v.key]);
                }}
              />
            ) : (
              <span className={`thumb-body stripe-${stripe}`} />
            )}
            <span className="thumb-label">{tr(v.labelKey)}</span>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

export default function AnalysisView() {
  const { state, set, toggle, setCompareMode } = useAppState();
  const { tr } = useI18n();

  // Con l'editor palette aperto le mappe mostrano il draft in tempo reale;
  // i colori del draft sono già orientati, quindi l'inversione non si riapplica.
  const draft = state.paletteDraft;
  const draftPalette = draft && { id: '__draft', name: draft.name.trim() || tr('custom_default_name'), colors: draft.colors };
  const activePalette = draft?.target === 'main' ? draftPalette : findPalette(state.palette, 'main', state.customPalettes);
  const mainReversed = draft?.target === 'main' ? false : state.paletteReversed;
  const activeDiffPalette = draft?.target === 'diff' ? draftPalette : findPalette(state.diffPalette, 'diff', state.customPalettes);
  const diffReversed = draft?.target === 'diff' ? false : state.diffPaletteReversed;
  const activeViewType = VIEW_TYPES.find((v) => v.key === state.viewType) || VIEW_TYPES[0];
  // Le sezioni Longitudinal/Transverse tagliano in altezza: su un gruppo dati
  // senza estensione verticale (es. Surface, un solo livello Z) non
  // mostrerebbero altro che una linea piatta, quindi restano nascoste.
  const showSections = hasVerticalExtent(state.edxMeta?.dimensions);
  const visibleViewTypes = showSections ? VIEW_TYPES : VIEW_TYPES.filter((v) => v.key === 'plan');

  const loaded = !!state.edxMeta;
  const datasetLabel = loaded ? state.dataset : tr(state.dataset);
  const timeLabel = state.seriesLabels[state.time] ?? `t · ${formatTime(state.time)}`;
  const diffOrderLabel = state.diffOrderAB ? tr('diff_order_ab') : tr('diff_order_ba');

  const terrainCutA = useTerrainCut(state.terrainA, state);
  const terrainCutB = useTerrainCut(state.terrainB, state);

  // Fix biomet delle sezioni (vedi toggle nella toolbar): attivo solo se
  // l'utente lo ha acceso e il dataset corrente è un output biomet.
  const biometFixActive = state.fixBiometSections && isBiometDataset(state.dataGroup, state.dataset);

  const sliceArgs = [state.dataGroup, state.dataset, state.time, state.level, state.sectionX, state.sectionY, state.sectionAngle];
  const slicesA = useSlices(state.filesetA, ...sliceArgs, terrainCutA, biometFixActive);
  const slicesB = useSlices(state.filesetB, ...sliceArgs, terrainCutB, biometFixActive);
  const slicesDiff = useMemo(() => {
    if (state.compareMode !== 'abdiff') return { plan: null, sectionX: null, sectionY: null };
    return {
      plan: computeDiff(slicesA.plan, slicesB.plan, state.diffOrderAB),
      sectionX: computeDiff(slicesA.sectionX, slicesB.sectionX, state.diffOrderAB),
      sectionY: computeDiff(slicesA.sectionY, slicesB.sectionY, state.diffOrderAB),
    };
  }, [slicesA.plan, slicesA.sectionX, slicesA.sectionY, slicesB.plan, slicesB.sectionX, slicesB.sectionY, state.compareMode, state.diffOrderAB]);

  const objDatasetName = useMemo(() => {
    return state.edxMeta?.variableNames?.find(n => n.toLowerCase().includes('objects')) || 'Objects ( )';
  }, [state.edxMeta]);
  
  const objectsArgs = [state.dataGroup, objDatasetName, state.time, state.level, state.sectionX, state.sectionY, state.sectionAngle];
  const objectsSlicesA = useSlices(state.showObjectsOverlay ? state.filesetA : null, ...objectsArgs, terrainCutA);
  const objectsSlicesB = useSlices(state.showObjectsOverlay ? state.filesetB : null, ...objectsArgs, terrainCutB);

  const objectsOpts = useMemo(() => ({
    opacity: state.objOverlayOpacity,
    showBuildings: state.objOverlayBuildings,
    showTerrain: state.objOverlayTerrain,
    showVegetation: state.objOverlayVegetation,
    style1: state.style1,
  }), [state.objOverlayOpacity, state.objOverlayBuildings, state.objOverlayTerrain, state.objOverlayVegetation, state.style1]);

  const objectsThumbsDiff = useMemo(() => ({
    plan: objectsSlicesA.plan || objectsSlicesB.plan,
    sectionX: objectsSlicesA.sectionX || objectsSlicesB.sectionX,
    sectionY: objectsSlicesA.sectionY || objectsSlicesB.sectionY,
  }), [objectsSlicesA.plan, objectsSlicesA.sectionX, objectsSlicesA.sectionY, objectsSlicesB.plan, objectsSlicesB.sectionX, objectsSlicesB.sectionY]);

  // Campo di vento a frecce sulla vista corrente e per le miniature.
  // Il valore di riferimento della legenda è condiviso tra A e B e tra tutte
  // le viste, così le lunghezze delle frecce sono confrontabili ovunque.
  const windArgs = [state.dataGroup, state.time, state.level, state.sectionX, state.sectionY, state.sectionAngle];
  const windFieldsA = useWindFields(state.showWindField, state.filesetA, ...windArgs, terrainCutA);
  const windFieldsB = useWindFields(state.showWindField && state.compareMode !== 'single', state.filesetB, ...windArgs, terrainCutB);
  
  let maxMag = 0;
  for (const k of ['plan', 'sectionX', 'sectionY']) {
    if (windFieldsA[k] && windFieldsA[k].maxMag > maxMag) maxMag = windFieldsA[k].maxMag;
    if (windFieldsB[k] && windFieldsB[k].maxMag > maxMag) maxMag = windFieldsB[k].maxMag;
  }
  const windRef = niceCeil(maxMag);

  const windFor = (field, isThumb = false) =>
    field && windRef > 0
      ? {
          field,
          refValue: windRef,
          style: state.windStyle,
          opacity: state.windOpacity,
          size: isThumb ? Math.min(state.windSize, 50) : state.windSize,
          density: isThumb ? Math.min(state.windDensity, 20) : state.windDensity,
        }
      : null;

  const thumbWindsA = {
    plan: windFor(windFieldsA.plan, true),
    sectionX: windFor(windFieldsA.sectionX, true),
    sectionY: windFor(windFieldsA.sectionY, true),
  };
  const thumbWindsB = {
    plan: windFor(windFieldsB.plan, true),
    sectionX: windFor(windFieldsB.sectionX, true),
    sectionY: windFor(windFieldsB.sectionY, true),
  };

  // Serie temporale nel punto selezionato (incrocio delle sezioni, livello corrente)
  const pointArgs = [state.dataGroup, state.dataset, state.sectionX, state.sectionY, state.level];
  const pointSeriesA = usePointSeries(state.filesetA, ...pointArgs, terrainCutA);
  const pointSeriesB = usePointSeries(state.filesetB, ...pointArgs, terrainCutB);

  const sliceA = slicesA[state.viewType];
  const sliceB = slicesB[state.viewType];
  const sliceDiff = slicesDiff[state.viewType];

  useEffect(() => {
    window.__currentSlices = {
      A: sliceA,
      B: sliceB,
      Diff: sliceDiff
    };
  }, [sliceA, sliceB, sliceDiff]);

  const objectsSliceA = objectsSlicesA[state.viewType];
  const objectsSliceB = objectsSlicesB[state.viewType];

  // Simbolo del nord solo sulle piante, orientato con modelRotation dell'INX
  const rotationA = useInxRotation(state.filesetA);
  const rotationB = useInxRotation(state.filesetB);
  const isPlan = state.viewType === 'plan';
  // Sempre presente (non solo quando il toggle è attivo): "visible" pilota la
  // transizione CSS di comparsa/scomparsa, che altrimenti non potrebbe animare
  // l'uscita (l'elemento andrebbe smontato di scatto insieme al toggle).
  const compassA = { type: state.viewType, rotation: rotationA, sectionAngle: state.sectionAngle, visible: state.showNorthArrow };
  const compassB = { type: state.viewType, rotation: rotationB, sectionAngle: state.sectionAngle, visible: state.showNorthArrow };
  const compassDiff = { type: state.viewType, rotation: (rotationA ?? rotationB), sectionAngle: state.sectionAngle, visible: state.showNorthArrow };

  // Calcolo dei range (min/max) per ciascuna vista in base allo scaleType
  const minOf = (...slices) => {
    let m = Infinity;
    for (const s of slices) if (s && s.min < m) m = s.min;
    return m === Infinity ? 0 : m;
  };
  const maxOf = (...slices) => {
    let m = -Infinity;
    for (const s of slices) if (s && s.max > m) m = s.max;
    return m === -Infinity ? 0 : m;
  };

  const rangesA = {};
  const rangesB = {};
  const rangesDiff = {};
  let thumbShowLegendA = false;
  let thumbShowLegendB = false;
  const thumbShowLegendDiff = true; // Diff è sempre individuale

  for (const k of ['plan', 'sectionX', 'sectionY']) {
    if (state.scaleType === 'custom' && state.customRanges[`Diff-${k}`]) {
      rangesDiff[k] = state.customRanges[`Diff-${k}`];
    } else {
      rangesDiff[k] = slicesDiff[k] ? { min: slicesDiff[k].min, max: slicesDiff[k].max } : null;
    }
  }

  if (state.scaleType === 'individual') {
    for (const k of ['plan', 'sectionX', 'sectionY']) {
      rangesA[k] = slicesA[k] ? { min: slicesA[k].min, max: slicesA[k].max } : null;
      rangesB[k] = slicesB[k] ? { min: slicesB[k].min, max: slicesB[k].max } : null;
    }
    thumbShowLegendA = true;
    thumbShowLegendB = true;
  } else if (state.scaleType === 'syncedViews') {
    for (const k of ['plan', 'sectionX', 'sectionY']) {
      const mn = minOf(slicesA[k], slicesB[k]);
      const mx = maxOf(slicesA[k], slicesB[k]);
      const r = (slicesA[k] || slicesB[k]) ? { min: mn, max: mx } : null;
      rangesA[k] = r;
      rangesB[k] = r;
    }
    thumbShowLegendA = true; // Perché ogni vista ha il suo range
    thumbShowLegendB = true;
  } else if (state.scaleType === 'filesetGlobal') {
    const minA = minOf(slicesA.plan, slicesA.sectionX, slicesA.sectionY);
    const maxA = maxOf(slicesA.plan, slicesA.sectionX, slicesA.sectionY);
    const rA = (slicesA.plan || slicesA.sectionX || slicesA.sectionY) ? { min: minA, max: maxA } : null;
    
    const minB = minOf(slicesB.plan, slicesB.sectionX, slicesB.sectionY);
    const maxB = maxOf(slicesB.plan, slicesB.sectionX, slicesB.sectionY);
    const rB = (slicesB.plan || slicesB.sectionX || slicesB.sectionY) ? { min: minB, max: maxB } : null;
    
    for (const k of ['plan', 'sectionX', 'sectionY']) {
      rangesA[k] = rA;
      rangesB[k] = rB;
    }
    thumbShowLegendA = false; // La legenda principale basta per tutti i grafici di quel fileset
    thumbShowLegendB = false;
  } else if (state.scaleType === 'allFilesets') {
    const mn = minOf(slicesA.plan, slicesA.sectionX, slicesA.sectionY, slicesB.plan, slicesB.sectionX, slicesB.sectionY);
    const mx = maxOf(slicesA.plan, slicesA.sectionX, slicesA.sectionY, slicesB.plan, slicesB.sectionX, slicesB.sectionY);
    const r = (slicesA.plan || slicesA.sectionX || slicesA.sectionY || slicesB.plan || slicesB.sectionX || slicesB.sectionY) ? { min: mn, max: mx } : null;
    
    for (const k of ['plan', 'sectionX', 'sectionY']) {
      rangesA[k] = r;
      rangesB[k] = r;
    }
    thumbShowLegendA = false;
    thumbShowLegendB = false;
  } else if (state.scaleType === 'custom') {
    // In custom mode, use the values from state.customRanges if defined, otherwise fallback to individual slice limits
    for (const k of ['plan', 'sectionX', 'sectionY']) {
      rangesA[k] = state.customRanges[`A-${k}`] ?? (slicesA[k] ? { min: slicesA[k].min, max: slicesA[k].max } : null);
      rangesB[k] = state.customRanges[`B-${k}`] ?? (slicesB[k] ? { min: slicesB[k].min, max: slicesB[k].max } : null);
    }
    thumbShowLegendA = true;
    thumbShowLegendB = true;
  }

  const rangeA = rangesA[state.viewType];
  const rangeB = rangesB[state.viewType];
  const rangeDiff = rangesDiff[state.viewType];

  const handleLegendClick = (filesetKey, vType, currentRange) => {
    const key = `${filesetKey}-${vType}`;
    const fsName = filesetLabel(filesetKey);
    const viewLabel = tr(VIEW_TYPES.find(v => v.key === vType).labelKey);
    set({
      customRangeModal: {
        key,
        title: `${fsName} · ${viewLabel}`,
        min: currentRange?.min,
        max: currentRange?.max,
      }
    });
  };

  // Click sulla mappa: il punto cliccato diventa l'incrocio delle sezioni.
  // Dalla pianta imposta sezione X e Y; da una sezione imposta l'altra sezione
  // e il livello (con sezioni ruotate il perno si sposta lungo la traccia,
  // l'angolo resta). sectionX/sectionY/level sono stato condiviso, quindi le
  // card di A, B e Diff si aggiornano tutte insieme.
  const dims = state.edxMeta?.dimensions;
  const handleCellClick = (col, row, slice) => {
    if (state.viewType === 'plan') set({ sectionX: col, sectionY: row });
    else if (slice?.line) {
      const nx = Math.round(slice.line.x0 + slice.line.dx * col);
      const ny = Math.round(slice.line.y0 + slice.line.dy * col);
      set({
        sectionX: Math.min(Math.max(0, nx), Math.max(0, (dims?.x ?? nx + 1) - 1)),
        sectionY: Math.min(Math.max(0, ny), Math.max(0, (dims?.y ?? ny + 1) - 1)),
        level: row,
      });
    } else if (state.viewType === 'sectionX') set({ sectionY: col, level: row });
    else set({ sectionX: col, level: row });
  };
  // Linee-mirino sulle sezioni: l'altra sezione (con angolo ≠ 0 passa per la
  // colonna del perno, che dipende dallo slice della card) e il livello — che
  // con "segui il terreno" diventa il profilo reale del taglio (terrainCutProfile).
  // In pianta il mirino è disegnato da MapChart via sectionControl.
  const marksFor = (slice, cut) =>
    state.viewType === 'plan'
      ? null
      : {
          x: state.sectionAngle ? slice?.pivotIndex : state.viewType === 'sectionX' ? state.sectionY : state.sectionX,
          y: state.level,
          profile: terrainCutProfile(cut, dims, slice, state.viewType, state.sectionX, state.sectionY),
        };
  // Widget in pianta: linee di sezione ruotabili attorno al perno, con reset
  const sectionControl =
    state.viewType === 'plan'
      ? {
          x: state.sectionX,
          y: state.sectionY,
          angle: state.sectionAngle,
          onRotate: (angle) => set({ sectionAngle: angle }),
          onReset: () => set({ sectionAngle: 0 }),
          resetTitle: tr('section_angle_reset'),
        }
      : null;
  // Aspetto (spessore/colore/tratteggio) della linea guida: la stessa croce
  // ruotabile in pianta o il mirino/profilo nelle sezioni, quindi comune a
  // tutte le viste.
  const sectionLineStyle = {
    width: state.sectionLineWidth,
    gap: state.sectionLineGap,
    color: state.sectionLineColor,
  };

  const emptyCaption = (key) =>
    state[`fileset${key}Open`] ? tr('map_no_data') : tr('map_open_hint');
  // Coordinata che definisce la vista corrente: quota per la pianta,
  // posizione della sezione (fissa nella vista stessa) per le sezioni
  const contextValueLabel =
    state.viewType === 'plan'
      ? `${tr('chip_level_prefix')} ${state.level}`
      : state.viewType === 'sectionX'
        ? `${tr('chip_sectionx_prefix')} ${state.sectionX}`
        : `${tr('chip_sectiony_prefix')} ${state.sectionY}`;
  const rangeStats = (range) =>
    `${datasetLabel} · ${range ? `${formatValue(range.min, range.max - range.min)} – ${formatValue(range.max, range.max - range.min)} · ` : ''}${contextValueLabel}`;

  // "Fileset A · nomeSimulazione": il prefisso A/B resta per leggere A − B / B − A
  const filesetLabel = (key) => {
    const fs = state[`fileset${key}`];
    const name = fs?.name ?? fs?.rootDir;
    const base = tr(key === 'A' ? 'chart_fileset_a' : 'chart_fileset_b');
    return name ? `${base} · ${name}` : base;
  };

  const allCharts = [
    {
      key: 'A',
      title: filesetLabel('A'),
      stats: rangeStats(rangeA),
      stripe: 'a',
      caption: emptyCaption('A'),
      thumbs: slicesA,
      objectsThumbs: objectsSlicesA,
      objectsOpts: objectsOpts,
      thumbRanges: rangesA,
      thumbShowLegend: thumbShowLegendA,
      thumbWinds: thumbWindsA,
      colors: activePalette.colors,
      reversed: mainReversed,
      onThumbLegendClick: (vType, range) => handleLegendClick('A', vType, range),
      body: sliceA ? (
        <MapChart slice={sliceA} objectsSlice={objectsSliceA} objectsOpts={objectsOpts} colors={activePalette.colors} reversed={mainReversed} min={rangeA.min} max={rangeA.max} onCellClick={(col, row) => handleCellClick(col, row, sliceA)} marks={marksFor(sliceA, terrainCutA)} sectionControl={sectionControl} sectionLineStyle={sectionLineStyle} compass={compassA} showCalendar={state.showCalendarWidget} showClock={state.showClockWidget} widgetScale={state.widgetScale} timeLabel={timeLabel} wind={windFor(windFieldsA[state.viewType], false)} onLegendClick={() => handleLegendClick('A', state.viewType, rangeA)} renderStyle={state.renderStyle} />
      ) : null,
    },
    {
      key: 'B',
      title: filesetLabel('B'),
      stats: rangeStats(rangeB),
      stripe: 'b',
      caption: emptyCaption('B'),
      thumbs: slicesB,
      objectsThumbs: objectsSlicesB,
      objectsOpts: objectsOpts,
      thumbRanges: rangesB,
      thumbShowLegend: thumbShowLegendB,
      thumbWinds: thumbWindsB,
      colors: activePalette.colors,
      reversed: mainReversed,
      onThumbLegendClick: (vType, range) => handleLegendClick('B', vType, range),
      body: sliceB ? (
        <MapChart slice={sliceB} objectsSlice={objectsSliceB} objectsOpts={objectsOpts} colors={activePalette.colors} reversed={mainReversed} min={rangeB.min} max={rangeB.max} onCellClick={(col, row) => handleCellClick(col, row, sliceB)} marks={marksFor(sliceB, terrainCutB)} sectionControl={sectionControl} sectionLineStyle={sectionLineStyle} compass={compassB} showCalendar={state.showCalendarWidget} showClock={state.showClockWidget} widgetScale={state.widgetScale} timeLabel={timeLabel} wind={windFor(windFieldsB[state.viewType], false)} onLegendClick={() => handleLegendClick('B', state.viewType, rangeB)} renderStyle={state.renderStyle} />
      ) : null,
    },
    {
      key: 'Diff',
      title: `${tr('chart_diff_title')} ${diffOrderLabel}`,
      stats: sliceDiff ? `Δ ${rangeStats(rangeDiff).replace(`${datasetLabel} · `, '')}` : 'Δ',
      stripe: 'diff',
      caption: tr('map_open_hint'),
      thumbs: slicesDiff,
      objectsThumbs: objectsThumbsDiff,
      objectsOpts: objectsOpts,
      thumbRanges: rangesDiff,
      thumbShowLegend: thumbShowLegendDiff,
      colors: activeDiffPalette.colors,
      reversed: diffReversed,
      onThumbLegendClick: (vType, range) => handleLegendClick('Diff', vType, range),
      body: sliceDiff ? (
        <MapChart slice={sliceDiff} objectsSlice={objectsSliceA || objectsSliceB} objectsOpts={objectsOpts} colors={activeDiffPalette.colors} reversed={diffReversed} min={rangeDiff.min} max={rangeDiff.max} onCellClick={(col, row) => handleCellClick(col, row, sliceDiff)} marks={marksFor(sliceDiff, terrainCutA ?? terrainCutB)} sectionControl={sectionControl} sectionLineStyle={sectionLineStyle} compass={compassDiff} showCalendar={state.showCalendarWidget} showClock={state.showClockWidget} widgetScale={state.widgetScale} timeLabel={timeLabel} onLegendClick={() => handleLegendClick('Diff', state.viewType, rangeDiff)} renderStyle={state.renderStyle} />
      ) : null,
    },
  ];
  const chartsToShow =
    state.compareMode === 'single' ? allCharts.slice(0, 1) : state.compareMode === 'b' ? allCharts.slice(1, 2) : state.compareMode === 'ab' ? allCharts.slice(0, 2) : allCharts;

  // Zoom viste: a 1x le card riempiono una riga; crescendo si allargano fino a
  // occupare tutta la larghezza (mai oltre: niente scroll laterale, vanno a capo).
  // Il termine (z-1)*gap ridà lo spazio dei gap che spariscono andando a capo,
  // così a zoom N la card copre esattamente il 100%; il -0.5px assorbe gli
  // arrotondamenti subpixel ed evita capi a riga spuri sulle soglie esatte.
  const n = chartsToShow.length;
  const z = state.scaleFactor;
  const effN = n === 1 ? 3 : n;
  const gapBack = ((z - 1) * 18).toFixed(2);
  const cardWidth = `min(100%, calc(${z} * (100% - ${(effN - 1) * 18}px) / ${effN} + ${gapBack}px - 0.5px))`;
  const flipRef = useFlip();

  const compareOptions = [
    { key: 'single', label: tr('compare_single'), help: { title: tr('help_compare_single_title'), body: tr('help_compare_single_body') } },
    { key: 'b', label: tr('compare_b'), disabled: !state.filesetBOpen, title: !state.filesetBOpen ? tr('hint_open_b') : undefined, help: { title: tr('help_compare_b_title'), body: tr('help_compare_b_body') } },
    { key: 'ab', label: tr('compare_ab'), disabled: !state.filesetBOpen, title: !state.filesetBOpen ? tr('hint_open_b') : undefined, help: { title: tr('help_compare_ab_title'), body: tr('help_compare_ab_body') } },
    { key: 'abdiff', label: tr('compare_abdiff'), disabled: !state.filesetBOpen, title: !state.filesetBOpen ? tr('hint_open_b') : undefined, help: { title: tr('help_compare_abdiff_title'), body: tr('help_compare_abdiff_body') } },
  ];
  const viewTypeOptions = visibleViewTypes.map((v) => ({ key: v.key, label: tr(v.labelKey) }));
  const renderStyleOptions = [
    { key: 'pixel', label: tr('render_style_pixel'), help: { title: tr('help_render_style_pixel_title'), body: tr('help_render_style_pixel_body') } },
    { key: 'contour', label: tr('render_style_contour'), help: { title: tr('help_render_style_contour_title'), body: tr('help_render_style_contour_body') } },
  ];

  // Se il gruppo dati cambia e perde l'estensione verticale mentre una sezione
  // era selezionata, si torna alla pianta (unica vista che resta visibile).
  useEffect(() => {
    if (!showSections && state.viewType !== 'plan') set({ viewType: 'plan' });
  }, [showSections, state.viewType]);

  const viewBarTopRef = useRef(null);
  const viewBarPanelRef = useRef(null);
  const viewBarModesRef = useRef(null);
  // 'inline'  -> affiancati, condividono la riga col pannello, ancorati a destra
  // 'stacked' -> impilati (compatti), a destra: sulla riga del pannello se lo
  //              spazio libero dopo di esso basta a contenerli anche solo
  //              impilati, altrimenti scendono impilati su una riga propria
  // 'wrapped' -> affiancati, ma solo quando anche impilati non condividerebbero
  //              la riga col pannello: scendono su una riga propria, e siccome
  //              lì hanno tutta la larghezza per stare in fila, tornano
  //              affiancati, ancorati a sinistra
  const [modesLayout, setModesLayout] = useState('stacked');
  const [viewBarCollapsed, setViewBarCollapsed] = useState(false);

  useEffect(() => {
    const topEl = viewBarTopRef.current;
    const panelEl = viewBarPanelRef.current;
    const modesEl = viewBarModesRef.current;
    if (!topEl || !panelEl || !modesEl) return;
    const measure = () => {
      const widths = Array.from(modesEl.querySelectorAll('.segmented')).map((el) => el.getBoundingClientRect().width);
      const gap = 12;
      const unstackedWidth = widths.reduce((sum, w) => sum + w, 0) + gap * (widths.length - 1);
      const stackedWidth = Math.max(0, ...widths);
      const topWidth = topEl.getBoundingClientRect().width;
      const leftover = topWidth - panelEl.getBoundingClientRect().width - 16;
      if (unstackedWidth <= leftover) {
        setModesLayout('inline');
      } else if (stackedWidth > leftover && unstackedWidth <= topWidth) {
        setModesLayout('wrapped');
      } else {
        setModesLayout('stacked');
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(topEl);
    observer.observe(panelEl);
    return () => observer.disconnect();
  }, [state.compareMode, state.viewType, state.filesetBOpen, state.showObjectsOverlay]);

  return (
    <>
      <div className={`view-bar${viewBarCollapsed ? ' view-bar-collapsed' : ''}`}>
        <div className="view-bar-collapse">
          <div className="view-bar-collapse-inner">
            <div className="view-bar-top" ref={viewBarTopRef}>
              <div className="view-bar-panel" ref={viewBarPanelRef}>
                <div className="view-bar-group">
                  <Slider label={tr('slider_scale')} value={state.scaleFactor} min={1} max={3} step={0.25} unit="x" onChange={(v) => set({ scaleFactor: v })} />
                </div>
                <div className="vertical-divider" />
                <div className="view-bar-group">
                  <HelpTooltip content={{ title: tr('help_legend_bounds_title'), body: tr('help_legend_bounds_body') }}>
                    <span className="control-label" style={{ marginBottom: 0 }}>{tr('group_legend')}</span>
                  </HelpTooltip>
                  <select className="select" style={{ width: 'auto' }} value={state.scaleType} onChange={(e) => set({ scaleType: e.target.value })}>
                    {SCALE_TYPES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {tr(s.labelKey)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="vertical-divider" />
                <div className="icon-toggle-row">
                  <IconToggle icon={IconLayers3D} label={tr('toggle_objects_overlay')} on={state.showObjectsOverlay} onToggle={() => toggle('showObjectsOverlay')} help={{ title: tr('help_objects_overlay_title'), body: tr('help_objects_overlay_body'), note: tr('help_objects_overlay_note') }} />
                  {state.showObjectsOverlay && (
                    <>
                      <IconToggle icon={IconBuilding} label={tr('toggle_obj_buildings')} on={state.objOverlayBuildings} onToggle={() => toggle('objOverlayBuildings')} help={{ title: tr('help_obj_buildings_title'), body: tr('help_obj_buildings_body') }} />
                      <IconToggle icon={IconTerrain} label={tr('toggle_obj_terrain')} on={state.objOverlayTerrain} onToggle={() => toggle('objOverlayTerrain')} help={{ title: tr('help_obj_terrain_title'), body: tr('help_obj_terrain_body') }} />
                      <IconToggle icon={IconTree} label={tr('toggle_obj_vegetation')} on={state.objOverlayVegetation} onToggle={() => toggle('objOverlayVegetation')} help={{ title: tr('help_obj_vegetation_title'), body: tr('help_obj_vegetation_body') }} />
                    </>
                  )}
                  {isBiometDataset(state.dataGroup, state.dataset) && (
                    <>
                      <div className="vertical-divider" />
                      <IconToggle icon={IconTerrainFix} label={tr('toggle_biomet_fix')} on={state.fixBiometSections} onToggle={() => toggle('fixBiometSections')} help={{ title: tr('help_biomet_fix_title'), body: tr('help_biomet_fix_body'), note: tr('help_biomet_fix_note') }} />
                    </>
                  )}
                  <div className="vertical-divider" />
                  <IconToggle icon={IconWindGust} label={tr('toggle_wind_field')} on={state.showWindField} onToggle={() => toggle('showWindField')} help={{ title: tr('help_wind_field_title'), body: tr('help_wind_field_body') }} />
                  <IconToggle icon={IconCompass} label={tr('toggle_compass')} on={state.showNorthArrow} onToggle={() => toggle('showNorthArrow')} help={{ title: tr('help_compass_arrow_title'), body: tr('help_compass_arrow_body') }} />
                  <IconToggle icon={IconCalendar} label={tr('toggle_calendar_widget')} on={state.showCalendarWidget} onToggle={() => toggle('showCalendarWidget')} help={{ title: tr('help_calendar_widget_title'), body: tr('help_calendar_widget_body') }} />
                  <IconToggle icon={IconClock} label={tr('toggle_clock_widget')} on={state.showClockWidget} onToggle={() => toggle('showClockWidget')} help={{ title: tr('help_clock_widget_title'), body: tr('help_clock_widget_body') }} />
                </div>
                <div className="vertical-divider" />
                <div className="view-bar-group">
                  <HelpTooltip content={{ title: tr('help_view_settings_title'), body: tr('help_view_settings_body') }}>
                    <button
                      type="button"
                      className="icon-toggle"
                      aria-label={tr('btn_view_settings')}
                      onClick={() => toggle('viewSettingsOpen')}
                    >
                      <IconSettings />
                    </button>
                  </HelpTooltip>
                </div>
              </div>

              <div className={`view-bar-modes view-bar-modes--${modesLayout}`} ref={viewBarModesRef}>
                <Segmented options={compareOptions} value={state.compareMode} onSelect={setCompareMode} variant="accent" />
                {showSections && <Segmented options={viewTypeOptions} value={state.viewType} onSelect={(v) => set({ viewType: v })} variant="dark" />}
                <Segmented options={renderStyleOptions} value={state.renderStyle} onSelect={(v) => set({ renderStyle: v })} variant="dark" />
              </div>
            </div>
          </div>
        </div>

        <HelpTooltip content={{ title: tr('help_collapse_toolbar_title'), body: tr('help_collapse_toolbar_body') }}>
        <button
          type="button"
          className="view-bar-toggle"
          onClick={() => setViewBarCollapsed((v) => !v)}
          aria-label={tr(viewBarCollapsed ? 'btn_expand_toolbar' : 'btn_collapse_toolbar')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>
        </HelpTooltip>
      </div>

      <ViewSettingsModal />

      <div className="chart-grid" ref={flipRef} style={{ '--chart-w': cardWidth }}>
        {chartsToShow.map((c) => (
          <ChartCard
            key={c.key}
            flipKey={c.key}
            title={`${c.title} · ${tr(activeViewType.labelKey)}`}
            stats={c.stats}
            body={c.body}
            stripe={c.stripe}
            caption={c.caption}
            thumbs={c.thumbs}
            objectsThumbs={c.objectsThumbs}
            objectsOpts={c.objectsOpts}
            thumbRanges={c.thumbRanges}
            thumbShowLegend={c.thumbShowLegend}
            thumbWinds={c.thumbWinds}
            colors={c.colors}
            reversed={c.reversed}
            viewTypes={visibleViewTypes}
            currentViewType={state.viewType}
            onSelectViewType={(v) => set({ viewType: v })}
            onThumbLegendClick={c.onThumbLegendClick}
            renderStyle={state.renderStyle}
          />
        ))}
      </div>

      <div className="timeseries-card">
        <div className="timeseries-header" onClick={() => toggle('timeSeriesOpen')}>
          <span className="chart-title">{tr('group_time_series')}</span>
          {pointSeriesA && (
            <span className="chart-stats">
              {datasetLabel} · {tr('chip_sectionx_prefix')} {state.sectionX}, {tr('chip_sectiony_prefix')} {state.sectionY} · {tr('chip_level_prefix')} {state.level}
            </span>
          )}
          <span className={`chevron${state.timeSeriesOpen ? ' open' : ''}`} />
        </div>
        {state.timeSeriesOpen &&
          (pointSeriesA ? (
            <TimeSeriesChart
              series={[
                { name: filesetLabel('A'), color: 'var(--series-a)', values: pointSeriesA },
                { name: filesetLabel('B'), color: 'var(--series-b)', values: state.compareMode !== 'single' ? pointSeriesB : null },
              ]}
              labels={state.seriesLabels}
              time={state.time}
              onSelectTime={(t) => set({ time: t })}
            />
          ) : (
            <div className="timeseries-body">
              <span className="chart-caption">{tr('ts_caption')}</span>
            </div>
          ))}
      </div>
    </>
  );
}
