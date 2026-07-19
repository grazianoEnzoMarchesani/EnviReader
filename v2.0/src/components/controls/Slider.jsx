export default function Slider({ label, value, min, max, step = 1, unit = '', onChange }) {
  const clamp = (v) => Math.max(min, Math.min(max, v));
  return (
    <div className="slider-block">
      <div className="slider-label-row">
        <span className="control-label">{label}</span>
        <span className="slider-value">{`${value}${unit}`}</span>
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
