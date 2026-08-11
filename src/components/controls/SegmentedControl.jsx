// Selettore orizzontale a pillole per scelte a poche vie tra pari (stile
// segmented control iOS/Material): più compatto dello stack verticale di
// OptionButtons, usato sia per scelte pure a 3 vie (stile vento) sia come
// variante secondaria annidata sotto un Toggle (livellamento, zebra).
export default function SegmentedControl({ options, value, onSelect, className = '' }) {
  return (
    <div className={`segmented-control${className ? ` ${className}` : ''}`} role="radiogroup">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          role="radio"
          aria-checked={value === opt.key}
          className={`segmented-option${value === opt.key ? ' active' : ''}`}
          disabled={opt.disabled}
          onClick={() => onSelect(opt.key)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
