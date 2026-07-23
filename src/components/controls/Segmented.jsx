import HelpTooltip from './HelpTooltip';

// Gruppo di bottoni segmentati; variant "accent" (blu) o "dark" (inverso)
export default function Segmented({ options, value, onSelect, variant = 'accent' }) {
  const activeClass = variant === 'dark' ? 'active-dark' : 'active-accent';
  return (
    <div className="segmented">
      {options.map((opt) => {
        const button = (
          <button
            key={opt.key}
            className={value === opt.key ? activeClass : ''}
            disabled={opt.disabled}
            title={opt.disabled ? opt.title : undefined}
            onClick={() => onSelect(opt.key)}
          >
            {opt.label}
          </button>
        );
        // le opzioni disabilitate mantengono il title nativo (es. "apri prima
        // il fileset B"): un bottone disabled non riceve gli eventi mouse di
        // HelpTooltip, quindi ha senso solo per le opzioni attive.
        return !opt.disabled && opt.help ? (
          <HelpTooltip key={opt.key} content={opt.help}>{button}</HelpTooltip>
        ) : button;
      })}
    </div>
  );
}
