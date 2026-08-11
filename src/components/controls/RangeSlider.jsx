import { useEffect, useState } from 'react';

function ValueBadge({ value, min, max, unit, onChange }) {
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

  const handleChange = (e) => {
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
      onChange={handleChange}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  );
}

// Slider a doppia maniglia per due soglie correlate (es. le due code di una
// distribuzione). L'ordinamento low<=high è garantito dal clamp incrociato;
// portare una maniglia al bordo (min o max) è la maniera per "disattivare"
// quel lato — sta al chiamante trattare quell'estremo come nessuna soglia.
export default function RangeSlider({
  label,
  min,
  max,
  step = 1,
  unit = '',
  low,
  high,
  onChangeLow,
  onChangeHigh,
  hintLow,
  hintHigh,
  inverted = false,
}) {
  const span = max - min;
  const clamp = (v) => Math.max(min, Math.min(max, v));
  const curLow = clamp(low);
  const curHigh = clamp(high);

  const handleLowInput = (e) => onChangeLow(Math.min(parseFloat(e.target.value), curHigh));
  const handleHighInput = (e) => onChangeHigh(Math.max(parseFloat(e.target.value), curLow));

  const releaseFocus = (e) => e.currentTarget.blur();
  const releaseFocusOnArrow = (e) => {
    if (e.key.startsWith('Arrow')) e.currentTarget.blur();
  };

  const lowPct = span > 0 ? ((curLow - min) / span) * 100 : 0;
  const highPct = span > 0 ? ((curHigh - min) / span) * 100 : 100;
  // euristica per portare in primo piano la maniglia più vicina al bordo
  // opposto, così resta afferrabile anche quando le due si sovrappongono
  const lowOnTop = curLow - min > max - curHigh;

  return (
    <div className="slider-block">
      <div className="slider-label-row">
        <span className="control-label">{label}</span>
        <div className="slider-label-right">
          <ValueBadge value={curLow} min={min} max={curHigh} unit={unit} onChange={onChangeLow} />
          <ValueBadge value={curHigh} min={curLow} max={max} unit={unit} onChange={onChangeHigh} />
        </div>
      </div>
      {(hintLow || hintHigh) && (
        <div className="slider-hint-row">
          {hintLow}
          {hintHigh}
        </div>
      )}
      <div className="dual-range">
        <div className="dual-range-track" />
        {inverted ? (
          <>
            <div className="dual-range-fill" style={{ left: 0, right: `${100 - lowPct}%` }} />
            <div className="dual-range-fill" style={{ left: `${highPct}%`, right: 0 }} />
          </>
        ) : (
          <div className="dual-range-fill" style={{ left: `${lowPct}%`, right: `${100 - highPct}%` }} />
        )}
        <input
          type="range"
          className="dual-range-input"
          style={{ zIndex: lowOnTop ? 4 : 3 }}
          min={min}
          max={max}
          step={step}
          value={curLow}
          onChange={handleLowInput}
          onMouseUp={releaseFocus}
          onTouchEnd={releaseFocus}
          onKeyUp={releaseFocusOnArrow}
        />
        <input
          type="range"
          className="dual-range-input"
          style={{ zIndex: lowOnTop ? 3 : 4 }}
          min={min}
          max={max}
          step={step}
          value={curHigh}
          onChange={handleHighInput}
          onMouseUp={releaseFocus}
          onTouchEnd={releaseFocus}
          onKeyUp={releaseFocusOnArrow}
        />
      </div>
    </div>
  );
}
