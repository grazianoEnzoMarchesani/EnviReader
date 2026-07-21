import { useState } from 'react';
import { AppStateProvider, useAppState } from './state/AppStateContext';
import { I18nProvider } from './i18n/I18nContext';
import TopBar from './components/TopBar';
import CreditsModal from './components/CreditsModal';
import CustomRangeModal from './components/CustomRangeModal';
import AnalysisSidebar from './components/sidebar/AnalysisSidebar';
import BoundarySidebar from './components/sidebar/BoundarySidebar';
import AnalysisView from './components/views/AnalysisView';
import ModelView from './components/views/ModelView';
import BoundaryView from './components/views/BoundaryView';

// La vista 3D condivide la sidebar dati di Data analysis: in prospettiva le
// stesse viste 2D (dataset, quote, sezioni) arriveranno anche nello spazio 3D
const VIEWS = {
  analysis: { Sidebar: AnalysisSidebar, Main: AnalysisView },
  model: { Sidebar: AnalysisSidebar, Main: ModelView },
  boundary: { Sidebar: BoundarySidebar, Main: BoundaryView },
};

function AppLayout() {
  const { state } = useAppState();
  const { Sidebar, Main } = VIEWS[state.appView] || VIEWS.analysis;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="app-root">
      <TopBar />
      <div className={`body-row ${!Sidebar || sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {Sidebar && (
          <>
            <aside className="sidebar">
              <div className="sidebar-inner">
                <Sidebar />
              </div>
            </aside>

            <button
              className="sidebar-toggle"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? "Espandi sidebar" : "Riduci sidebar"}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
          </>
        )}

        <main className="main">
          <Main />
        </main>
      </div>
      <CreditsModal />
      <CustomRangeModal />
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppStateProvider>
        <AppLayout />
      </AppStateProvider>
    </I18nProvider>
  );
}
