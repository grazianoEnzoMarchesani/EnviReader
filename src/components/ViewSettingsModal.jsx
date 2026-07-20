import { useAppState } from '../state/AppStateContext';
import { useI18n } from '../i18n/I18nContext';
import Slider from './controls/Slider';
import { DEFAULT_SECTION_LINE_COLOR } from './views/AnalysisView';

export default function ViewSettingsModal() {
  const { state, set } = useAppState();
  const { tr } = useI18n();

  if (!state.viewSettingsOpen) return null;

  const close = () => set({ viewSettingsOpen: false });

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{tr('btn_view_settings')}</div>

        <div className="modal-section-title">{tr('group_section_line')}</div>
        <div className="view-bar-group">
          <Slider label={tr('slider_section_line_width')} value={state.sectionLineWidth} min={1} max={5} step={1} unit="px" onChange={(v) => set({ sectionLineWidth: v })} />
          <Slider label={tr('slider_section_line_gap')} value={state.sectionLineGap} min={0} max={12} step={1} unit="px" onChange={(v) => set({ sectionLineGap: v })} />
          <span className="line-color-row">
            <input
              type="color"
              className="line-color-input"
              title={tr('label_section_line_color')}
              aria-label={tr('label_section_line_color')}
              value={state.sectionLineColor || DEFAULT_SECTION_LINE_COLOR}
              onChange={(e) => set({ sectionLineColor: e.target.value })}
            />
            {state.sectionLineColor && (
              <button type="button" className="step-btn" title={tr('btn_section_line_color_reset')} onClick={() => set({ sectionLineColor: null })}>↺</button>
            )}
          </span>
        </div>

        {state.showObjectsOverlay && (
          <>
            <div className="modal-section-title">{tr('toggle_objects_overlay')}</div>
            <div className="view-bar-group">
              <Slider label={tr('slider_objects_opacity')} value={state.objOverlayOpacity} min={0} max={100} unit="%" onChange={(v) => set({ objOverlayOpacity: v })} />
            </div>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button className="primary-btn" onClick={close}>{tr('btn_close')}</button>
        </div>
      </div>
    </div>
  );
}
