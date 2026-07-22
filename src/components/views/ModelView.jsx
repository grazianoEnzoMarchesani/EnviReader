import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppState } from '../../state/AppStateContext';
import { useI18n } from '../../i18n/I18nContext';
import { MODEL_LAYERS } from '../../data/constants';
import { findInxFile, readINX } from '../../lib/inx';
import { loadObjectsVolume } from '../../lib/envimet';
import { sunPosition, sunPathSamples, sunDiagramCurves, estimateTimezoneOffset } from '../../lib/sunPosition';
import { getSunSample, formatDateLabel, formatHourLabel } from '../../lib/sunLink';
import Model3DViewer from '../Model3DViewer';
import TimeSeriesChart from '../TimeSeriesChart';
import Segmented from '../controls/Segmented';
import Slider from '../controls/Slider';
import IconToggle from '../controls/IconToggle';
import { IconBuilding, IconTree, IconTerrain, IconReceptor, IconGrid, IconWireframe, IconSun, IconLayers3D, IconSectionX, IconSectionY, IconSmoothSurface } from '../icons/ToolbarIcons';
import { useFlip } from '../../lib/useFlip';
import { usePointSeries, useSlices, useTerrainCut } from '../../lib/useSlice';
import { findPalette } from '../../data/palettes';
import { formatValue, orientColors } from '../../lib/colormap';

const LAYER_ICONS = {
  showBuildings: IconBuilding,
  showVegetation: IconTree,
  showTerrain: IconTerrain,
  showReceptors: IconReceptor,
  showGrid: IconGrid,
};

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
    [state.seriesLabels, state.time, state.sunTimeOverride],
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

