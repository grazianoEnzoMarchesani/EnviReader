import { useAppState } from '../state/AppStateContext';
import { useI18n } from '../i18n/I18nContext';
import { markPrivacySeen } from '../lib/privacySeen';

// Avviso sobrio al primo avvio (e quando l'informativa cambia): riassume in due
// righe e rimanda al pannello completo. Non blocca l'uso dell'app.
export default function PrivacyBanner() {
  const { state, toggle } = useAppState();
  const { tr } = useI18n();
  if (!state.showPrivacyBanner) return null;

  const dismiss = () => {
    markPrivacySeen();
    toggle('showPrivacyBanner');
  };
  const openFull = () => {
    dismiss();
    toggle('showPrivacy');
  };

  return (
    <div className="privacy-banner" role="region" aria-label={tr('btn_privacy')}>
      <p className="privacy-banner-text">{tr('privacy_banner_text')}</p>
      <div className="privacy-banner-actions">
        <button type="button" className="modal-link privacy-banner-link" onClick={openFull}>
          {tr('privacy_banner_more')}
        </button>
        <button type="button" className="ghost-btn primary" onClick={dismiss}>
          {tr('privacy_banner_ok')}
        </button>
      </div>
    </div>
  );
}
