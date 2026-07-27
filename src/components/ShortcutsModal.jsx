import { useAppState } from '../state/AppStateContext';
import { useI18n } from '../i18n/I18nContext';
import { useModalKeyboard } from '../lib/useModalKeyboard';

export default function ShortcutsModal() {
  const { state, toggle } = useAppState();
  const { tr } = useI18n();

  const close = () => toggle('showShortcuts');
  useModalKeyboard(state.showShortcuts, close, close);

  if (!state.showShortcuts) return null;

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal-card credits-card shortcuts-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{tr('title_keyboard_shortcuts')}</div>
        
        <div className="shortcuts-grid">
          <div className="shortcuts-section">
            <h3 className="credits-subtitle">{tr('shortcuts_time_nav')}</h3>
            <div className="shortcut-row">
              <span className="shortcut-desc">{tr('shortcut_play_pause')}</span>
              <kbd className="shortcut-key">Space</kbd>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">{tr('shortcut_time_step')}</span>
              <span className="shortcut-keys"><kbd className="shortcut-key">←</kbd> <kbd className="shortcut-key">→</kbd></span>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">{tr('shortcut_move_z')}</span>
              <span className="shortcut-keys"><kbd className="shortcut-key">↑</kbd> <kbd className="shortcut-key">↓</kbd> {tr('shortcut_or')} <kbd className="shortcut-key">W</kbd> <kbd className="shortcut-key">S</kbd></span>
            </div>
          </div>

          <div className="shortcuts-section">
            <h3 className="credits-subtitle">{tr('shortcuts_quick_views')}</h3>
            <div className="shortcut-row">
              <span className="shortcut-desc">{tr('shortcut_plan_view')}</span>
              <kbd className="shortcut-key">1</kbd>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">{tr('shortcut_section_x')}</span>
              <kbd className="shortcut-key">2</kbd>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">{tr('shortcut_section_y')}</span>
              <kbd className="shortcut-key">3</kbd>
            </div>
          </div>

          <div className="shortcuts-section">
            <h3 className="credits-subtitle">{tr('shortcuts_visual_layers')}</h3>
            <div className="shortcut-row">
              <span className="shortcut-desc">{tr('layer_buildings')}</span>
              <kbd className="shortcut-key">B</kbd>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">{tr('layer_vegetation')}</span>
              <kbd className="shortcut-key">V</kbd>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">{tr('layer_terrain')}</span>
              <kbd className="shortcut-key">T</kbd>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">{tr('layer_receptors')}</span>
              <kbd className="shortcut-key">R</kbd>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">{tr('layer_data_voxels')}</span>
              <kbd className="shortcut-key">O</kbd>
            </div>
          </div>

          <div className="shortcuts-section">
            <h3 className="credits-subtitle">{tr('shortcuts_data_env')}</h3>
            <div className="shortcut-row">
              <span className="shortcut-desc">{tr('shortcut_wind_field_2d')}</span>
              <kbd className="shortcut-key">F</kbd>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">{tr('shortcut_wind_volume_3d')}</span>
              <kbd className="shortcut-key">Shift + F</kbd>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">{tr('shortcut_compare_mode')}</span>
              <kbd className="shortcut-key">C</kbd>
            </div>
          </div>
          
          <div className="shortcuts-section">
            <h3 className="credits-subtitle">{tr('shortcuts_general_ui')}</h3>
            <div className="shortcut-row">
              <span className="shortcut-desc">{tr('shortcut_model_analysis')}</span>
              <span className="shortcut-keys"><kbd className="shortcut-key">M</kbd> <kbd className="shortcut-key">A</kbd></span>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">{tr('shortcut_toggle_sidebar')}</span>
              <kbd className="shortcut-key">\</kbd>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">{tr('shortcut_theme')}</span>
              <kbd className="shortcut-key">Shift + D</kbd>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">{tr('shortcut_help')}</span>
              <kbd className="shortcut-key">Shift + ?</kbd>
            </div>
          </div>
        </div>

        <button className="primary-btn" onClick={close} style={{ marginTop: '1.5rem' }}>
          {tr('btn_close') || 'Close'}
        </button>
      </div>
    </div>
  );
}
