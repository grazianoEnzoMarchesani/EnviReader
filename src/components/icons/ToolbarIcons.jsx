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

// Layer corretto: il fix manuale del bug ENVI-met sulle sezioni biomet.
// Linea piena in alto = dato riposizionato sopra la superficie reale;
// linea tratteggiata in basso = la vecchia posizione errata, schiacciata sul fondo.
export function IconTerrainFix(props) {
  return (
    <svg {...base} width="18" height="18" {...props}>
      <path d="M4 6h16" />
      <path d="M12 17V9" />
      <path d="M8.5 12.5 12 9l3.5 3.5" />
      <path d="M4 19h16" strokeDasharray="2.5 2.5" />
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

// Modalità HD: rettangolo "schermo" con le lettere H/D a tratto, per il
// toggle di ricampionamento ad alta risoluzione della mappa raster/contour.
export function IconHD(props) {
  return (
    <svg {...base} width="18" height="18" {...props}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 9v6M7 12h2.5M9.5 9v6" />
      <path d="M13 9v6h1.5a1.5 1.5 0 0 0 1.5-1.5v-3A1.5 1.5 0 0 0 14.5 9H13Z" />
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

export function IconSectionX(props) {
  return (
    <svg {...base} width="18" height="18" {...props}>
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      <path d="M12 4v16" />
    </svg>
  );
}

export function IconSectionY(props) {
  return (
    <svg {...base} width="18" height="18" {...props}>
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      <path d="M4 12h16" />
    </svg>
  );
}

export function IconSmoothSurface(props) {
  return (
    <svg {...base} width="18" height="18" {...props}>
      <path d="M3 15c2.5-5 5 5 7.5 0S15 10 17.5 15 21 9 21 9" />
      <path d="M3 20h18" />
    </svg>
  );
}

export function IconSyncRotate(props) {
  return (
    <svg {...base} width="18" height="18" {...props}>
      <path d="M4 12a8 8 0 0 1 13.5-5.5" />
      <path d="M17 2.5v4h-4" />
      <path d="M20 12a8 8 0 0 1-13.5 5.5" />
      <path d="M7 21.5v-4h4" />
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

export function IconWindVolume(props) {
  return (
    <svg {...base} width="18" height="18" {...props}>
      <path d="M2 7h11.5a2.5 2.5 0 1 0-2.4-3.2" />
      <path d="M2 12h15.5a2.5 2.5 0 1 1-2.4 3.2" />
      <path d="M2 17h9" />
    </svg>
  );
}

// Icona compatta per il pulsante ciclico "Wind display" della toolbar 3D
// (off → 2D → 3D): due sole linee di soffio, più corte di IconWindVolume,
// per lasciare spazio al badge "2D"/"3D" sovrapposto in basso a destra.
export function IconWindGust(props) {
  return (
    <svg {...base} width="18" height="18" {...props}>
      <path d="M3 8.5h10a2.2 2.2 0 1 0-2-3.2" />
      <path d="M3 13.5h6.5" />
    </svg>
  );
}

// Sostituisce IconWindVolume sul toggle mentre il worker sta ricalcolando il
// campo di vento volumetrico (vedi windVolumeLoading in ModelView.jsx):
// stesso spirito del .btn-spinner già usato per il caricamento dei fileset,
// qui come icona SVG (arco aperto) invece che bordo CSS, per restare
// coerente con lo stile a tratto degli altri toggle della toolbar.
export function IconSpinner(props) {
  return (
    <svg {...base} width="18" height="18" className="icon-spin" {...props}>
      <path d="M12 3a9 9 0 1 1-6.36 2.64" />
    </svg>
  );
}

// Glifi del player timeline (TimePlayer): pieni invece che a tratto, come le
// icone di riproduzione native, per restare leggibili anche molto piccoli.
export function IconPlay(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" stroke="none" {...props}>
      <path d="M8 5.3v13.4a1 1 0 0 0 1.53.85l10.6-6.7a1 1 0 0 0 0-1.7l-10.6-6.7A1 1 0 0 0 8 5.3Z" />
    </svg>
  );
}

export function IconPause(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" stroke="none" {...props}>
      <rect x="6.5" y="5" width="4" height="14" rx="1.2" />
      <rect x="13.5" y="5" width="4" height="14" rx="1.2" />
    </svg>
  );
}

export function IconSkipBack(props) {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" stroke="none" {...props}>
      <rect x="4.3" y="5" width="2.2" height="14" rx="1" />
      <path d="M19 5.6v12.8a1 1 0 0 1-1.53.85l-8.9-6.4a1 1 0 0 1 0-1.7l8.9-6.4A1 1 0 0 1 19 5.6Z" />
    </svg>
  );
}

export function IconSkipForward(props) {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" stroke="none" {...props}>
      <rect x="17.5" y="5" width="2.2" height="14" rx="1" />
      <path d="M5 5.6v12.8a1 1 0 0 0 1.53.85l8.9-6.4a1 1 0 0 0 0-1.7l-8.9-6.4A1 1 0 0 0 5 5.6Z" />
    </svg>
  );
}
