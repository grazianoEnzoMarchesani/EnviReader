import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppState } from '../../state/AppStateContext';
import { useI18n } from '../../i18n/I18nContext';
import { MODEL_LAYERS, SCALE_TYPES_3D } from '../../data/constants';
import { findInxFile, readINX } from '../../lib/inx';
import { loadObjectsVolume, isBiometDataset, hasVerticalExtent } from '../../lib/envimet';
import { sunPosition, sunPathSamples, sunDiagramCurves, estimateTimezoneOffset } from '../../lib/sunPosition';
import { getSunSample } from '../../lib/sunLink';
import Model3DViewer from '../Model3DViewer';
import { MapCalendar, MapClock } from '../MapChart';
import TimeSeriesChart from '../TimeSeriesChart';
import Segmented from '../controls/Segmented';
import IconToggle from '../controls/IconToggle';
import WindModeToggle from '../controls/WindModeToggle';
import HelpTooltip from '../controls/HelpTooltip';
import { IconBuilding, IconTree, IconTerrain, IconTerrainFix, IconReceptor, IconGrid, IconWireframe, IconSun, IconLayers3D, IconSectionX, IconSectionY, IconSmoothSurface, IconSyncRotate, IconCalendar, IconClock, IconSettings } from '../icons/ToolbarIcons';
import ViewSettingsModal from '../ViewSettingsModal';
import { useFlip } from '../../lib/useFlip';
import { usePointSeries, useSlices, useTerrainCut, useWindFields, useWindVolumeCells } from '../../lib/useSlice';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { findPalette } from '../../data/palettes';
import { formatValue, orientColors, contourLegendGradient } from '../../lib/colormap';
import { niceCeil } from '../../lib/windField';

const LAYER_ICONS = {
  showBuildings: IconBuilding,
  showVegetation: IconTree,
  showTerrain: IconTerrain,
  showReceptors: IconReceptor,
  showGrid: IconGrid,
};

const LAYER_HELP_IDS = {
  showBuildings: 'layer_buildings',
  showVegetation: 'layer_vegetation',
  showTerrain: 'layer_terrain',
  showReceptors: 'layer_receptors',
  showGrid: 'layer_grid',
};

function formatTime(time) {
  const h = String(Math.floor(time / 4)).padStart(2, '0');
  const m = String((time % 4) * 15).padStart(2, '0');
  return `${h}:${m}`;
}

// Azimuth/altitudine del sole: stesso linguaggio visivo dei badge calendario/
// orologio 2D (icona + valore), ma affiancati a destra invece che sotto, così
// non si spostano quando calendario/orologio vengono attivati o disattivati.
function SunAnglesBadge({ azimuth, altitude }) {
  return (
    <div className="model-sun-widgets">
      <span className="model-sun-badge">
        <IconSun />
        <span>{azimuth.toFixed(1)}°</span>
      </span>
      <span className="model-sun-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 18h18" />
          <path d="M4 18a10 10 0 0 1 10-10" />
          <circle cx="14" cy="8" r="1.4" fill="currentColor" stroke="none" />
        </svg>
        <span>{altitude.toFixed(1)}°</span>
      </span>
    </div>
  );
}

// Carica e parsa l'INX (inputData/*.INX) del fileset, se presente
function useInxModel(fileset) {
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
function useObjectsVolume(fileset) {
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

// Percorso solare per un singolo modello: azimuth/altitudine correnti, arco
// del giorno e rete annuale, tutti derivati dalla località letta nell'INX
function useModelSun(model, state) {
  const sunSample = useMemo(
    () => getSunSample(state),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.seriesLabels, state.time],
  );
  const location = model?.location;
  const hasLocation = Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude);
  const sunActive = state.sunPathEnabled && hasLocation;

  const sunPathPoints = useMemo(() => {
    if (!sunActive) return null;
    const tz = estimateTimezoneOffset(location.longitude);
    return sunPathSamples(sunSample.date, location.latitude, location.longitude, tz);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sunActive, location?.latitude, location?.longitude, sunSample.date]);

  // rete annuale del percorso (bussola, archi mensili, analemmi): dipende solo
  // dalla località, quindi si ricalcola solo al cambio di modello, non di data/ora
  const sunDiagram = useMemo(() => {
    if (!sunActive) return null;
    const tz = estimateTimezoneOffset(location.longitude);
    return sunDiagramCurves(location.latitude, location.longitude, tz);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sunActive, location?.latitude, location?.longitude]);

  const sunInfo = useMemo(() => {
    if (!sunActive) return null;
    const tz = estimateTimezoneOffset(location.longitude);
    return sunPosition(sunSample.date, sunSample.hour, location.latitude, location.longitude, tz);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sunActive, location?.latitude, location?.longitude, sunSample.date, sunSample.hour]);

  return { sunSample, hasLocation, sunActive, sunPathPoints, sunDiagram, sunInfo };
}

