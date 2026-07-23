import HelpTooltip from './HelpTooltip';

export default function IconToggle({ icon: Icon, on, onToggle, label, help }) {
  const button = (
    <button
      type="button"
      className={`icon-toggle${on ? ' on' : ''}`}
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      aria-label={label}
      title={help ? undefined : label}
    >
      <Icon />
    </button>
  );
  return help ? <HelpTooltip content={help}>{button}</HelpTooltip> : button;
}
