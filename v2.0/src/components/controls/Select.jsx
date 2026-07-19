export default function Select({ label, value, options, onChange }) {
  return (
    <div className="section">
      {label ? <div className="group-label">{label}</div> : null}
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
