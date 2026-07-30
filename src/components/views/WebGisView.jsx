import { useEffect, useMemo, useState } from 'react';
import { useAppState } from '../../state/AppStateContext';
import { useI18n } from '../../i18n/I18nContext';
import { MODEL_LAYERS } from '../../data/constants';
import { isBiometDataset, hasVerticalExtent } from '../../lib/envimet';
import { useInxModel, useObjectsVolume, useDataOverlay } from '../../lib/useModelData';
import { useSlices, useTerrainCut } from '../../lib/useSlice';
import { activePalette } from '../../data/palettes';
import { formatValue, orientColors, contourLegendGradient } from '../../lib/colormap';
import { overlayRange } from '../../lib/sliceRange';
import IconToggle from '../controls/IconToggle';
import Segmented from '../controls/Segmented';
import HelpTooltip from '../controls/HelpTooltip';
import { IconBuilding, IconTree, IconTerrain, IconReceptor, IconGrid, IconLayers3D, IconSectionX, IconSectionY, IconSettings } from '../icons/ToolbarIcons';
import WebGisViewer from '../WebGisViewer';
import { lowerLeftLngLat } from '../../lib/geodesy';

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

const DEFAULT_CALIBRATION = { offsetEast: 0, offsetNorth: 0, rotationDeg: 0, invert: false };

// La calibrazione (offset/rotazione) resta salvata per sito (nome località
// dell'INX) così non va rifatta ad ogni riapertura dello stesso progetto: non
// c'è un modo affidabile per sapere se lat/lon dell'INX indica il centro o un
// angolo del dominio (vedi WebGisViewer), quindi l'utente la calibra a vista
// contro la mappa satellitare la prima volta e da lì in poi resta memorizzata.
function calibrationKey(model) {
  return `envireader.webgisCalibration.${model?.location?.name || 'default'}`;
}

function useCalibration(model) {
  const key = model ? calibrationKey(model) : null;
  const [calibration, setCalibration] = useState(DEFAULT_CALIBRATION);

  useEffect(() => {
    if (!key) return;
    let next = DEFAULT_CALIBRATION;
    try {
      const saved = localStorage.getItem(key);
      if (saved) next = { ...DEFAULT_CALIBRATION, ...JSON.parse(saved) };
    } catch {
      // localStorage non disponibile o valore corrotto: ricalibrazione da zero
    }
    setCalibration(next);
  }, [key]);

  const update = (patch) => {
    setCalibration((prev) => {
      const next = { ...prev, ...patch };
      if (key) {
        try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* storage pieno o non disponibile */ }
      }
      return next;
    });
  };

  return [calibration, update];
}

