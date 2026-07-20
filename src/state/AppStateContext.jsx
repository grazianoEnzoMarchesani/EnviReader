import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DATA_GROUPS, DATASETS } from '../data/constants';
import { pickDirectory, listDataGroups, getFilesInFolder, getFileCoupleSeries, readEDX, seriesLabel, loadTerrain, readSimName } from '../lib/envimet';
import { loadCustomPalettes, persistCustomPalettes } from '../lib/paletteStore';
import { loadCustomPresets, persistCustomPresets, nearestTimeIndex } from '../lib/presetStore';

const initialState = {
  theme: 'light',
  appView: 'analysis',
  activeTab: 'data',
  compareMode: 'single',
  viewType: 'plan',
  filesetAOpen: false,
  filesetBOpen: false,
  loadingFileset: null, // 'A' | 'B' mentre la cartella scelta viene letta e analizzata
  // fileset caricati: { rootDir, structure } (File handle in memoria, non serializzabili)
  filesetA: null,
  filesetB: null,
  terrainA: null,
  terrainB: null,
  dataGroups: [], // percorsi con coppie EDT/EDX; vuoto finché non si apre un fileset
  edxMeta: null, // { dimensions, spacing, extent, variableNames } del gruppo corrente
  seriesLabels: [], // etichette temporali della serie corrente
  dataGroup: DATA_GROUPS[0],
  dataset: DATASETS[0],
  time: 0,
  level: 0,
  sectionX: 0,
  sectionY: 0,
  sectionAngle: 0, // rotazione (°, antioraria) della croce di sezioni in pianta; 0 = ortogonale
  sectionLineWidth: 1, // spessore (px) della croce di sezioni in pianta
  sectionLineGap: 3, // distanza (px) tra i tratti del tratteggio; il trattino resta fisso a 4px
  sectionLineColor: null, // colore custom della croce; null = colore di tema (testo, 65%)
  scaleFactor: 3,
  followTerrain: true,
  levelOut: true, // "livella salendo": smorza il rilievo con la quota, vedi terrainCut
  levelOutHeight: 1, // quota di transizione (livelli): oltre, il piano è orizzontale
  windOpacity: 50,
  windSize: 50,
  windDensity: 50,
  showWindField: false,
  showObjectsOverlay: false,
  objOverlayOpacity: 70,
  objOverlayBuildings: true,
  objOverlayTerrain: true,
  objOverlayVegetation: true,
  windStyle: 'arrows', // 'arrows' | 'streamlines'
  palette: 'Turbo',
  paletteOpen: false,
  paletteReversed: false,
  diffPalette: 'RdBu',
  diffPaletteOpen: false,
  diffPaletteReversed: false,
  customPalettes: loadCustomPalettes(), // palette dell'utente, persistite in localStorage
  customPresets: loadCustomPresets(), // preset dell'utente, persistiti in localStorage
  paletteDraft: null, // editor aperto: { target: 'main'|'diff', editingId, name, colors }
  diffOrderAB: true,
  scaleType: 'syncedViews',
  customRanges: {},
  customRangeModal: null,
  timeSeriesOpen: true,
  showCredits: false,
  viewSettingsOpen: false,
  showBuildings: true,
  showVegetation: true,
  showTerrain: true,
  showReceptors: false,
  showGrid: false,
  showNorthArrow: true,
  showCalendarWidget: true,
  showClockWidget: true,
  wireframe: false,
  resetViewNonce: 0, // incrementato da "Reimposta vista": il viewer 3D lo osserva
  // condizioni al contorno: fileset mostrato, periodo dei grafici FOX,
  // eventuale file FOX aperto a mano quando non è nella cartella risultati
  boundaryFileset: 'A',
  boundaryPeriod: 'all', // 'all' | 'sim' | 'custom' | 'm:YYYY-MM'
  boundaryRange: null, // [i0, i1] della selezione manuale (brush)
  foxFileA: null,
  foxFileB: null,
};

const AppStateContext = createContext(null);

