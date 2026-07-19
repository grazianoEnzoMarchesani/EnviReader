import { useAppState } from '../../state/AppStateContext';
import { useI18n } from '../../i18n/I18nContext';
import { useForcing } from '../../lib/useForcing';
import Select from '../controls/Select';

// Sidebar delle condizioni al contorno: scelta del fileset e del periodo
// mostrato nei grafici FOX. La sorgente (Simple/Full) non si sceglie: la
// determina il SIMX del fileset.
export default function BoundarySidebar() {
  const { state, set } = useAppState();
  const { tr, lang } = useI18n();

  const shown = state[`fileset${state.boundaryFileset}`] ? state.boundaryFileset : state.filesetA ? 'A' : state.filesetB ? 'B' : null;
  const fileset = shown ? state[`fileset${shown}`] : null;
  const forcing = useForcing(fileset, shown ? state[`foxFile${shown}`] : null);
  const fox = forcing?.fox;


  const monthLabel = (key) => {
    const label = new Intl.DateTimeFormat(lang === 'it' ? 'it-IT' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(`${key}-01T00:00:00Z`));
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const getSimPeriodLabel = () => {
    let base = tr('period_sim');
    const hours = parseFloat(forcing?.simx?.mainData?.simDuration);
    if (Number.isFinite(hours) && hours > 0) {
      if (hours % 24 === 0) {
        const days = hours / 24;
        base += ` (${days} ${days === 1 ? tr('duration_day') : tr('duration_days')})`;
      } else {
        base += ` (${hours} ${hours === 1 ? tr('duration_hour') : tr('duration_hours')})`;
      }
    }
    return base;
  };

  const periodOptions = fox
    ? [
        { value: 'all', label: tr('period_all') },
        ...(forcing.window ? [{ value: 'sim', label: getSimPeriodLabel() }] : []),
        ...(state.boundaryPeriod === 'custom' ? [{ value: 'custom', label: tr('period_custom') }] : []),
        ...(fox.months.length > 1 ? fox.months.map((m) => ({ value: `m:${m.key}`, label: monthLabel(m.key) })) : []),
      ]
    : [];

  return (
    <div className="tab-panel">

      {fox && (
        <Select
          label={tr('boundary_group_period')}
          value={state.boundaryPeriod}
          options={periodOptions}
          onChange={(v) => set({ boundaryPeriod: v, ...(v !== 'custom' ? { boundaryRange: null } : {}) })}
        />
      )}

      <div className="section">
        <div className="group-label">{tr('boundary_group_source')}</div>
        <p className="sidebar-desc">
          {forcing
            ? tr(forcing.mode === 'full' ? 'boundary_full_desc' : 'boundary_simple_desc')
            : tr('boundary_no_fileset')}
        </p>
      </div>
    </div>
  );
}
