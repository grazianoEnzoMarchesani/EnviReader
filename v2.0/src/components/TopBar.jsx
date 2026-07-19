import { useState } from 'react';
import { useAppState } from '../state/AppStateContext';
import { useI18n } from '../i18n/I18nContext';
import SaveChartModal from './SaveChartModal';

export default function TopBar() {
  const { state, toggle, toggleTheme, openFilesetA, toggleFilesetB } = useAppState();
  const { tr, lang, setLang, languages } = useI18n();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const isDark = state.theme === 'dark';
  const loading = state.loadingFileset;

  const filesetLabel = (key) =>
    loading === key ? (
      <>
        <span className="btn-spinner" aria-hidden="true" />
        {tr('btn_loading_fileset')}
      </>
    ) : state[`fileset${key}Open`] ? (
      `${tr(`chart_fileset_${key.toLowerCase()}`)} · ${state[`fileset${key}`]?.name ?? state[`fileset${key}`]?.rootDir ?? ''}`
    ) : (
      tr(`btn_open_fileset_${key.toLowerCase()}`)
    );

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <div className="brand" onClick={() => toggle('showCredits')}>
            <span className="brand-title">EnviReader</span>
            <span className="brand-tagline">{tr('app_tagline')}</span>
          </div>
          <div className="divider-v" />
          <button
            className={`btn btn-fileset-a${state.filesetAOpen ? ' open' : ''}`}
            onClick={openFilesetA}
            disabled={loading != null}
            aria-busy={loading === 'A'}
          >
            {filesetLabel('A')}
          </button>
          <button
            className={`btn btn-fileset-b${state.filesetBOpen ? ' open' : ''}`}
            onClick={toggleFilesetB}
            disabled={loading != null}
            aria-busy={loading === 'B'}
          >
            {filesetLabel('B')}
          </button>
        </div>
        <div className="topbar-right">
          <div className="lang-row">
            {languages.map((code) => (
              <button
                key={code}
                className={`lang-btn${lang === code ? ' active' : ''}`}
                onClick={() => setLang(code)}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost-top" onClick={() => setShowSaveModal(true)}>{tr('btn_save_charts')}</button>
          <button className="theme-switch" onClick={toggleTheme} aria-label="theme">
            <span className="theme-switch-label">{isDark ? tr('theme_dark') : tr('theme_light')}</span>
            <span className={`toggle-track${isDark ? ' on' : ''}`}>
              <span className="toggle-thumb" />
            </span>
          </button>
        </div>
      </header>
      {showSaveModal && <SaveChartModal onClose={() => setShowSaveModal(false)} />}
    </>
  );
}