const VOXEL_VIEW_KEYS = ['plan', 'sectionX', 'sectionY'];

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

// Range (min/max) dell'overlay voxel di un fileset in base allo scaleType
// scelto in "Legend bounds" (SCALE_TYPES_3D, sottoinsieme di quello della 2D):
// qui ogni fileset ha una sola legenda condivisa da tutti i piani attivi, quindi
// ha senso solo lo scope per fileset, quello unificato tra i due filesets, o
// quello manuale — non "singolo grafico"/"tra viste", che presuppongono una
// vista alla volta come in 2D.
function overlayRange(scaleType, customRanges, filesetKey, slices, otherSlices) {
  if (scaleType === 'custom') {
    const override = customRanges[`${filesetKey}-3d`];
    if (override) return override;
  }
  if (scaleType === 'allFilesets') {
    const candidates = [...VOXEL_VIEW_KEYS.map((k) => slices[k]), ...VOXEL_VIEW_KEYS.map((k) => otherSlices[k])];
    return { min: minOf(...candidates), max: maxOf(...candidates) };
  }
  // 'filesetGlobal', e fallback di 'custom' finché non c'è un override salvato
  const candidates = VOXEL_VIEW_KEYS.map((k) => slices[k]);
  return { min: minOf(...candidates), max: maxOf(...candidates) };
}