// Legge l'EDX del primo file del gruppo: variabili, dimensioni, serie temporale
async function analyzeGroup(fileset, groupPath) {
  const series = getFileCoupleSeries(getFilesInFolder(fileset.structure, groupPath));
  if (!series.length) return { edxMeta: null, seriesLabels: [] };
  return {
    edxMeta: await readEDX(series[0].EDX),
    seriesLabels: series.map((pair) => seriesLabel(pair.EDT.name)),
  };
}

function clampPatch(prev, edxMeta) {
  const dims = edxMeta?.dimensions;
  return {
    time: 0,
    level: dims ? Math.min(prev.level, Math.max(0, dims.z - 1)) : prev.level,
    sectionX: dims ? Math.min(prev.sectionX, Math.max(0, dims.x - 1)) : prev.sectionX,
    sectionY: dims ? Math.min(prev.sectionY, Math.max(0, dims.y - 1)) : prev.sectionY,
  };
}

export function AppStateProvider({ children }) {
  const [state, setState] = useState(initialState);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // il tema è applicato come attributo sul <html>: i token CSS fanno il resto
  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
  }, [state.theme]);

  // le palette personalizzate sopravvivono alla chiusura del browser
  useEffect(() => {
    persistCustomPalettes(state.customPalettes);
  }, [state.customPalettes]);

  useEffect(() => {
    persistCustomPresets(state.customPresets);
  }, [state.customPresets]);

  const actions = useMemo(() => {
    const set = (patch) => setState((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));

    // Prepara la patch di stato dopo l'apertura di una cartella risultati
    const buildLoadPatch = async (key, fileset) => {
      const prev = stateRef.current;
      // nome mostrato all'utente: il <simName> del SIMX in inputData, altrimenti la cartella
      fileset.name = (await readSimName(fileset.structure)) ?? fileset.rootDir;
      // i gruppi visibili seguono il fileset A quando è presente
      const groups = key === 'B' && prev.filesetA ? prev.dataGroups : listDataGroups(fileset.structure);
      const lead = key === 'A' ? fileset : prev.filesetA || fileset;
      const group = groups.includes(prev.dataGroup) ? prev.dataGroup : groups[0];
      const { edxMeta, seriesLabels } = group != null ? await analyzeGroup(lead, group) : { edxMeta: null, seriesLabels: [] };
      const variables = edxMeta?.variableNames ?? [];
      return {
        [`fileset${key}`]: fileset,
        [`fileset${key}Open`]: true,
        [`terrain${key}`]: await loadTerrain(fileset.structure),
        dataGroups: groups,
        dataGroup: group ?? prev.dataGroup,
        edxMeta,
        seriesLabels,
        dataset: variables.includes(prev.dataset) ? prev.dataset : variables[0] ?? prev.dataset,
        ...clampPatch(prev, edxMeta),
      };
    };

    const openFileset = async (key) => {
      if (stateRef.current.loadingFileset) return;
      try {
        // il flag si accende solo dopo che l'utente ha concesso il permesso:
        // prima c'è il dialogo nativo del browser, che fa da sé da indicatore
        const fileset = await pickDirectory(() => set({ loadingFileset: key }));
        if (fileset) set({ ...(await buildLoadPatch(key, fileset)), loadingFileset: null });
        else set({ loadingFileset: null });
      } catch (err) {
        set({ loadingFileset: null });
        throw err;
      }
    };

    const applyFileset = async (key, fileset) => set(await buildLoadPatch(key, fileset));

    return {
      set,
      applyFileset,
      toggle: (key) => set((s) => ({ [key]: !s[key] })),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
      openFilesetA: () => openFileset('A'),
      // chiudere il fileset B riporta sempre il confronto a "single"
      toggleFilesetB: () => {
        if (stateRef.current.filesetBOpen) {
          set({ filesetB: null, terrainB: null, filesetBOpen: false, compareMode: 'single', foxFileB: null, scaleFactor: 3 });
        } else {
          openFileset('B');
        }
      },
      setDataGroup: async (path) => {
        const prev = stateRef.current;
        const lead = prev.filesetA || prev.filesetB;
        if (!lead) {
          set({ dataGroup: path });
          return;
        }
        const { edxMeta, seriesLabels } = await analyzeGroup(lead, path);
        const variables = edxMeta?.variableNames ?? [];
        set({
          dataGroup: path,
          edxMeta,
          seriesLabels,
          dataset: variables.includes(prev.dataset) ? prev.dataset : variables[0] ?? prev.dataset,
          ...clampPatch(prev, edxMeta),
        });
      },
      setCompareMode: (mode) => set((s) => {
        if (mode !== 'single' && !s.filesetBOpen) return {};
        const isCurrentlySingle = s.compareMode === 'single' || s.compareMode === 'b';
        const willBeSingle = mode === 'single' || mode === 'b';
        let newScale = s.scaleFactor;
        if (isCurrentlySingle && !willBeSingle) newScale = 1;
        else if (!isCurrentlySingle && willBeSingle) newScale = 3;
        return { compareMode: mode, scaleFactor: newScale };
      }),
      // Applica un preset: ogni campo è opzionale e viene ignorato se non ha
      // riscontro nel fileset aperto (gruppo/variabile assenti, indici fuori griglia)
      applyPreset: async (preset) => {
        const s = preset?.settings;
        if (!s) return;
        const prev = stateRef.current;
        const lead = prev.filesetA || prev.filesetB;
        let { edxMeta, seriesLabels } = prev;
        const patch = {};
        if (s.dataGroup != null && lead && prev.dataGroups.includes(s.dataGroup) && s.dataGroup !== prev.dataGroup) {
          ({ edxMeta, seriesLabels } = await analyzeGroup(lead, s.dataGroup));
          Object.assign(patch, { dataGroup: s.dataGroup, edxMeta, seriesLabels });
        }
        const variables = edxMeta?.variableNames ?? [];
        if (s.dataset != null && variables.includes(s.dataset)) patch.dataset = s.dataset;
        // i preset nuovi salvano l'ora del giorno, quelli vecchi un indice grezzo
        if (s.hour != null && seriesLabels.length) patch.time = nearestTimeIndex(seriesLabels, s.hour);
        else if (s.timeIndex != null) patch.time = Math.max(0, Math.min(s.timeIndex, Math.max(0, seriesLabels.length - 1)));
        const dims = edxMeta?.dimensions;
        const clampTo = (v, max) => Math.max(0, Math.min(v, max));
        if (s.level != null) patch.level = dims ? clampTo(s.level, dims.z - 1) : s.level;
        if (s.sectionX != null) patch.sectionX = dims ? clampTo(s.sectionX, dims.x - 1) : s.sectionX;
        if (s.sectionY != null) patch.sectionY = dims ? clampTo(s.sectionY, dims.y - 1) : s.sectionY;
        if (s.levelOutHeight != null) patch.levelOutHeight = Math.max(1, dims ? clampTo(s.levelOutHeight, dims.z - 1) : s.levelOutHeight);
        for (const k of ['sectionAngle', 'followTerrain', 'levelOut', 'showWindField', 'showObjectsOverlay', 'windStyle', 'windOpacity', 'windSize', 'windDensity', 'scaleType', 'palette', 'paletteReversed', 'diffPalette', 'diffPaletteReversed']) {
          if (s[k] != null) patch[k] = s[k];
        }
        set(patch);
      },
      openPaletteDropdown: (which) =>
        set((s) => ({
          paletteOpen: which === 'main' ? !s.paletteOpen : false,
          diffPaletteOpen: which === 'diff' ? !s.diffPaletteOpen : false,
        })),
    };
  }, []);

  // Hook di sviluppo: permette ai test di iniettare un fileset senza directory picker
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.__envireader = { applyFileset: actions.applyFileset, getState: () => stateRef.current };
    return () => { delete window.__envireader; };
  }, [actions]);

  const value = useMemo(() => ({ state, ...actions }), [state, actions]);
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
