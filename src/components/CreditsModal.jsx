import { GITHUB_URL } from '../data/constants';
import { useAppState } from '../state/AppStateContext';
import { useI18n } from '../i18n/I18nContext';
import { useModalKeyboard } from '../lib/useModalKeyboard';

export default function CreditsModal() {
  const { state, toggle } = useAppState();
  const { tr } = useI18n();

  const close = () => toggle('showCredits');
  useModalKeyboard(state.showCredits, close, close);

  if (!state.showCredits) return null;

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal-card credits-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{tr('credits_title')}</div>
        
        <div className="credits-section">
          <p className="modal-text">
            <strong>{tr('credits_version')}</strong> — {tr('credits_developer')}
          </p>
          <p className="modal-text">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="modal-link">
              {tr('credits_source')}
            </a>
          </p>
        </div>

        <div className="credits-section">
          <h3 className="credits-subtitle">{tr('credits_feedback_title')}</h3>
          <p className="modal-text">{tr('credits_feedback_text')}</p>
        </div>

        <div className="credits-section highlight-section">
          <h3 className="credits-subtitle attention">{tr('credits_academic_title')}</h3>
          <p className="modal-text">{tr('credits_academic_text')}</p>
          <div className="citation-box">
            <code>{tr('credits_citation')}</code>
          </div>
        </div>

        <button className="primary-btn" onClick={close}>
          {tr('btn_close')}
        </button>
      </div>
    </div>
  );
}
