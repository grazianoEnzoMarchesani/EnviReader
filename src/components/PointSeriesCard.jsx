import { useAppState } from '../state/AppStateContext';
import { useI18n } from '../i18n/I18nContext';
import TimeSeriesChart from './TimeSeriesChart';
import { usePointSeries, useBookmarkSeries, useTerrainCut } from '../lib/useSlice';
import { filesetLabel } from '../lib/labels';
import { bookmarkColor } from '../lib/bookmarkStore';

// Card "Time series" in fondo alle viste 2D e 3D: andamento nel tempo del
// valore nel punto selezionato (incrocio delle sezioni, livello corrente),
// più una serie per ciascuna posizione salvata in state.positionBookmarks
// (vedi bookmarkStore.js), per confrontarle senza spostare il mirino.
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
  const bookmarks = state.positionBookmarks;
  const bookmarkArgs = [state.dataGroup, state.dataset, bookmarks];
  const bookmarkSeriesA = useBookmarkSeries(state.filesetA, ...bookmarkArgs, terrainCutA);
  const bookmarkSeriesB = useBookmarkSeries(state.filesetB, ...bookmarkArgs, terrainCutB);
  const datasetLabel = state.edxMeta ? state.dataset : tr(state.dataset);

  const hasActiveSeries =
    (showA && pointSeriesA) || (showB && pointSeriesB) || bookmarks.some((b) => (showA && bookmarkSeriesA[b.id]) || (showB && bookmarkSeriesB[b.id]));

  return (
    <div className="timeseries-card">
      <div className="timeseries-header" onClick={() => toggle('timeSeriesOpen')}>
        <span className="chart-title">{tr('group_time_series')}</span>
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
              { name: filesetLabel(state, tr, 'A'), color: 'var(--series-a)', values: showA ? pointSeriesA : null },
              { name: filesetLabel(state, tr, 'B'), color: 'var(--series-b)', values: showB ? pointSeriesB : null },
              ...bookmarks.flatMap((b, i) => {
                const color = bookmarkColor(i);
                const entries = [];
                if (showA) entries.push({ name: showB ? `${b.name} · A` : b.name, color, values: bookmarkSeriesA[b.id] });
                if (showB) entries.push({ name: `${b.name} · B`, color, values: bookmarkSeriesB[b.id] });
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
