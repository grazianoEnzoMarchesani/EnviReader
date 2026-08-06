import { useAppState } from '../state/AppStateContext';
import { useI18n } from '../i18n/I18nContext';
import TimeSeriesChart from './TimeSeriesChart';
import { usePointSeries, useCursorSeries, useTerrainCut } from '../lib/useSlice';
import { effectiveCursorColor } from '../lib/cursorStore';

// Card "Time series" in fondo alle viste 2D e 3D: andamento nel tempo del
// valore nel punto selezionato (incrocio delle sezioni, livello corrente),
// più una serie per ciascuna posizione salvata in state.positionCursors
// (vedi cursorStore.js), per confrontarle senza spostare il mirino.
// Stesso pannello in entrambe le viste; l'unica differenza è quale selettore
// di confronto decide se mostrare anche la serie di B (compareMode in 2D,
// compareMode3D nel viewer 3D), passato come `showB`.
export default function PointSeriesCard({ showA = true, showB }) {
  const { state, toggle, set } = useAppState();
  const { tr } = useI18n();

  const terrainCutA = useTerrainCut(state.terrainA, state);
  const terrainCutB = useTerrainCut(state.terrainB, state);
  const pointArgs = [state.dataGroup, state.dataset, state.sectionX, state.sectionY, state.level];
  const pointSeriesA = usePointSeries(state.filesetA, ...pointArgs, terrainCutA);
  const pointSeriesB = usePointSeries(state.filesetB, ...pointArgs, terrainCutB);
  // Ogni cursore porta con sé la propria modalità "segui il terreno": il
  // taglio va ricalcolato per cursore (vedi useCursorSeries), quindi qui
  // si passa il terreno grezzo del fileset, non terrainCutA/B (che riflette
  // solo l'impostazione corrente, usata per la sola serie "in tempo reale").
  const cursors = state.positionCursors;
  const cursorArgs = [state.dataGroup, state.dataset, cursors];
  const cursorSeriesA = useCursorSeries(state.filesetA, ...cursorArgs, state.terrainA);
  const cursorSeriesB = useCursorSeries(state.filesetB, ...cursorArgs, state.terrainB);
  const datasetLabel = state.edxMeta ? state.dataset : tr(state.dataset);

  const hasActiveSeries =
    (showA && pointSeriesA) || (showB && pointSeriesB) || cursors.some((b) => (showA && cursorSeriesA[b.id]) || (showB && cursorSeriesB[b.id]));

  // Se il mirino live è esattamente sulla posizione di un cursore salvato
  // (stessa sezione, livello, angolo e modalità terreno) le due serie sono
  // dati identici sovrapposti pixel su pixel: disegnarle entrambe non aggiunge
  // informazione e degrada solo la lettura (linee/tratteggi che si accavallano).
  // In quel caso si nasconde la linea "cursore live" e si segnala l'unione
  // sul cursore coincidente.
  const liveCursor = cursors.find(
    (b) =>
      b.sectionX === state.sectionX &&
      b.sectionY === state.sectionY &&
      b.level === state.level &&
      b.sectionAngle === state.sectionAngle &&
      b.followTerrain === state.followTerrain,
  );
  const crosshairLabel = tr('ts_live_cursor_label');

  // Payoff sotto il titolo: dice a chi legge il grafico (senza contesto sul
  // progetto) quale nome reale si nasconde dietro le lettere A/B usate in
  // legenda, dato che i due fileset possono chiamarsi allo stesso modo.
  const filesetAName = state.filesetA?.name ?? state.filesetA?.rootDir;
  const filesetBName = state.filesetB?.name ?? state.filesetB?.rootDir;
  const showPayoffA = showA && filesetAName;
  const showPayoffB = showB && filesetBName;

  return (
    <div className="timeseries-card">
      <div className="timeseries-header" onClick={() => toggle('timeSeriesOpen')}>
        <div className="chart-title-group">
          <span className="chart-title">{tr('group_time_series')}</span>
          {hasActiveSeries && (showPayoffA || showPayoffB) && (
            <span className="chart-legend-payoff">
              {showPayoffA && <span style={{ color: 'var(--series-a)' }}>A · {filesetAName}</span>}
              {showPayoffB && <span style={{ color: 'var(--series-b)' }}>B · {filesetBName}</span>}
            </span>
          )}
        </div>
        {hasActiveSeries && (
          <span className="chart-stats">
            {datasetLabel} · {tr('chip_sectionx_prefix')} {state.sectionX}, {tr('chip_sectiony_prefix')} {state.sectionY} · {tr('chip_level_prefix')} {state.level}
          </span>
        )}
        <span className={`chevron${state.timeSeriesOpen ? ' open' : ''}`} />
      </div>
      {state.timeSeriesOpen &&
        (hasActiveSeries ? (
          <TimeSeriesChart
            series={[
              // La linea "mirino" resta visibile finché i dati del cursore
              // coincidente non sono effettivamente arrivati (caricamento
              // asincrono): altrimenti, nel breve istante fra il salvataggio
              // del cursore e la fine del suo caricamento, non ci sarebbe
              // alcuna linea disegnabile e il grafico collasserebbe.
              ...(liveCursor && cursorSeriesA[liveCursor.id]
                ? []
                : [{ name: `${crosshairLabel} · A`, color: 'var(--series-a)', values: showA ? pointSeriesA : null }]),
              ...(liveCursor && cursorSeriesB[liveCursor.id]
                ? []
                : [{ name: `${crosshairLabel} · B`, color: 'var(--series-b)', dashed: true, values: showB ? pointSeriesB : null }]),
              ...cursors.flatMap((b, i) => {
                const color = effectiveCursorColor(b, i);
                const entries = [];
                if (showA) entries.push({ name: showB ? `${b.name} · A` : b.name, color, values: cursorSeriesA[b.id] });
                if (showB) entries.push({ name: `${b.name} · B`, color, dashed: true, values: cursorSeriesB[b.id] });
                return entries;
              }),
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
  );
}
