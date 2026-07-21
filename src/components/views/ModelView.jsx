import { useEffect, useMemo, useState } from 'react';
import { useAppState } from '../../state/AppStateContext';
import { useI18n } from '../../i18n/I18nContext';
import { findInxFile, readINX } from '../../lib/inx';
import { loadObjectsVolume } from '../../lib/envimet';
import Model3DViewer from '../Model3DViewer';
import Segmented from '../controls/Segmented';

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

export default function ModelView() {
  const { state } = useAppState();
  const { tr } = useI18n();
  const loadedA = useInxModel(state.filesetA);
  const loadedB = useInxModel(state.filesetB);
  const objectsVolumeA = useObjectsVolume(state.filesetA);
  const objectsVolumeB = useObjectsVolume(state.filesetB);
  const [selected, setSelected] = useState('A');

  // il modello mostrato segue la selezione, con fallback sul fileset disponibile
  const available = { A: loadedA, B: loadedB };
  const shown = available[selected] ? selected : loadedA ? 'A' : loadedB ? 'B' : null;
  const loaded = shown ? available[shown] : null;
  const model = loaded?.model;
  const objectsVolume = shown === 'B' ? objectsVolumeB : objectsVolumeA;

  // stessa etichetta delle card di Analisi: "Fileset A · nomeSimulazione"
  const filesetLabel = (key) => {
    const fs = state[`fileset${key}`];
    const name = fs?.name ?? fs?.rootDir;
    const base = tr(key === 'A' ? 'chart_fileset_a' : 'chart_fileset_b');
    return name ? `${base} · ${name}` : base;
  };

  const stats = useMemo(() => {
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
  }, [model]);

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

  return (
    <>
      <div className="status-strip">
        {(loadedA || loadedB) && (
          <Segmented
            options={[
              { key: 'A', label: filesetLabel('A'), disabled: !loadedA },
              { key: 'B', label: filesetLabel('B'), disabled: !loadedB },
            ]}
            value={shown}
            onSelect={setSelected}
          />
        )}
        {stats && (
          <>
            <div className="chip">{tr('model_stats_grid')}: {stats.grid}</div>
            <div className="chip">{tr('model_stats_res')}: {stats.res}</div>
            <div className="chip">{tr('model_stats_height')}: {stats.height}</div>
            <div className="chip">{model.geometry.isFull3DDesign ? tr('model_mode_3d') : tr('model_mode_25d')}</div>
            <div className="chip">{loaded.fileName}</div>
          </>
        )}
      </div>
      <div className={`model-viewer${model ? ' is-3d' : ''}`}>
        {model ? (
          <>
            <Model3DViewer model={model} objectsVolume={objectsVolume} flags={flags} wireframe={state.wireframe} resetNonce={state.resetViewNonce} />
            <span className="model-overlay-hint">{tr('model_hint')}</span>
          </>
        ) : (
          <>
            <span className="chart-caption">{tr('model_caption')}</span>
            <span className="model-hint">{tr('model_empty_hint')}</span>
          </>
        )}
      </div>
    </>
  );
}
