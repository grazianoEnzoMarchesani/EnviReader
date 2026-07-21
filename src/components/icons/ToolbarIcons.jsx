const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function IconLayers3D(props) {
  return (
    <svg {...base} width="18" height="18" {...props}>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="M3 12l9 5 9-5" />
      <path d="M3 16l9 5 9-5" />
    </svg>
  );
}

export function IconBuilding(props) {
  return (
    <svg {...base} width="18" height="18" {...props}>
      <rect x="5" y="3" width="9" height="18" />
      <path d="M14 8h5v13h-5" />
      <path d="M8 7h2M8 11h2M8 15h2" />
    </svg>
  );
}

export function IconTerrain(props) {
  return (
    <svg {...base} width="18" height="18" {...props}>
      <path d="M3 19 9 8l4 6.5L15.5 11 21 19H3Z" />
    </svg>
  );
}

export function IconTree(props) {
  return (
    <svg {...base} width="18" height="18" {...props}>
      <path d="M12 3 7 11h3l-4 6h5v4" />
      <path d="M12 3l5 8h-3l4 6h-5" />
    </svg>
  );
}

export function IconCompass(props) {
  return (
    <svg {...base} width="18" height="18" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.8 9.2 13 13l-3.8 1.8L11 11l3.8-1.8Z" />
    </svg>
  );
}

export function IconCalendar(props) {
  return (
    <svg {...base} width="18" height="18" {...props}>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

export function IconClock(props) {
  return (
    <svg {...base} width="18" height="18" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

export function IconSettings(props) {
  return (
    <svg {...base} width="18" height="18" {...props}>
      <path d="M12 3 19 7.2v9.6L12 21l-7-4.2V7.2L12 3Z" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}

export function IconReceptor(props) {
  return (
    <svg {...base} width="18" height="18" {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
    </svg>
  );
}

export function IconGrid(props) {
  return (
    <svg {...base} width="18" height="18" {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="1.5" />
      <path d="M3.5 9.5h17M3.5 15.5h17M9.5 3.5v17M15.5 3.5v17" />
    </svg>
  );
}

export function IconWireframe(props) {
  return (
    <svg {...base} width="18" height="18" {...props}>
      <path d="M12 3 20 8v8l-8 5-8-5V8l8-5Z" />
      <path d="M12 3v18M4 8l8 5 8-5M4 16l8-5 8 5" />
    </svg>
  );
}

export function IconSun(props) {
  return (
    <svg {...base} width="18" height="18" {...props}>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </svg>
  );
}
