import { useState, useEffect } from 'react';
import { AppStateProvider, useAppState } from './state/AppStateContext';
import { I18nProvider, useI18n } from './i18n/I18nContext';
import TopBar from './components/TopBar';
import CreditsModal from './components/CreditsModal';
import CustomRangeModal from './components/CustomRangeModal';
import ShortcutsModal from './components/ShortcutsModal';
import AnalysisSidebar from './components/sidebar/AnalysisSidebar';
import AnalysisView from './components/views/AnalysisView';
import ModelView from './components/views/ModelView';
import BoundaryView from './components/views/BoundaryView';
import HelpTooltip from './components/controls/HelpTooltip';

// La vista 3D condivide la sidebar dati di Data analysis: in prospettiva le
// stesse viste 2D (dataset, quote, sezioni) arriveranno anche nello spazio 3D
const VIEWS = {
  analysis: { Sidebar: AnalysisSidebar, Main: AnalysisView },
  model: { Sidebar: AnalysisSidebar, Main: ModelView },
  boundary: { Main: BoundaryView },
};

function AppLayout() {
  const { state, set, toggle, toggleTheme, setCompareMode, setCompareMode3D } = useAppState();
  const { tr } = useI18n();
  const { Sidebar, Main } = VIEWS[state.appView] || VIEWS.analysis;

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignora se stiamo digitando in un input o textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

      // Play / Pausa
      if (e.code === 'Space') {
        e.preventDefault();
        set((s) => ({ playing: !s.playing }));
      } 
      // Viste Rapide 2D/3D (1, 2, 3)
      else if (e.code === 'Digit1' || e.code === 'Numpad1') {
        if (state.appView === 'analysis') set({ viewType: 'plan' });
        else if (state.appView === 'model') window.dispatchEvent(new CustomEvent('snap-camera-3d', { detail: 'top' }));
      } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
        if (state.appView === 'analysis') set({ viewType: 'sectionX' });
        else if (state.appView === 'model') window.dispatchEvent(new CustomEvent('snap-camera-3d', { detail: 'right' }));
      } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
        if (state.appView === 'analysis') set({ viewType: 'sectionY' });
        else if (state.appView === 'model') window.dispatchEvent(new CustomEvent('snap-camera-3d', { detail: 'front' }));
      }
      // Navigazione temporale (Frecce Sinistra / Destra)
      else if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
        e.preventDefault();
        set((s) => ({
          time: clamp(s.time + (e.code === 'ArrowRight' ? 1 : -1), 0, Math.max(0, s.seriesLabels.length - 1))
        }));
      }
      // Navigazione spaziale (Frecce Su / Giù oppure W / S)
      else if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        e.preventDefault();
        const dir = (e.code === 'ArrowUp') ? 1 : -1;
        set((s) => {
          const dims = s.edxMeta?.dimensions;
          if (!dims) return {};
          if (s.viewType === 'plan') return { level: clamp(s.level + dir, 0, dims.z - 1) };
          if (s.viewType === 'sectionX') return { sectionX: clamp(s.sectionX + dir, 0, dims.x - 1) };
          if (s.viewType === 'sectionY') return { sectionY: clamp(s.sectionY + dir, 0, dims.y - 1) };
          return {};
        });
      }
      // Layer visivi (B, V, T, R, O)
      else if (e.code === 'KeyB') toggle('showBuildings');
      else if (e.code === 'KeyV') toggle('showVegetation');
      else if (e.code === 'KeyT') toggle('showTerrain');
      else if (e.code === 'KeyR') toggle('showReceptors');
      else if (e.code === 'KeyO') toggle('showDataVoxels');
      // Sole (S)
      else if (e.code === 'KeyS') toggle('sunPathEnabled');
      // Vento (F, Shift+F)
      else if (e.code === 'KeyF') toggle(e.shiftKey ? 'showWindVolume' : 'showWindField');
      // Cambio vista (A per ciclare 2D/3D, E per boundary)
      else if (e.code === 'KeyA') {
        set((s) => ({ appView: s.appView === 'analysis' ? 'model' : 'analysis' }));
      }
      else if (e.code === 'KeyE') set({ appView: 'boundary' });
      // Tema chiaro/scuro (Shift + D)
      else if (e.code === 'KeyD' && e.shiftKey) toggleTheme();
      // Comparazione (C)
      else if (e.code === 'KeyC') {
        if (state.filesetBOpen) {
          if (state.appView === 'analysis') {
            const modes = ['single', 'b', 'ab', 'abdiff'];
            setCompareMode(modes[(modes.indexOf(state.compareMode) + 1) % modes.length]);
          } else if (state.appView === 'model') {
            const modes = ['single', 'b', 'ab'];
            setCompareMode3D(modes[(modes.indexOf(state.compareMode3D) + 1) % modes.length]);
          }
        }
      }
      // Sidebar (backslash o accentata)
      else if (e.code === 'Backslash' || e.code === 'IntlBackslash') {
        set((s) => {
          const bothClosed = s.sidebarCollapsed && s.viewBarCollapsed;
          return { sidebarCollapsed: !bothClosed, viewBarCollapsed: !bothClosed };
        });
      }
      // Shortcuts Help (Shift + ?)
      else if (e.key === '?' && e.shiftKey) {
        toggle('showShortcuts');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [set, toggle, toggleTheme, setCompareMode, setCompareMode3D, state.appView, state.filesetBOpen, state.compareMode, state.compareMode3D]);

  return (
    <div className="app-root">
      <TopBar />
      <div className={`body-row ${!Sidebar || state.sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {Sidebar && (
          <>
            <aside className="sidebar">
              <div className="sidebar-inner">
                <Sidebar />
              </div>
            </aside>

            <HelpTooltip content={{ title: tr('help_sidebar_toggle_title'), body: tr('help_sidebar_toggle_body') }}>
              <button
                className="sidebar-toggle"
                onClick={() => toggle('sidebarCollapsed')}
                aria-label={state.sidebarCollapsed ? "Espandi sidebar" : "Riduci sidebar"}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
            </HelpTooltip>
          </>
        )}

        <main className="main">
          <Main />
        </main>
      </div>
      <CreditsModal />
      <ShortcutsModal />
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
