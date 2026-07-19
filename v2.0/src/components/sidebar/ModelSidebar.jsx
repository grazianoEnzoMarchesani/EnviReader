import { MODEL_LAYERS } from '../../data/constants';
import { useAppState } from '../../state/AppStateContext';
import { useI18n } from '../../i18n/I18nContext';
import Toggle from '../controls/Toggle';

export default function ModelSidebar() {
  const { state, toggle, set } = useAppState();
  const { tr } = useI18n();

  return (
    <div className="tab-panel">
      <div className="section">
        <div className="group-label">{tr('model_group_layers')}</div>
        {MODEL_LAYERS.map((l) => (
          <Toggle key={l.key} label={tr(l.labelKey)} on={state[l.key]} onToggle={() => toggle(l.key)} />
        ))}
      </div>
      <div className="section">
        <div className="group-label">{tr('model_group_view')}</div>
        <button className="ghost-btn" onClick={() => set((s) => ({ resetViewNonce: s.resetViewNonce + 1 }))}>
          {tr('btn_reset_view')}
        </button>
        <Toggle label={tr('btn_wireframe')} on={state.wireframe} onToggle={() => toggle('wireframe')} />
      </div>
    </div>
  );
}
