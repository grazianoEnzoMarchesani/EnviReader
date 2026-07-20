import { NAV_VIEWS } from '../data/constants';
import { useAppState } from '../state/AppStateContext';
import { useI18n } from '../i18n/I18nContext';

export default function NavBar() {
  const { state, set } = useAppState();
  const { tr } = useI18n();

  return (
    <nav className="navbar">
      {NAV_VIEWS.map((n) => (
        <button
          key={n.key}
          className={`nav-tab${state.appView === n.key ? ' active' : ''}`}
          onClick={() => set({ appView: n.key })}
        >
          {tr(n.labelKey)}
        </button>
      ))}
    </nav>
  );
}
