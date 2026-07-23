import HelpTooltip from './HelpTooltip';
import { IconWindGust, IconSpinner } from '../icons/ToolbarIcons';

// Pulsante a 3 stati (off → 2d → 3d → off) per il vento in toolbar 3D:
// stessa base visiva di IconToggle ma con un badge testuale sovrapposto
// per distinguere i due stati "on" (2D = wind field, 3D = wind volume).
// Mentre il volume 3D sta ricalcolando (loading), l'icona viene sostituita
// da IconSpinner: stesso segnale visivo dello spinner usato al caricamento
// del fileset (.btn-spinner), qui coerente con lo stile a tratto della toolbar.
export default function WindModeToggle({ mode, loading, onCycle, label, help }) {
  const button = (
    <button
      type="button"
      className={`icon-toggle wind-mode-toggle${mode !== 'off' ? ' on' : ''}`}
      onClick={onCycle}
      aria-label={label}
      aria-busy={loading || undefined}
      title={help ? undefined : label}
    >
      {loading ? <IconSpinner /> : <IconWindGust />}
      {mode !== 'off' && <span className="wind-mode-badge">{mode === '3d' ? '3D' : '2D'}</span>}
    </button>
  );
  return help ? <HelpTooltip content={help}>{button}</HelpTooltip> : button;
}
