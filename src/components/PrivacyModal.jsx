import { Fragment, useEffect } from 'react';
import { useAppState } from '../state/AppStateContext';
import { useI18n } from '../i18n/I18nContext';
import { useModalKeyboard } from '../lib/useModalKeyboard';
import { useModalTransition } from '../lib/useModalTransition';
import { PRIVACY_TEXT, CONTACT_EMAIL_OBFUSCATED } from '../data/privacyText';
import { markPrivacySeen } from '../lib/privacySeen';
import { setMapConsent, resetMapConsent, useMapConsent } from '../lib/mapConsent';

// Markup inline minimo: **grassetto**, `codice`, [testo](indirizzo).
// Il testo viene da privacyText.js (non da input utente): nessun HTML grezzo.
const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;

function Inline({ text }) {
  const parts = text.replace('{EMAIL}', CONTACT_EMAIL_OBFUSCATED).split(INLINE);
  return parts.map((part, i) => {
    if (part.startsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (link) {
      return (
        <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer" className="modal-link">
          {link[1]}
        </a>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

// Cancella tutto ciò che l'app ha scritto in localStorage (prefisso envireader.)
function clearStoredData() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('envireader.')) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // storage non disponibile: non c'è nulla da cancellare
  }
  resetMapConsent();
}

export default function PrivacyModal() {
  const { state, toggle } = useAppState();
  const { tr, lang } = useI18n();
  const consent = useMapConsent();

  useEffect(() => {
    if (state.showPrivacy) markPrivacySeen();
  }, [state.showPrivacy]);

  const close = () => toggle('showPrivacy');
  useModalKeyboard(state.showPrivacy, null, close);
  const { data: open, closing } = useModalTransition(state.showPrivacy);

  if (!open) return null;

  const text = PRIVACY_TEXT[lang] || PRIVACY_TEXT.en;
  const { ui } = text;
  const langNote = !PRIVACY_TEXT[lang] ? tr('privacy_lang_note') : '';
  const outline = { background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', width: 'auto', minWidth: 140, margin: 0 };

  const onClear = () => {
    if (window.confirm(ui.clearConfirm)) {
      clearStoredData();
      window.location.reload();
    }
  };

  return (
    <div className={`modal-backdrop${closing ? ' is-closing' : ''}`} onClick={close}>
      <div
        className="modal-card credits-card privacy-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title" id="privacy-title" style={{ marginBottom: 2 }}>{text.title}</div>
        <p className="modal-text" style={{ marginBottom: 14 }}>{text.updatedLabel}: {text.updated}</p>
        {langNote && <p className="modal-text"><em>{langNote}</em></p>}

        {text.sections.map((section, si) => {
          if (section.choice) {
            return (
              <div key={si} className="privacy-choice">
                <h3 className="credits-subtitle">{ui.choiceTitle}</h3>
                <div className="privacy-choice-row">
                  <span className="modal-text" style={{ margin: 0 }}>
                    {ui.mapLabel}:{' '}
                    <strong>{consent === 'granted' ? ui.mapOn : consent === 'denied' ? ui.mapOff : ui.mapUnset}</strong>
                  </span>
                  {consent === 'granted' ? (
                    <button className="primary-btn" style={outline} onClick={() => setMapConsent('denied')}>{ui.turnOff}</button>
                  ) : (
                    <button className="primary-btn" style={{ width: 'auto', minWidth: 140, margin: 0 }} onClick={() => setMapConsent('granted')}>{ui.turnOn}</button>
                  )}
                </div>
                <div className="privacy-choice-row" style={{ marginTop: 14 }}>
                  <span className="modal-text" style={{ margin: 0, flex: 1 }}><strong>{ui.clearTitle}.</strong> {ui.clearText}</span>
                  <button className="primary-btn" style={outline} onClick={onClear}>{ui.clearButton}</button>
                </div>
              </div>
            );
          }
          return (
            <div key={si} className="credits-section">
              <h3 className="credits-subtitle">{section.h}</h3>
              {section.blocks.map((block, bi) => {
                if (block.p) return <p key={bi} className="modal-text"><Inline text={block.p} /></p>;
                if (block.ul) {
                  return (
                    <ul key={bi} className="privacy-list">
                      {block.ul.map((item, ii) => <li key={ii} className="modal-text"><Inline text={item} /></li>)}
                    </ul>
                  );
                }
                if (block.table) {
                  return (
                    <div key={bi} className="privacy-table-wrap">
                      <table className="privacy-table">
                        <thead>
                          <tr>{block.table.head.map((h, hi) => <th key={hi}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          {block.table.rows.map((row, ri) => (
                            <tr key={ri}>{row.map((cell, ci) => <td key={ci}><Inline text={cell} /></td>)}</tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          );
        })}

        <button className="primary-btn" onClick={close}>{ui.close}</button>
      </div>
    </div>
  );
}
