import { useI18n } from '../../i18n/I18nContext';

export function paletteLabel(p, tr) {
  if (p.name) return p.name; // palette personalizzata: il nome scelto dall'utente
  if (p.labelKey) return p.labelArg != null ? `${tr(p.labelKey)} ${p.labelArg}` : tr(p.labelKey);
  return p.id;
}

export function orderedColors(palette, reversed) {
  return reversed ? [...palette.colors].reverse() : palette.colors;
}

function SwatchRow({ colors }) {
  return (
    <div className="swatch-row">
      {colors.map((hex, i) => (
        <span key={i} className="swatch" style={{ background: hex }} />
      ))}
    </div>
  );
}

// Dropdown custom con anteprima swatch; `variant: 'diff'` usa l'evidenziazione
// arancio. Riceve le palette in gruppi (predefinite / catalogo / personali):
// per il gruppo `custom` ogni riga ha i bottoni modifica ed elimina.
export default function PaletteSelector({ groups, selectedId, reversed, open, onToggleOpen, onSelect, onEdit, onDelete, variant = 'main' }) {
  const { tr } = useI18n();
  const all = groups.flatMap((g) => g.palettes);
  const active = all.find((p) => p.id === selectedId) || groups[0].palettes[0];

  return (
    <div className="palette-selector">
      <button type="button" className="palette-head" onClick={onToggleOpen} aria-expanded={open}>
        <SwatchRow colors={orderedColors(active, reversed)} />
        <span className="palette-name">{paletteLabel(active, tr)}</span>
        <span className="palette-arrow" />
      </button>
      {open && (
        <div className="palette-list">
          {groups.map((g) =>
            g.palettes.length === 0 ? null : (
              <div key={g.labelKey}>
                <div className="palette-group-label">{tr(g.labelKey)}</div>
                {g.palettes.map((p) => (
                  // La riga è un semplice contenitore: la selezione è un button
                  // a sé, così i pulsanti modifica/elimina non finiscono
                  // annidati dentro un altro elemento interattivo (ARIA non
                  // valido, e con la tastiera diventerebbero irraggiungibili)
                  <div
                    key={p.id}
                    className={`palette-list-row${p.id === selectedId ? (variant === 'diff' ? ' selected-diff' : ' selected') : ''}`}
                  >
                    <button
                      type="button"
                      className="palette-list-select"
                      aria-pressed={p.id === selectedId}
                      onClick={() => onSelect(p.id)}
                    >
                      <SwatchRow colors={p.colors} />
                      <span className="palette-name">{paletteLabel(p, tr)}</span>
                    </button>
                    {g.custom && (
                      <span className="palette-row-actions">
                        <button
                          type="button"
                          className="palette-row-btn"
                          title={tr('title_edit_palette')}
                          aria-label={`${tr('title_edit_palette')} ${paletteLabel(p, tr)}`}
                          onClick={() => onEdit(p.id)}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="palette-row-btn"
                          title={tr('title_delete_palette')}
                          aria-label={`${tr('title_delete_palette')} ${paletteLabel(p, tr)}`}
                          onClick={() => onDelete(p.id)}
                        >
                          ×
                        </button>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
