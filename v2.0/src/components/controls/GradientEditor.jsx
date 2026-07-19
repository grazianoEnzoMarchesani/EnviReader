import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { MAX_STOPS, MIN_STOPS, resampleColors, encodePaletteCode } from '../../lib/paletteStore';

// Editor "duplica e ritocca": tappe equidistanti, color picker nativo del
// browser, +/− ricampiona il gradiente attuale preservandone l'aspetto.
// Il draft vive nello stato globale, così le mappe mostrano l'anteprima live.
export default function GradientEditor({ draft, onChange, onSave, onCancel }) {
  const { tr } = useI18n();
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef(null);
  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const { colors, name, target } = draft;
  const setColor = (i, hex) => onChange({ colors: colors.map((c, j) => (j === i ? hex : c)) });
  const resize = (delta) => onChange({ colors: resampleColors(colors, colors.length + delta) });

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(encodePaletteCode(name.trim() || tr('custom_default_name'), colors));
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard negata: nessun feedback, il codice resta esportabile via file
    }
  };

  return (
    <div className="gradient-editor">
      <div className="gradient-bar" style={{ background: `linear-gradient(to right, ${colors.join(', ')})` }} />
      <div className="gradient-stops">
        {colors.map((c, i) => (
          <input
            key={i}
            type="color"
            className="gradient-stop"
            value={c}
            aria-label={`${tr('editor_stop')} ${i + 1}`}
            onChange={(e) => setColor(i, e.target.value)}
          />
        ))}
      </div>
      <div className="gradient-toolbar">
        <span className="gradient-count">{colors.length} {tr('editor_stops')}</span>
        <button className="palette-row-btn" aria-label={tr('editor_fewer_stops')} disabled={colors.length <= MIN_STOPS} onClick={() => resize(-1)}>−</button>
        <button className="palette-row-btn" aria-label={tr('editor_more_stops')} disabled={colors.length >= MAX_STOPS} onClick={() => resize(1)}>+</button>
      </div>
      {target === 'diff' && <div className="gradient-hint">{tr('hint_diff_neutral')}</div>}
      <input
        className="gradient-name"
        type="text"
        value={name}
        placeholder={tr('editor_name_placeholder')}
        onChange={(e) => onChange({ name: e.target.value })}
      />
      <button className="ghost-btn primary" onClick={onSave}>{tr('btn_save_palette')}</button>
      <div className="gradient-btn-row">
        <button className="ghost-btn" onClick={copyCode}>{copied ? tr('code_copied') : tr('btn_copy_code')}</button>
        <button className="ghost-btn" onClick={onCancel}>{tr('btn_cancel')}</button>
      </div>
    </div>
  );
}