// Confeziona l'overlay voxel di un fileset per il viewer 3D: stesso dato e
// stessa palette della vista 2D, con un range unico condiviso tra i piani
// attivi (pianta/sezioni) così i colori restano confrontabili quando più piani
// sono visibili insieme. null se non c'è nulla da mostrare (overlay spento,
// nessun piano attivo, o dataset non ancora caricato).
function useDataOverlay(slices, terrainCut, views, colors, reversed, sectionX, sectionY, level, dimZ, smooth, spacingZ) {
  return useMemo(() => {
    if (!dimZ || (!views.plan && !views.sectionX && !views.sectionY)) return null;
    const active = [
      views.plan && slices.plan,
      views.sectionX && slices.sectionX,
      views.sectionY && slices.sectionY,
    ].filter(Boolean);
    if (!active.length) return null;
    let min = Infinity;
    let max = -Infinity;
    for (const s of active) {
      if (s.min < min) min = s.min;
      if (s.max > max) max = s.max;
    }
    if (min === Infinity) { min = 0; max = 0; }
    return {
      views: {
        plan: views.plan ? slices.plan : null,
        sectionX: views.sectionX ? slices.sectionX : null,
        sectionY: views.sectionY ? slices.sectionY : null,
      },
      range: { min, max },
      colors,
      reversed,
      pivot: { sectionX, sectionY },
      terrainCut,
      level,
      dimZ,
      smooth,
      spacingZ,
    };
  }, [slices.plan, slices.sectionX, slices.sectionY, terrainCut, views.plan, views.sectionX, views.sectionY, colors, reversed, sectionX, sectionY, level, dimZ, smooth, spacingZ]);
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
function ModelPanel({ flipKey, title, loaded, objectsVolume, spacingZ, dataOverlay, datasetLabel, flags, wireframe, resetNonce, projection, gizmoNorthMode, sun, sunPathEnabled, emptyHint }) {
  const { tr } = useI18n();
  const model = loaded?.model;
  const stats = computeStats(model);
  const { hasLocation, sunActive, sunInfo, sunPathPoints, sunDiagram, sunSample } = sun;

  return (
    <div className="model-panel" data-flip-key={flipKey}>
      <div className="chart-header">
        <div className="chart-title">{title}</div>
        {stats && (
          <div className="chart-stats">
            {tr('model_stats_grid')}: {stats.grid} · {tr('model_stats_res')}: {stats.res} · {tr('model_stats_height')}: {stats.height}
          </div>
        )}
      </div>
      <div className={`model-viewer${model ? ' is-3d' : ''}`}>
        {model ? (
          <>
            <Model3DViewer
              model={model}
              objectsVolume={objectsVolume}
              spacingZ={spacingZ}
              dataOverlay={dataOverlay}
              flags={flags}
              wireframe={wireframe}
              resetNonce={resetNonce}
              projection={projection}
              sunEnabled={sunActive}
              sunAzimuth={sunInfo?.azimuth}
              sunAltitude={sunInfo?.altitude}
              sunPathPoints={sunPathPoints}
              sunDiagram={sunDiagram}
              gizmoNorthMode={gizmoNorthMode}
            />
            {dataOverlay && (
              <div className="data-voxel-legend">
                <span className="data-voxel-legend-title">{datasetLabel}</span>
                <span className="map-legend-label">{formatValue(dataOverlay.range.min, dataOverlay.range.max - dataOverlay.range.min)}</span>
                <span
                  className="map-legend-bar"
                  style={{ background: `linear-gradient(90deg, ${orientColors(dataOverlay.colors, dataOverlay.reversed).join(',')})` }}
                />
                <span className="map-legend-label">{formatValue(dataOverlay.range.max, dataOverlay.range.max - dataOverlay.range.min)}</span>
              </div>
            )}
            {sunActive && sunInfo && (
              <div className="sun-info-panel">
                <div className="sun-info-row">
                  <span>{tr('sun_time')}</span>
                  <strong>
                    {sunSample.hasSeries
                      ? sunSample.label
                      : `${formatDateLabel(sunSample.date)} · ${formatHourLabel(sunSample.hour)} (${tr('sun_fallback_date')})`}
                  </strong>
                </div>
                {sunSample.hasSeries && (
                  <div className="sun-info-row">
                    <span>{tr('sun_timestep')}</span>
                    <strong>{sunSample.index + 1} / {sunSample.count}</strong>
                  </div>
                )}
                <div className="sun-info-row"><span>{tr('sun_azimuth')}</span><strong>{sunInfo.azimuth.toFixed(1)}°</strong></div>
                <div className="sun-info-row"><span>{tr('sun_altitude')}</span><strong>{sunInfo.altitude.toFixed(1)}°</strong></div>
              </div>
            )}
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

  // Overlay voxel del dataset corrente nel viewer 3D: stesso dato/palette
  // della vista 2D Data Analysis, disegnato in pianta e/o nelle sezioni a
  // scelta dell'utente (vedi toggle "Data overlay" nella toolbar).
  const draft = state.paletteDraft;
  const draftPalette = draft && { id: '__draft', name: draft.name.trim() || tr('custom_default_name'), colors: draft.colors };
  const activePalette = draft?.target === 'main' ? draftPalette : findPalette(state.palette, 'main', state.customPalettes);
  const mainReversed = draft?.target === 'main' ? false : state.paletteReversed;
  const sliceArgs = [state.dataGroup, state.dataset, state.time, state.level, state.sectionX, state.sectionY, state.sectionAngle];
  const slicesA = useSlices(state.filesetA, ...sliceArgs, terrainCutA);
  const slicesB = useSlices(state.filesetB, ...sliceArgs, terrainCutB);
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
  const dataOverlayA = useDataOverlay(slicesA, terrainCutA, voxelViews, activePalette.colors, mainReversed, state.sectionX, state.sectionY, state.level, dimZ, state.dataVoxelSmooth, spacingZ);
  const dataOverlayB = useDataOverlay(slicesB, terrainCutB, voxelViews, activePalette.colors, mainReversed, state.sectionX, state.sectionY, state.level, dimZ, state.dataVoxelSmooth, spacingZ);

  const sunSample = useMemo(
    () => getSunSample(state),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.seriesLabels, state.time, state.sunTimeOverride],
  );

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
  const compareOptions = [
    { key: 'single', label: tr('compare_single') },
    { key: 'b', label: tr('compare_b'), disabled: !state.filesetBOpen, title: !state.filesetBOpen ? tr('hint_open_b') : undefined },
    { key: 'ab', label: tr('compare_ab'), disabled: !state.filesetBOpen, title: !state.filesetBOpen ? tr('hint_open_b') : undefined },
  ];
  const panelKeys = state.compareMode3D === 'ab' ? ['A', 'B'] : state.compareMode3D === 'b' ? ['B'] : ['A'];

  const panelProps = {
    A: { title: filesetLabel('A'), loaded: loadedA, objectsVolume: objectsVolumeA, spacingZ, dataOverlay: dataOverlayA, datasetLabel, sun: sunA },
    B: { title: filesetLabel('B'), loaded: loadedB, objectsVolume: objectsVolumeB, spacingZ, dataOverlay: dataOverlayB, datasetLabel, sun: sunB },
  };
  const flipRef = useFlip();

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
  }, [state.compareMode3D, state.filesetBOpen, loadedA, loadedB]);

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
                      <IconToggle key={l.key} icon={LAYER_ICONS[l.key]} label={tr(l.labelKey)} on={state[l.key]} onToggle={() => toggle(l.key)} />
                    ))}
                  </div>
                </div>
                <div className="vertical-divider" />
                <div className="view-bar-group">
                  <span className="control-label" style={{ marginBottom: 0 }}>{tr('model_group_data_overlay')}</span>
                  <div className="icon-toggle-row">
                    <IconToggle icon={IconLayers3D} label={tr('toggle_data_voxels')} on={state.showDataVoxels} onToggle={() => toggle('showDataVoxels')} />
                    {state.showDataVoxels && (
                      <>
                        <IconToggle icon={IconGrid} label={tr('toggle_data_voxel_plan')} on={state.dataVoxelPlan} onToggle={() => toggle('dataVoxelPlan')} />
                        <IconToggle icon={IconSectionX} label={tr('toggle_data_voxel_sectionx')} on={state.dataVoxelSectionX} onToggle={() => toggle('dataVoxelSectionX')} />
                        <IconToggle icon={IconSectionY} label={tr('toggle_data_voxel_sectiony')} on={state.dataVoxelSectionY} onToggle={() => toggle('dataVoxelSectionY')} />
                        <div className="vertical-divider" />
                        <IconToggle icon={IconSmoothSurface} label={tr('toggle_data_voxel_smooth')} on={state.dataVoxelSmooth} onToggle={() => toggle('dataVoxelSmooth')} />
                      </>
                    )}
                  </div>
                </div>
                <div className="vertical-divider" />
                <div className="view-bar-group">
                  <button
                    type="button"
                    className="ghost-btn"
                    style={{ width: 'auto', marginBottom: 0 }}
                    onClick={() => set((s) => ({ resetViewNonce: s.resetViewNonce + 1 }))}
                  >
                    {tr('btn_reset_view')}
                  </button>
                  <Segmented
                    options={[
                      { key: 'perspective', label: tr('proj_perspective') },
                      { key: 'parallel', label: tr('proj_parallel') },
                    ]}
                    value={state.cameraProjection}
                    onSelect={(key) => set({ cameraProjection: key })}
                  />
                  <IconToggle icon={IconWireframe} label={tr('btn_wireframe')} on={state.wireframe} onToggle={() => toggle('wireframe')} />
                  <Segmented
                    options={[
                      { key: 'true', label: tr('north_ref_true') },
                      { key: 'grid', label: tr('north_ref_grid') },
                    ]}
                    value={state.gizmoNorthMode}
                    onSelect={(key) => set({ gizmoNorthMode: key })}
                  />
                </div>
                <div className="vertical-divider" />
                <div className="view-bar-group">
                  <IconToggle icon={IconSun} label={tr('toggle_sun_path')} on={state.sunPathEnabled} onToggle={() => toggle('sunPathEnabled')} />
                  {state.sunPathEnabled && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {sunSample.hasSeries ? (
                        <Slider
                          label={`${tr('slider_sun_timestep')} (${sunSample.index + 1}/${sunSample.count})`}
                          value={sunSample.index}
                          min={0}
                          max={Math.max(0, sunSample.count - 1)}
                          step={1}
                          onChange={(v) => set({ sunTimeOverride: v })}
                        />
                      ) : (
                        <Slider
                          label={tr('slider_sun_hour')}
                          value={Math.round(sunSample.hour * 4) / 4}
                          min={0}
                          max={24}
                          step={0.25}
                          unit="h"
                          onChange={(v) => set({ sunTimeOverride: v })}
                        />
                      )}
                      <span className="muted-inline" style={{ marginLeft: 0 }}>
                        {sunSample.hasSeries
                          ? (sunSample.isLinked ? tr('sun_linked_date') : tr('sun_custom_time'))
                          : `${tr('sun_fallback_date')}: ${formatDateLabel(sunSample.date)}`}
                      </span>
                      {state.sunTimeOverride != null && (
                        <button
                          type="button"
                          className="ghost-btn"
                          style={{ width: 'auto', marginBottom: 0 }}
                          onClick={() => set({ sunTimeOverride: null })}
                        >
                          {tr('btn_sync_sun_time')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {(loadedA || loadedB) && (
                <div className={`view-bar-modes view-bar-modes--${modesLayout}`} ref={viewBarModesRef}>
                  <Segmented options={compareOptions} value={state.compareMode3D} onSelect={setCompareMode3D} variant="accent" />
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          className="view-bar-toggle"
          onClick={() => setViewBarCollapsed((v) => !v)}
          title={tr(viewBarCollapsed ? 'btn_expand_toolbar' : 'btn_collapse_toolbar')}
          aria-label={tr(viewBarCollapsed ? 'btn_expand_toolbar' : 'btn_collapse_toolbar')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>
      </div>

      <div className="model-viewer-row" ref={flipRef}>
        {panelKeys.map((key) => (
          <ModelPanel
            key={key}
            flipKey={key}
            {...panelProps[key]}
            flags={flags}
            wireframe={state.wireframe}
            resetNonce={state.resetViewNonce}
            projection={state.cameraProjection}
            gizmoNorthMode={state.gizmoNorthMode}
            sunPathEnabled={state.sunPathEnabled}
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
