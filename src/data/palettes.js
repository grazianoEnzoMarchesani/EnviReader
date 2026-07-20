// Vista unificata sulle tre famiglie di palette: predefinite (per variante
// principale o differenza), catalogo storico e palette dell'utente.

import { PALETTES, DIFF_PALETTES } from './constants';
import { CATALOG_PALETTES } from './catalogPalettes';

export function paletteGroups(variant, customPalettes) {
  return [
    { labelKey: 'group_palettes_builtin', palettes: variant === 'diff' ? DIFF_PALETTES : PALETTES },
    { labelKey: 'group_palettes_catalog', palettes: CATALOG_PALETTES },
    { labelKey: 'group_palettes_custom', palettes: customPalettes, custom: true },
  ];
}

// Trova la palette selezionata ovunque sia; se è stata eliminata torna la prima
// predefinita della variante, così la mappa non resta mai senza colori.
export function findPalette(id, variant, customPalettes) {
  const builtin = variant === 'diff' ? DIFF_PALETTES : PALETTES;
  return (
    builtin.find((p) => p.id === id) ||
    CATALOG_PALETTES.find((p) => p.id === id) ||
    customPalettes.find((p) => p.id === id) ||
    builtin[0]
  );
}
