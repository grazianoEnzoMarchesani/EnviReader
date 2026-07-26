import { useAppState } from '../state/AppStateContext';
import { useI18n } from '../i18n/I18nContext';
import TimeSeriesChart from './TimeSeriesChart';
import { usePointSeries, useTerrainCut } from '../lib/useSlice';
import { filesetLabel } from '../lib/labels';

// Card "Time series" in fondo alle viste 2D e 3D: andamento nel tempo del
// valore nel punto selezionato (incrocio delle sezioni, livello corrente).
// Stesso pannello in entrambe le viste; l'unica differenza è quale selettore
// di confronto decide se mostrare anche la serie di B (compareMode in 2D,
// compareMode3D nel viewer 3D), passato come `showB`.
export default function PointSeriesCard({ showB }) {
  const { state, toggle, set } = useAppState();
  const { tr } = useI18n();

  const terrainCutA = useTerrainCut(state.terrainA, state);
  const terrainCutB = useTerrainCut(state.terrainB, state);
  const pointArgs = [state.dataGroup, state.dataset, state.sectionX, state.sectionY, state.level];
  const pointSeriesA = usePointSeries(state.filesetA, ...pointArgs, terrainCutA);
  const pointSeriesB = usePointSeries(state.filesetB, ...pointArgs, terrainCutB);
  const datasetLabel = state.edxMeta ? state.dataset : tr(state.dataset);

  return (
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
              { name: filesetLabel(state, tr, 'A'), color: 'var(--series-a)', values: pointSeriesA },
              { name: filesetLabel(state, tr, 'B'), color: 'var(--series-b)', values: showB ? pointSeriesB : null },
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
