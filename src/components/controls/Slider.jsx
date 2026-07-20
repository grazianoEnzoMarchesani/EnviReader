import { useEffect, useState } from 'react';

export default function Slider({ label, value, min, max, step = 1, unit = '', onChange }) {
  const clamp = (v) => Math.max(min, Math.min(max, v));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  const commit = () => {
    setEditing(false);
    const parsed = parseFloat(draft);
    if (draft === '' || Number.isNaN(parsed)) {
      setDraft(String(value));
      return;
    }
    const clamped = clamp(parsed);
    if (clamped !== value) onChange(clamped);
  };

  const handleValueChange = (e) => {
    const raw = e.target.value;
    if (/^-?\d*\.?\d*$/.test(raw)) setDraft(raw);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') e.currentTarget.blur();
    else if (e.key === 'Escape') {
      setDraft(String(value));
      setEditing(false);
      e.currentTarget.blur();
    }
  };

  return (
    <div className="slider-block">
      <div className="slider-label-row">
        <span className="control-label">{label}</span>
        <input
          className="slider-value slider-value-input"
          type="text"
          inputMode="decimal"
          value={editing ? draft : `${value}${unit}`}
          onFocus={(e) => {
            setEditing(true);
            setDraft(String(value));
            e.target.select();
          }}
          onChange={handleValueChange}
          onBlur={commit}
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className="slider-row">
        <button className="step-btn" onClick={() => onChange(clamp(value - step))}>–</button>
        <input
          type="range"
          className="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
        <button className="step-btn" onClick={() => onChange(clamp(value + step))}>+</button>
      </div>
    </div>
  );
}