// Confeziona l'overlay voxel di un fileset per il viewer 3D: stesso dato e
// stessa palette della vista 2D, con un range unico condiviso tra i piani
// attivi (pianta/sezioni) così i colori restano confrontabili quando più piani
// sono visibili insieme. null se non c'è nulla da mostrare (overlay spento,
// nessun piano attivo, o dataset non ancora caricato).
function useDataOverlay(slices, terrainCut, views, colors, reversed, sectionX, sectionY, level, dimZ, smooth, spacingZ, range, contour) {
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

// Confeziona l'overlay 3D del vento sulle fette dati di un fileset: stessa
// forma di useDataOverlay (stessi piani attivi `views`, stesso pivot/terrainCut/
// livello), ma il dato sono i campi di vento per piano (useWindFields) invece
// dello slice scalare, e il "colore" è lo stile/opacità/dimensione/densità
// della scheda Wind condivisa con la vista 2D. refValue è passato dal
// chiamante (condiviso tra A e B e tutti i piani, vedi AnalysisView.jsx) così
// le lunghezze delle frecce restano confrontabili.
function useWindOnSlicesOverlay(windFields, refValue, views, style, opacity, size, density, terrainCut, level, dimZ, spacingZ, sectionX, sectionY) {
  return useMemo(() => {
    if (!dimZ || !(refValue > 0)) return null;
    if (!(views.plan && windFields.plan) && !(views.sectionX && windFields.sectionX) && !(views.sectionY && windFields.sectionY)) return null;
    return {
      views: {
        plan: views.plan ? windFields.plan : null,
        sectionX: views.sectionX ? windFields.sectionX : null,
        sectionY: views.sectionY ? windFields.sectionY : null,
      },
      refValue,
      style,
      opacity,
      size,
      density,
      pivot: { sectionX, sectionY },
      terrainCut,
      level,
      dimZ,
      spacingZ,
    };
  }, [windFields.plan, windFields.sectionX, windFields.sectionY, refValue, views.plan, views.sectionX, views.sectionY, style, opacity, size, density, terrainCut, level, dimZ, spacingZ, sectionX, sectionY]);
}

// Confeziona l'overlay 3D del campo di vento volumetrico di un fileset: le
// celle (frecce/segmenti) arrivano già pronte dal worker (useWindVolumeCells),
// qui si aggiunge solo l'opacità — l'unico parametro che Model3DViewer può
// aggiornare senza ricostruire la mesh (vedi il suo effetto dedicato).
function useWindVolumeOverlay(cells, opacity) {
  return useMemo(() => (cells ? { cells, opacity } : null), [cells, opacity]);
}

function computeStats(model) {
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

// Un pannello del viewer 3D (un fileset): titolo/statistiche + canvas o stato vuoto
function ModelPanel({ flipKey, title, loaded, objectsVolume, spacingZ, dimZ, dataOverlay, windOverlay, windVolumeOverlay, flags, wireframe, vegStyle1, projection, gizmoNorthMode, sun, sunPathEnabled, showCalendarWidget, showClockWidget, widgetScale, timeLabel, sectionX, sectionY, sectionAngle, onPivotChange, onAngleChange, onLegendClick, emptyHint, cameraSyncRef, cameraSyncEnabled, blockedNoVerticalExtent }) {
  const { tr } = useI18n();
  const model = loaded?.model;
  const showModel = model && !blockedNoVerticalExtent;
  const stats = computeStats(model);
  const { hasLocation, sunActive, sunInfo, sunPathPoints, sunDiagram } = sun;

  return (
    <div className="model-panel" data-flip-key={flipKey} style={{ '--widget-scale': (widgetScale ?? 100) / 100 }}>
      <div className="chart-header">
        <div className="chart-title">{title}</div>
        {stats && (
          <div className="chart-stats">
            {tr('model_stats_grid')}: {stats.grid} · {tr('model_stats_res')}: {stats.res} · {tr('model_stats_height')}: {stats.height}
          </div>
        )}
      </div>
      <div className={`model-viewer${showModel ? ' is-3d' : ''}`}>
        {model && blockedNoVerticalExtent ? (
          <>
            <span className="chart-caption">{tr('model_no_vertical_caption')}</span>
            <span className="model-hint">{tr('model_no_vertical_hint')}</span>
          </>
        ) : model ? (
          <>
            <Model3DViewer
              model={model}
              objectsVolume={objectsVolume}
              spacingZ={spacingZ}
              dimZ={dimZ}
              dataOverlay={dataOverlay}
              windOverlay={windOverlay}
              windVolumeOverlay={windVolumeOverlay}
              flags={flags}
              wireframe={wireframe}
              vegStyle1={vegStyle1}
              projection={projection}
              sunEnabled={sunActive}
              sunAzimuth={sunInfo?.azimuth}
              sunAltitude={sunInfo?.altitude}
              sunPathPoints={sunPathPoints}
              sunDiagram={sunDiagram}
              gizmoNorthMode={gizmoNorthMode}
              sectionX={sectionX}
              sectionY={sectionY}
              sectionAngle={sectionAngle}
              onPivotChange={onPivotChange}
              onAngleChange={onAngleChange}
              cameraSyncRef={cameraSyncRef}
              cameraSyncEnabled={cameraSyncEnabled}
            />
            {showCalendarWidget && <MapCalendar timeLabel={timeLabel} />}
            {showClockWidget && <MapClock timeLabel={timeLabel} withCalendar={showCalendarWidget} />}
            {sunActive && sunInfo && <SunAnglesBadge azimuth={sunInfo.azimuth} altitude={sunInfo.altitude} />}
            {sunPathEnabled && !hasLocation && (
              <div className="sun-info-panel sun-info-warning">{tr('sun_no_location')}</div>
            )}
            <span className="model-overlay-hint">{tr('model_hint')}</span>
          </>
        ) : (
          <>
            <span className="chart-caption">{tr('model_caption')}</span>
            <span className="model-hint">{emptyHint}</span>
          </>
        )}
      </div>
      {showModel && dataOverlay && (
        <div className="map-legend" onClick={() => onLegendClick?.(dataOverlay.range)}>
          <span className="map-legend-label">{formatValue(dataOverlay.range.min, dataOverlay.range.max - dataOverlay.range.min)}</span>
          <span
            className="map-legend-bar"
            style={{ background: dataOverlay.contour ? contourLegendGradient(dataOverlay.colors, dataOverlay.reversed) : `linear-gradient(90deg, ${orientColors(dataOverlay.colors, dataOverlay.reversed).join(',')})` }}
          />
          <span className="map-legend-label">{formatValue(dataOverlay.range.max, dataOverlay.range.max - dataOverlay.range.min)}</span>
        </div>
      )}
    </div>
  );
}

export default function ModelView() {
  const { state, set, setCompareMode3D, toggle } = useAppState();
  const { tr } = useI18n();
  const loadedA = useInxModel(state.filesetA);
  const loadedB = useInxModel(state.filesetB);
  const objectsVolumeA = useObjectsVolume(state.filesetA);
  const objectsVolumeB = useObjectsVolume(state.filesetB);
  const sunA = useModelSun(loadedA?.model, state);
  const sunB = useModelSun(loadedB?.model, state);
  const [viewBarCollapsed, setViewBarCollapsed] = useState(false);

  // Serie temporale nel punto selezionato (incrocio delle sezioni, livello
  // corrente): stessa logica e stesso componente della vista 2D
  const terrainCutA = useTerrainCut(state.terrainA, state);
  const terrainCutB = useTerrainCut(state.terrainB, state);
  const pointArgs = [state.dataGroup, state.dataset, state.sectionX, state.sectionY, state.level];
  const pointSeriesA = usePointSeries(state.filesetA, ...pointArgs, terrainCutA);
  const pointSeriesB = usePointSeries(state.filesetB, ...pointArgs, terrainCutB);
  const loaded = !!state.edxMeta;
  const datasetLabel = loaded ? state.dataset : tr(state.dataset);
  // Il gruppo dati corrente non ha estensione verticale (es. Surface, un solo
  // livello Z): la vista 3D esiste per esplorare la verticalità, quindi in
  // questo caso il modello resta nascosto e si chiede di scegliere un altro
  // gruppo dati invece di mostrare un modello "piatto" fuorviante.
  const blockedNoVerticalExtent = loaded && !hasVerticalExtent(state.edxMeta?.dimensions);
  // Stessa etichetta data/ora dei badge calendario/orologio della vista 2D
  // (AnalysisView), qui condivisa dai pannelli 3D per restare coerente col resto dell'app.
  const timeLabel = state.seriesLabels[state.time] ?? `t · ${formatTime(state.time)}`;

  // Overlay voxel del dataset corrente nel viewer 3D: stesso dato/palette
  // della vista 2D Data Analysis, disegnato in pianta e/o nelle sezioni a
  // scelta dell'utente (vedi toggle "Data overlay" nella toolbar).
  const draft = state.paletteDraft;
  const draftPalette = draft && { id: '__draft', name: draft.name.trim() || tr('custom_default_name'), colors: draft.colors };
  const activePalette = draft?.target === 'main' ? draftPalette : findPalette(state.palette, 'main', state.customPalettes);
  const mainReversed = draft?.target === 'main' ? false : state.paletteReversed;
  // Fix biomet delle sezioni (vedi toggle "Data overlay" nella toolbar):
  // stesso meccanismo e stesso stato condiviso della vista 2D (AnalysisView).
  const biometFixActive = state.fixBiometSections && isBiometDataset(state.dataGroup, state.dataset);

  const sliceArgs = [state.dataGroup, state.dataset, state.time, state.level, state.sectionX, state.sectionY, state.sectionAngle];
  const slicesA = useSlices(state.filesetA, ...sliceArgs, terrainCutA, biometFixActive);
  const slicesB = useSlices(state.filesetB, ...sliceArgs, terrainCutB, biometFixActive);
  const voxelViews = {
    plan: state.showDataVoxels && state.dataVoxelPlan,
    sectionX: state.showDataVoxels && state.dataVoxelSectionX,
    sectionY: state.showDataVoxels && state.dataVoxelSectionY,
  };
  const dimZ = state.edxMeta?.dimensions?.z;
  // spacing_z reale del file EDX corrente: quando disponibile, edifici/terreno/
  // vegetazione e overlay dati condividono questa stessa griglia verticale
  // invece di ricalcolarla ciascuno per conto proprio (vedi resolveZLevels in
  // inxScene.js), eliminando lo sfasamento tra le due geometrie.
  const spacingZ = state.edxMeta?.spacing?.z;
  const overlayRangeA = overlayRange(state.scaleType3D, state.customRanges, 'A', slicesA, slicesB);
  const overlayRangeB = overlayRange(state.scaleType3D, state.customRanges, 'B', slicesB, slicesA);
  const dataOverlayA = useDataOverlay(slicesA, terrainCutA, voxelViews, activePalette.colors, mainReversed, state.sectionX, state.sectionY, state.level, dimZ, state.dataVoxelSmooth, spacingZ, overlayRangeA, state.renderStyle === 'contour');
  const dataOverlayB = useDataOverlay(slicesB, terrainCutB, voxelViews, activePalette.colors, mainReversed, state.sectionX, state.sectionY, state.level, dimZ, state.dataVoxelSmooth, spacingZ, overlayRangeB, state.renderStyle === 'contour');

  // Vento sulle fette dati già disegnate (pianta/sezioni): quali piani sono
  // "selezionati" (dataVoxelPlan/SectionX/SectionY) resta indipendente dal
  // master "Data overlay" (showDataVoxels), che controlla solo i voxel
  // colorati — altrimenti spegnere i colori farebbe sparire anche il vento,
  // che l'utente si aspetta di vedere anche a overlay dati spento. Stile/
  // opacità/dimensione/densità sono quelli della scheda Wind condivisa con la
  // vista 2D. Il riferimento delle lunghezze è condiviso tra A/B e tutti i
  // piani, come in AnalysisView.jsx, così le frecce restano confrontabili.
  const windPlaneViews = {
    plan: state.dataVoxelPlan,
    sectionX: state.dataVoxelSectionX,
    sectionY: state.dataVoxelSectionY,
  };
  const windArgs = [state.dataGroup, state.time, state.level, state.sectionX, state.sectionY, state.sectionAngle];
  const windFieldsA = useWindFields(state.showWindField, state.filesetA, ...windArgs, terrainCutA);
  const windFieldsB = useWindFields(state.showWindField && state.compareMode3D !== 'single', state.filesetB, ...windArgs, terrainCutB);
  let windMaxMag = 0;
  for (const k of ['plan', 'sectionX', 'sectionY']) {
    if (windFieldsA[k] && windFieldsA[k].maxMag > windMaxMag) windMaxMag = windFieldsA[k].maxMag;
    if (windFieldsB[k] && windFieldsB[k].maxMag > windMaxMag) windMaxMag = windFieldsB[k].maxMag;
  }
  const windRefValue = niceCeil(windMaxMag);
  const windOverlayA = useWindOnSlicesOverlay(windFieldsA, windRefValue, windPlaneViews, state.windStyle, state.windOpacity, state.windSize, state.windDensity, terrainCutA, state.level, dimZ, spacingZ, state.sectionX, state.sectionY);
  const windOverlayB = useWindOnSlicesOverlay(windFieldsB, windRefValue, windPlaneViews, state.windStyle, state.windOpacity, state.windSize, state.windDensity, terrainCutB, state.level, dimZ, spacingZ, state.sectionX, state.sectionY);

  // Campo di vento volumetrico: caricamento dell'intero volume (u, v, w) e
  // tracciamento streamline/campionamento frecce in un Web Worker dedicato
  // (vedi useWindVolumeCells in useSlice.js, windVolumeWorker.js) —
  // indipendente dalle fette dati mostrate (vedi toggle "Wind volume" nella
  // toolbar). Il calcolo resta pesante, quindi tempo/dimensione/densità sono
  // "debounced": trascinare uno di questi slider aggiorna il worker solo a
  // fine trascinamento invece che ad ogni tick intermedio, che altrimenti
  // metterebbe in coda un ricalcolo dopo l'altro. L'opacità NON è debounced:
  // Model3DViewer la applica solo al materiale, senza mai ricostruire la mesh.
  // Il debounce sul tempo va bypassato durante il play automatico (state.playing):
  // a 5x/10x il TimePlayer avanza più in fretta della finestra di debounce (250ms),
  // che verrebbe resettata a ogni tick e non propagherebbe mai il nuovo istante,
  // bloccando di fatto il ricalcolo del vento volumetrico durante la riproduzione.
  const debouncedTime = useDebouncedValue(state.time, 250, state.playing);
  const debouncedWindSize = useDebouncedValue(state.windSize, 250);
  const debouncedWindDensity = useDebouncedValue(state.windDensity, 250);
  const { cells: windVolumeCellsA, loading: windVolumeLoadingA } = useWindVolumeCells(state.showWindVolume, state.filesetA, state.dataGroup, debouncedTime, loadedA?.model?.geometry, spacingZ, state.windStyle, debouncedWindSize, debouncedWindDensity);
  const { cells: windVolumeCellsB, loading: windVolumeLoadingB } = useWindVolumeCells(state.showWindVolume && state.compareMode3D !== 'single', state.filesetB, state.dataGroup, debouncedTime, loadedB?.model?.geometry, spacingZ, state.windStyle, debouncedWindSize, debouncedWindDensity);
  const windVolumeOverlayA = useWindVolumeOverlay(windVolumeCellsA, state.windOpacity);
  const windVolumeOverlayB = useWindVolumeOverlay(windVolumeCellsB, state.windOpacity);
  // Il toggle in toolbar è unico per entrambi i fileset: mostra il
  // caricamento finché ALMENO uno dei due (quelli effettivamente attivi) sta
  // ancora aspettando la risposta del worker.
  const windVolumeLoading = windVolumeLoadingA || (state.compareMode3D !== 'single' && windVolumeLoadingB);
  // Il toggle "Wind volume" vive ora nella sidebar (WindTab), non più nella
  // toolbar: sincronizza qui lo stato di caricamento perché la sidebar non ha
  // accesso ai fileset/geometrie caricati localmente in questa vista
  useEffect(() => {
    set({ windVolumeLoading });
  }, [windVolumeLoading]);

  // Pulsante ciclico "Wind display" in toolbar: off → 2D (wind field) → 3D
  // (wind volume) → off. showWindField/showWindVolume restano la fonte di
  // verità (condivisa con i toggle della sidebar WindTab); qui componiamo
  // solo la transizione riusando toggle(), che già gestisce l'esclusione
  // reciproca tra i due — vedi AppStateContext.jsx.
  const windMode = state.showWindVolume ? '3d' : state.showWindField ? '2d' : 'off';
  const cycleWindMode = () => toggle(windMode === 'off' ? 'showWindField' : 'showWindVolume');

  const flags = useMemo(
    () => ({
      showBuildings: state.showBuildings,
      showVegetation: state.showVegetation,
      showTerrain: state.showTerrain,
      showReceptors: state.showReceptors,
      showGrid: state.showGrid,
    }),
    [state.showBuildings, state.showVegetation, state.showTerrain, state.showReceptors, state.showGrid],
  );

  // stessa etichetta delle card di Analisi: "Fileset A · nomeSimulazione"
  const filesetLabel = (key) => {
    const fs = state[`fileset${key}`];
    const name = fs?.name ?? fs?.rootDir;
    const base = tr(key === 'A' ? 'chart_fileset_a' : 'chart_fileset_b');
    return name ? `${base} · ${name}` : base;
  };
  // Click sulla legenda 3D: stesso modale "Legend bounds" della vista 2D,
  // ma con una chiave dedicata (`${key}-3d`) perché qui il range copre tutti
  // i piani attivi insieme invece di una singola vista pianta/sezione.
  const handleLegendClick = (key, currentRange) => {
    set({
      customRangeModal: {
        key: `${key}-3d`,
        title: `${filesetLabel(key)} · ${datasetLabel}`,
        min: currentRange?.min,
        max: currentRange?.max,
      },
    });
  };
  const compareOptions = [
    { key: 'single', label: tr('compare_single'), help: { title: tr('help_compare_single_title'), body: tr('help_compare_single_body') } },
    { key: 'b', label: tr('compare_b'), disabled: !state.filesetBOpen, title: !state.filesetBOpen ? tr('hint_open_b') : undefined, help: { title: tr('help_compare_b_title'), body: tr('help_compare_b_body') } },
    { key: 'ab', label: tr('compare_ab'), disabled: !state.filesetBOpen, title: !state.filesetBOpen ? tr('hint_open_b') : undefined, help: { title: tr('help_compare_ab_title'), body: tr('help_compare_ab_body') } },
  ];
  const renderStyleOptions = [
    { key: 'pixel', label: tr('render_style_pixel'), help: { title: tr('help_render_style_pixel_title'), body: tr('help_render_style_pixel_body') } },
    { key: 'contour', label: tr('render_style_contour'), help: { title: tr('help_render_style_contour_title'), body: tr('help_render_style_contour_body') } },
  ];
  const panelKeys = state.compareMode3D === 'ab' ? ['A', 'B'] : state.compareMode3D === 'b' ? ['B'] : ['A'];

  const panelProps = {
    A: { title: filesetLabel('A'), loaded: loadedA, objectsVolume: objectsVolumeA, spacingZ, dimZ, dataOverlay: dataOverlayA, windOverlay: windOverlayA, windVolumeOverlay: windVolumeOverlayA, sun: sunA, onLegendClick: (range) => handleLegendClick('A', range) },
    B: { title: filesetLabel('B'), loaded: loadedB, objectsVolume: objectsVolumeB, spacingZ, dimZ, dataOverlay: dataOverlayB, windOverlay: windOverlayB, windVolumeOverlay: windVolumeOverlayB, sun: sunB, onLegendClick: (range) => handleLegendClick('B', range) },
  };
  const flipRef = useFlip();

  // Riferimento condiviso tra i due viewer 3D per la rotazione sincronizzata
  // (vedi Model3DViewer): quando l'utente ruota un pannello, questo scrive qui
  // il proprio orientamento (theta/phi), l'altro lo applica al frame successivo
  // mantenendo il proprio target e zoom. Un solo oggetto stabile per l'intera
  // vita del componente, non ricreato ai re-render.
  const cameraSyncRef = useRef({ theta: 0, phi: 0, rev: 0, source: null });

  const viewBarTopRef = useRef(null);
  const viewBarPanelRef = useRef(null);
  const viewBarModesRef = useRef(null);
  const [modesLayout, setModesLayout] = useState('stacked');

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
  }, [state.compareMode3D, state.filesetBOpen, state.showDataVoxels, loadedA, loadedB]);

  return (
    <div className="model-view-page">
      <div className={`view-bar${viewBarCollapsed ? ' view-bar-collapsed' : ''}`}>
        <div className="view-bar-collapse">
          <div className="view-bar-collapse-inner">
            <div className="view-bar-top" ref={viewBarTopRef}>
              <div className="view-bar-panel" ref={viewBarPanelRef}>
                <div className="view-bar-group">
                  <span className="control-label" style={{ marginBottom: 0 }}>{tr('model_group_layers')}</span>
                  <div className="icon-toggle-row">
                    {MODEL_LAYERS.map((l) => (
                      <IconToggle key={l.key} icon={LAYER_ICONS[l.key]} label={tr(l.labelKey)} on={state[l.key]} onToggle={() => toggle(l.key)} help={{ title: tr(`help_${LAYER_HELP_IDS[l.key]}_title`), body: tr(`help_${LAYER_HELP_IDS[l.key]}_body`) }} />
                    ))}
                  </div>
                </div>
                <div className="vertical-divider" />
                <div className="view-bar-group">
                  <span className="control-label" style={{ marginBottom: 0 }}>{tr('model_group_data_overlay')}</span>
                  <div className="icon-toggle-row">
                    <IconToggle icon={IconLayers3D} label={tr('toggle_data_voxels')} on={state.showDataVoxels} onToggle={() => toggle('showDataVoxels')} help={{ title: tr('help_data_voxels_title'), body: tr('help_data_voxels_body'), note: tr('help_data_voxels_note') }} />
                    {state.showDataVoxels && (
                      <>
                        <IconToggle icon={IconGrid} label={tr('toggle_data_voxel_plan')} on={state.dataVoxelPlan} onToggle={() => toggle('dataVoxelPlan')} help={{ title: tr('help_data_voxel_plan_title'), body: tr('help_data_voxel_plan_body') }} />
                        <IconToggle icon={IconSectionX} label={tr('toggle_data_voxel_sectionx')} on={state.dataVoxelSectionX} onToggle={() => toggle('dataVoxelSectionX')} help={{ title: tr('help_data_voxel_sectionx_title'), body: tr('help_data_voxel_sectionx_body') }} />
                        <IconToggle icon={IconSectionY} label={tr('toggle_data_voxel_sectiony')} on={state.dataVoxelSectionY} onToggle={() => toggle('dataVoxelSectionY')} help={{ title: tr('help_data_voxel_sectiony_title'), body: tr('help_data_voxel_sectiony_body') }} />
                        <div className="vertical-divider" />
                        <IconToggle icon={IconSmoothSurface} label={tr('toggle_data_voxel_smooth')} on={state.dataVoxelSmooth} onToggle={() => toggle('dataVoxelSmooth')} help={{ title: tr('help_data_voxel_smooth_title'), body: tr('help_data_voxel_smooth_body'), note: tr('help_data_voxel_smooth_note') }} />
                        {isBiometDataset(state.dataGroup, state.dataset) && (
                          <>
                            <div className="vertical-divider" />
                            <IconToggle icon={IconTerrainFix} label={tr('toggle_biomet_fix')} on={state.fixBiometSections} onToggle={() => toggle('fixBiometSections')} help={{ title: tr('help_biomet_fix_title'), body: tr('help_biomet_fix_body'), note: tr('help_biomet_fix_note') }} />
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {state.showDataVoxels && (
                  <>
                    <div className="vertical-divider" />
                    <div className="view-bar-group">
                      <HelpTooltip content={{ title: tr('help_legend_bounds_title'), body: tr('help_legend_bounds_body') }}>
                        <span className="control-label" style={{ marginBottom: 0 }}>{tr('group_legend')}</span>
                      </HelpTooltip>
                      <select className="select" style={{ width: 'auto' }} value={state.scaleType3D} onChange={(e) => set({ scaleType3D: e.target.value })}>
                        {SCALE_TYPES_3D.map((s) => (
                          <option key={s.value} value={s.value}>
                            {tr(s.labelKey)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                <div className="vertical-divider" />
                <div className="view-bar-group">
                  <IconToggle icon={IconSyncRotate} label={tr('toggle_sync_camera_3d')} on={state.syncCamera3D} onToggle={() => toggle('syncCamera3D')} help={{ title: tr('help_sync_camera_3d_title'), body: tr('help_sync_camera_3d_body'), note: tr('help_sync_camera_3d_note') }} />
                  <IconToggle icon={IconWireframe} label={tr('btn_wireframe')} on={state.wireframe} onToggle={() => toggle('wireframe')} help={{ title: tr('help_wireframe_title'), body: tr('help_wireframe_body') }} />
                </div>
                <div className="vertical-divider" />
                <div className="view-bar-group">
                  <div className="icon-toggle-row">
                    <IconToggle icon={IconSun} label={tr('toggle_sun_path')} on={state.sunPathEnabled} onToggle={() => toggle('sunPathEnabled')} help={{ title: tr('help_sun_path_title'), body: tr('help_sun_path_body') }} />
                    <WindModeToggle
                      mode={windMode}
                      loading={windMode === '3d' && windVolumeLoading}
                      onCycle={cycleWindMode}
                      label={windMode === '3d' && windVolumeLoading ? tr('toggle_wind_mode_3d_loading') : tr(`toggle_wind_mode_${windMode}`)}
                      help={{ title: tr('help_wind_mode_title'), body: tr('help_wind_mode_body') }}
                    />
                    <IconToggle icon={IconCalendar} label={tr('toggle_calendar_widget')} on={state.showCalendarWidget} onToggle={() => toggle('showCalendarWidget')} help={{ title: tr('help_calendar_widget_title'), body: tr('help_calendar_widget_body') }} />
                    <IconToggle icon={IconClock} label={tr('toggle_clock_widget')} on={state.showClockWidget} onToggle={() => toggle('showClockWidget')} help={{ title: tr('help_clock_widget_title'), body: tr('help_clock_widget_body') }} />
                  </div>
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

              {(loadedA || loadedB) && (
                <div className={`view-bar-modes view-bar-modes--${modesLayout}`} ref={viewBarModesRef}>
                  <Segmented options={compareOptions} value={state.compareMode3D} onSelect={setCompareMode3D} variant="accent" />
                  <Segmented options={renderStyleOptions} value={state.renderStyle} onSelect={(v) => set({ renderStyle: v })} variant="dark" />
                </div>
              )}
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

      <div className="model-viewer-row" ref={flipRef}>
        {panelKeys.map((key) => (
          <ModelPanel
            key={key}
            flipKey={key}
            {...panelProps[key]}
            flags={flags}
            wireframe={state.wireframe}
            vegStyle1={state.style1}
            projection={state.cameraProjection}
            gizmoNorthMode={state.gizmoNorthMode}
            sunPathEnabled={state.sunPathEnabled}
            showCalendarWidget={state.showCalendarWidget}
            showClockWidget={state.showClockWidget}
            widgetScale={state.widgetScale}
            timeLabel={timeLabel}
            cameraSyncRef={cameraSyncRef}
            cameraSyncEnabled={state.syncCamera3D && panelKeys.length === 2}
            blockedNoVerticalExtent={blockedNoVerticalExtent}
            sectionX={state.sectionX}
            sectionY={state.sectionY}
            sectionAngle={state.sectionAngle}
            onPivotChange={(i, j) => set({ sectionX: i, sectionY: j })}
            onAngleChange={(deg) => set({ sectionAngle: deg })}
            emptyHint={tr('model_empty_hint')}
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
                { name: filesetLabel('B'), color: 'var(--series-b)', values: state.compareMode3D !== 'single' ? pointSeriesB : null },
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
    </div>
  );
}
