export default function Toggle({ label, on, onToggle, extra }) {
  return (
    <div className="toggle-row">
      <span className="control-label">
        {label}
        {extra ? <span className="muted-inline">{extra}</span> : null}
      </span>
      <button
        className={`toggle-track${on ? ' on' : ''}`}
        onClick={onToggle}
        role="switch"
        aria-checked={on}
        aria-label={label}
      >
        <span className="toggle-thumb" />
      </button>
    </div>
  );
}
