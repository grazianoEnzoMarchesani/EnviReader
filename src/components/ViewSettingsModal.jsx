import { useAppState } from '../state/AppStateContext';
import { useI18n } from '../i18n/I18nContext';
import Slider from './controls/Slider';
import Segmented from './controls/Segmented';
import Select from './controls/Select';
import Toggle from './controls/Toggle';
import { DEFAULT_SECTION_LINE_COLOR } from './views/AnalysisView';
import { useModalKeyboard } from '../lib/useModalKeyboard';

export default function ViewSettingsModal() {
  const { state, set, toggle } = useAppState();
  const { tr } = useI18n();

  const close = () => set({ viewSettingsOpen: false });
  useModalKeyboard(state.viewSettingsOpen, close, close);

  if (!state.viewSettingsOpen) return null;
  // Nel viewer 3D non esistono linea di sezione né overlay oggetti in 2D: il
  // modale mostra lì solo lo slider dimensione widget, valido per entrambe le viste.
  const is3D = state.appView === 'model';

  const styleOptions = [
    { value: 'default', label: tr('style_default') },
    { value: 'style1', label: tr('style_style1') },
    { value: 'style2', label: tr('style_style2') },
    { value: 'style3', label: tr('style_style3') },
  ];

  const currentObjectStyle = state.objectStyle || (state.style1 ? 'style1' : 'default');

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{tr('btn_view_settings')}</div>

        <div className="modal-section-title">{tr('label_object_style')}</div>
        <div className="view-bar-group" style={{ marginBottom: is3D ? 0 : '16px' }}>
          <Select
            value={currentObjectStyle}
            options={styleOptions}
            onChange={(val) => set({ objectStyle: val, style1: val === 'style1' })}
          />
        </div>
        {is3D && (
          <div className="modal-field" style={{ marginTop: '14px', marginBottom: '16px' }}>
            <Toggle
              label={tr('toggle_ambient_occlusion')}
              on={state.ambientOcclusion}
              onToggle={() => toggle('ambientOcclusion')}
            />
          </div>
        )}

        {is3D && (
          <>
            <div className="modal-section-title">{tr('model_group_view')}</div>
            <div className="modal-field-group">
              <div className="modal-field">
                <span className="control-label">{tr('model_projection')}</span>
                <Segmented
                  options={[
                    { key: 'perspective', label: tr('proj_perspective'), help: { title: tr('help_proj_perspective_title'), body: tr('help_proj_perspective_body') } },
                    { key: 'parallel', label: tr('proj_parallel'), help: { title: tr('help_proj_parallel_title'), body: tr('help_proj_parallel_body') } },
                  ]}
                  value={state.cameraProjection}
                  onSelect={(key) => set({ cameraProjection: key })}
                />
              </div>
              <div className="modal-field">
                <span className="control-label">{tr('model_north_ref')}</span>
                <Segmented
                  options={[
                    { key: 'true', label: tr('north_ref_true'), help: { title: tr('help_north_true_title'), body: tr('help_north_true_body') } },
                    { key: 'grid', label: tr('north_ref_grid'), help: { title: tr('help_north_grid_title'), body: tr('help_north_grid_body') } },
                  ]}
                  value={state.gizmoNorthMode}
                  onSelect={(key) => set({ gizmoNorthMode: key })}
                />
              </div>
            </div>
          </>
        )}

        {!is3D && (
          <>
            <div className="modal-section-title">{tr('group_section_line')}</div>
            <div className="view-bar-group">
              <Slider label={tr('slider_section_line_width')} value={state.sectionLineWidth} min={1} max={5} step={1} unit="px" onChange={(v) => set({ sectionLineWidth: v })} />
              <Slider label={tr('slider_section_line_gap')} value={state.sectionLineGap} min={0} max={12} step={1} unit="px" onChange={(v) => set({ sectionLineGap: v })} />
              <div className="line-color-field">
                <span className="control-label">{tr('label_section_line_color')}</span>
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
            </div>
          </>
        )}

        {!is3D && state.showObjectsOverlay && (
          <>
            <div className="modal-section-title">{tr('help_objects_overlay_title')}</div>
            <div className="view-bar-group">
              <Slider label={tr('slider_objects_opacity')} value={state.objOverlayOpacity} min={0} max={100} unit="%" onChange={(v) => set({ objOverlayOpacity: v })} />
            </div>
          </>
        )}

        <div className="modal-section-title">{tr('group_widgets')}</div>
        <div className="view-bar-group">
          <Slider label={tr('slider_widget_scale')} value={state.widgetScale} min={100} max={300} step={10} unit="%" onChange={(v) => set({ widgetScale: v })} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button className="primary-btn" onClick={close}>{tr('btn_close')}</button>
        </div>
      </div>
    </div>
  );
}
