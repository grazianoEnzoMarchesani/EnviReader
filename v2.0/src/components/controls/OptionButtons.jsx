// Gruppo di bottoni radio-style impilati (confronto viste, sorgente boundary)
export default function OptionButtons({ options, value, onSelect }) {
  return (
    <>
      {options.map((opt) => (
        <button
          key={opt.key}
          className={`option-btn${value === opt.key ? ' active' : ''}`}
          disabled={opt.disabled}
          onClick={() => onSelect(opt.key)}
        >
          {opt.label}
        </button>
      ))}
    </>
  );
}
