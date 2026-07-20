// Gruppo di bottoni segmentati; variant "accent" (blu) o "dark" (inverso)
export default function Segmented({ options, value, onSelect, variant = 'accent' }) {
  const activeClass = variant === 'dark' ? 'active-dark' : 'active-accent';
  return (
    <div className="segmented">
      {options.map((opt) => (
        <button
          key={opt.key}
          className={value === opt.key ? activeClass : ''}
          disabled={opt.disabled}
          title={opt.title}
          onClick={() => onSelect(opt.key)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