export default function WebGisView() {
  const { state, toggle } = useAppState();
  const { tr } = useI18n();
  const viewBarCollapsed = state.viewBarCollapsed;
  const loaded = useInxModel(state.filesetA);
  const objectsVolume = useObjectsVolume(state.filesetA);
  const model = loaded?.model;
  const hasLocation = !!lowerLeftLngLat(model?.location);

  const [calibration, updateCalibration] = useCalibration(model);
  const [basemap, setBasemap] = useState('satellite');
  const [calibrationOpen, setCalibrationOpen] = useState(false);

  const terrainCutA = useTerrainCut(state.terrainA, state);
  const blockedNoVerticalExtent = !!state.edxMeta && !hasVerticalExtent(state.edxMeta?.dimensions);
  const dimZ = state.edxMeta?.dimensions?.z;
  const spacingZ = state.edxMeta?.spacing?.z;

  const biometFixActive = state.fixBiometSections && isBiometDataset(state.dataGroup, state.dataset);
  const sliceArgs = [state.dataGroup, state.dataset, state.time, state.level, state.sectionX, state.sectionY, state.sectionAngle];
  const slices = useSlices(state.filesetA, ...sliceArgs, terrainCutA, biometFixActive);

  const voxelViews = {
    plan: state.showDataVoxels && state.dataVoxelPlan,
    sectionX: state.showDataVoxels && state.dataVoxelSectionX,
    sectionY: state.showDataVoxels && state.dataVoxelSectionY,
  };
  const { palette: mainPalette, reversed: mainReversed } = activePalette(state, tr, 'main');
  const range = overlayRange(state.scaleType3D, state.customRanges, 'A', slices, {});
  const dataOverlay = useDataOverlay(slices, terrainCutA, voxelViews, mainPalette.colors, mainReversed, state.sectionX, state.sectionY, state.level, dimZ, state.dataVoxelSmooth, spacingZ, range, state.renderStyle === 'contour');

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

  const showViewer = !!(model && hasLocation && !blockedNoVerticalExtent);

  // "center" azzera tutto: con la georeferenziazione presa dall'INX il modello
  // è già al posto giusto senza correzioni, quindi il valore di riposo è zero e
  // non un mezzo dominio di offset. Restano sw/ne come spostamento manuale di
  // mezzo dominio, utile sui file senza coordinate UTM (dove si ricade sul
  // lon/lat arrotondato e l'angolo di riferimento non è garantito).
  const applyPreset = (corner) => {
    if (!model) return;
    const { I, J, dx, dy } = model.geometry;
    const presets = {
      center: { offsetEast: 0, offsetNorth: 0, rotationDeg: 0, invert: false },
      sw: { offsetEast: (I * dx) / 2, offsetNorth: (J * dy) / 2 },
      ne: { offsetEast: -(I * dx) / 2, offsetNorth: -(J * dy) / 2 },
    };
    updateCalibration(presets[corner]);
  };

  const basemapOptions = [
    { key: 'satellite', label: tr('webgis_basemap_satellite') },
    { key: 'streets', label: tr('webgis_basemap_streets') },
  ];

  return (
    <div className="model-view-page webgis-view-page">
      <div className={`view-bar${viewBarCollapsed ? ' view-bar-collapsed' : ''}`}>
        <div className="view-bar-collapse">
          <div className="view-bar-collapse-inner">
            <div className="view-bar-top">
              <div className="view-bar-panel">
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
                      </>
                    )}
                  </div>
                </div>
                <div className="vertical-divider" />
                <div className="view-bar-group">
                  <span className="control-label" style={{ marginBottom: 0 }}>{tr('webgis_group_basemap')}</span>
                  <Segmented options={basemapOptions} value={basemap} onSelect={setBasemap} variant="dark" />
                </div>
                <div className="vertical-divider" />
                <div className="view-bar-group">
                  <IconToggle
                    icon={IconSettings}
                    label={tr('webgis_calibration')}
                    on={calibrationOpen}
                    onToggle={() => setCalibrationOpen((v) => !v)}
                    help={{ title: tr('help_webgis_calibration_title'), body: tr('help_webgis_calibration_body') }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <HelpTooltip content={{ title: tr('help_collapse_toolbar_title'), body: tr('help_collapse_toolbar_body') }}>
          <button
            type="button"
            className="view-bar-toggle"
            onClick={() => toggle('viewBarCollapsed')}
            aria-label={tr(viewBarCollapsed ? 'btn_expand_toolbar' : 'btn_collapse_toolbar')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
          </button>
        </HelpTooltip>
      </div>

      {calibrationOpen && (
        <div className="webgis-calibration-panel">
          <div className="webgis-calibration-field">
            <label>{tr('webgis_offset_east')}</label>
            <input type="number" step="1" value={calibration.offsetEast} onChange={(e) => updateCalibration({ offsetEast: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="webgis-calibration-field">
            <label>{tr('webgis_offset_north')}</label>
            <input type="number" step="1" value={calibration.offsetNorth} onChange={(e) => updateCalibration({ offsetNorth: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="webgis-calibration-field">
            <label>{tr('webgis_rotation')}</label>
            <input type="number" step="1" value={calibration.rotationDeg} onChange={(e) => updateCalibration({ rotationDeg: parseFloat(e.target.value) || 0 })} />
          </div>
          <label className="webgis-calibration-checkbox">
            <input type="checkbox" checked={!!calibration.invert} onChange={(e) => updateCalibration({ invert: e.target.checked })} />
            {tr('webgis_invert_rotation')}
          </label>
          <div className="webgis-calibration-presets">
            <span>{tr('webgis_preset_label')}</span>
            <button type="button" onClick={() => applyPreset('center')}>{tr('webgis_preset_center')}</button>
            <button type="button" onClick={() => applyPreset('sw')}>{tr('webgis_preset_sw')}</button>
            <button type="button" onClick={() => applyPreset('ne')}>{tr('webgis_preset_ne')}</button>
          </div>
        </div>
      )}

      <div className="model-viewer-row">
        <div className="model-panel">
          <div className={`model-viewer${showViewer ? ' is-3d' : ''}`}>
            {showViewer ? (
              <WebGisViewer
                model={model}
                objectsVolume={objectsVolume}
                spacingZ={spacingZ}
                dimZ={dimZ}
                dataOverlay={dataOverlay}
                flags={flags}
                wireframe={state.wireframe}
                objectStyle={state.objectStyle}
                calibration={calibration}
                basemap={basemap}
              />
            ) : model && !hasLocation ? (
              <>
                <span className="chart-caption">{tr('model_caption')}</span>
                <span className="model-hint">{tr('webgis_no_location')}</span>
              </>
            ) : model && blockedNoVerticalExtent ? (
              <>
                <span className="chart-caption">{tr('model_no_vertical_caption')}</span>
                <span className="model-hint">{tr('model_no_vertical_hint')}</span>
              </>
            ) : (
              <>
                <span className="chart-caption">{tr('model_caption')}</span>
                <span className="model-hint">{tr('map_open_hint')}</span>
              </>
            )}
          </div>
          {showViewer && dataOverlay && (
            <div className="map-legend">
              <span className="map-legend-label">{formatValue(dataOverlay.range.min, dataOverlay.range.max - dataOverlay.range.min)}</span>
              <span
                className="map-legend-bar"
                style={{ background: dataOverlay.contour ? contourLegendGradient(dataOverlay.colors, dataOverlay.reversed) : `linear-gradient(90deg, ${orientColors(dataOverlay.colors, dataOverlay.reversed).join(',')})` }}
              />
              <span className="map-legend-label">{formatValue(dataOverlay.range.max, dataOverlay.range.max - dataOverlay.range.min)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
