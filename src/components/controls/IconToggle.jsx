export default function IconToggle({ icon: Icon, on, onToggle, label }) {
  return (
    <button
      type="button"
      className={`icon-toggle${on ? ' on' : ''}`}
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      aria-label={label}
      title={label}
    >
      <Icon />
    </button>
  );
}
