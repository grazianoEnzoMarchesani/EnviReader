import { useState } from 'react';
import { useAppState } from '../state/AppStateContext';
import { useI18n } from '../i18n/I18nContext';
import { exportCharts } from '../lib/exportUtils';
import Segmented from './controls/Segmented';

export default function SaveChartModal({ onClose }) {
  const { state, set } = useAppState();
  const { tr } = useI18n();

  const [exportMode, setExportMode] = useState(state.compareMode || 'single');
  const [zipAll, setZipAll] = useState(true);
  const [groupFolders, setGroupFolders] = useState(true);
  const [saveSvg, setSaveSvg] = useState(true);
  const [saveBoundarySvg, setSaveBoundarySvg] = useState(true);
  const [saveGif, setSaveGif] = useState(false);
  const [fps, setFps] = useState(5);
  const [saveDatasheet, setSaveDatasheet] = useState(false);
  const [datasheetFormat, setDatasheetFormat] = useState('xlsx');
  const [datasheetDecimals, setDatasheetDecimals] = useState(2);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState('');

  const handleExport = async () => {
    setExporting(true);
    setProgress(tr('exporting_start') || 'Starting export...');
    try {
      await exportCharts({
        state,
        setState: set,
        exportMode,
        zipAll,
        groupFolders,
        saveSvg,
        saveBoundarySvg,
        saveGif,
        fps,
        saveDatasheet,
        datasheetFormat,
        datasheetDecimals,
        tr,
        onProgress: (msg) => setProgress(msg),
      });
      onClose();
    } catch (err) {
      console.error('Export error:', err);
      setProgress('Error: ' + err.message);
      // Wait a bit before allowing to close or retry
      setTimeout(() => setExporting(false), 3000);
    }
  };

  const compareOptions = [
    { key: 'single', label: tr('compare_single') || 'Solo A' },
    { key: 'b', label: tr('compare_b') || 'Solo B', disabled: !state.filesetBOpen, title: !state.filesetBOpen ? (tr('hint_open_b') || 'Open fileset B to enable') : undefined },
    { key: 'ab', label: tr('compare_ab') || 'A vs B', disabled: !state.filesetBOpen, title: !state.filesetBOpen ? (tr('hint_open_b') || 'Open fileset B to enable') : undefined },
    { key: 'abdiff', label: tr('compare_abdiff') || 'A vs B vs Diff', disabled: !state.filesetBOpen, title: !state.filesetBOpen ? (tr('hint_open_b') || 'Open fileset B to enable') : undefined },
  ];

  return (
    <div className="modal-backdrop" onClick={!exporting ? onClose : undefined}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ minWidth: '350px' }}>
        <div className="modal-title">{tr('modal_save_chart_title') || 'Save Charts'}</div>
        <p className="modal-text" style={{ marginBottom: '16px' }}>
          {tr('modal_save_chart_desc') || 'Select the export options for the charts.'}
        </p>

        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
          <Segmented options={compareOptions} value={exportMode} onSelect={setExportMode} variant="accent" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={zipAll}
                onChange={(e) => setZipAll(e.target.checked)}
                disabled={exporting}
              />
              <span style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 500 }}>{tr('modal_save_chart_zip') || 'Zip all outputs'}</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', opacity: zipAll ? 1 : 0.5, marginLeft: '24px' }}>
              <input
                type="checkbox"
                checked={groupFolders}
                onChange={(e) => setGroupFolders(e.target.checked)}
                disabled={exporting || !zipAll}
              />
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{tr('modal_save_chart_folders') || 'Organizza i file in sottocartelle (PNG, SVG, GIF)'}</span>
            </label>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={saveSvg}
              onChange={(e) => setSaveSvg(e.target.checked)}
              disabled={exporting}
            />
            <span style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 500 }}>{tr('modal_save_chart_svg') || 'Export additional maps in editable vector format (SVG)'}</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={saveBoundarySvg}
              onChange={(e) => setSaveBoundarySvg(e.target.checked)}
              disabled={exporting}
            />
            <span style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 500 }}>{tr('modal_save_chart_boundary_svg') || 'Export boundary condition charts (SVG)'}</span>
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={saveGif}
                onChange={(e) => setSaveGif(e.target.checked)}
                disabled={exporting}
              />
              <span style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 500 }}>{tr('modal_save_chart_gif') || 'Save temporal trend as animated GIF'}</span>
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '24px', opacity: saveGif ? 1 : 0.5, pointerEvents: saveGif ? 'auto' : 'none' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{tr('modal_save_chart_fps') || 'Frames per second (fps):'}</span>
              <input
                type="number"
                min="1"
                max="30"
                value={fps}
                onChange={(e) => setFps(parseInt(e.target.value, 10))}
                disabled={exporting || !saveGif}
                style={{ width: '60px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={saveDatasheet}
                onChange={(e) => setSaveDatasheet(e.target.checked)}
                disabled={exporting}
              />
              <span style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 500 }}>{tr('modal_save_chart_datasheet') || 'Salva dati in formato testuale o Excel (XLSX)'}</span>
            </label>

            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px', marginLeft: '24px', opacity: saveDatasheet ? 1 : 0.5, pointerEvents: saveDatasheet ? 'auto' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{tr('modal_save_chart_datasheet_format') || 'Formato:'}</span>
                <select
                  value={datasheetFormat}
                  onChange={(e) => setDatasheetFormat(e.target.value)}
                  disabled={exporting || !saveDatasheet}
                  style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '13px' }}
                >
                  <option value="txt">{tr('format_text') || 'Testuale (CSV)'}</option>
                  <option value="xlsx">{tr('format_excel') || 'Excel (XLSX)'}</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{tr('modal_save_chart_datasheet_decimals') || 'Decimali:'}</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={datasheetDecimals}
                  onChange={(e) => setDatasheetDecimals(parseInt(e.target.value, 10))}
                  disabled={exporting || !saveDatasheet}
                  style={{ width: '50px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '13px' }}
                />
              </div>
            </div>
          </div>
        </div>

        {exporting && (
          <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: '6px', border: '1px solid var(--border)', marginBottom: '16px', fontSize: '13px', color: 'var(--text)' }}>
            <span className="btn-spinner" aria-hidden="true" style={{ marginRight: '8px' }} />
            {progress}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button className="primary-btn" onClick={onClose} disabled={exporting} style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}>
            {tr('btn_cancel')}
          </button>
          <button className="primary-btn" onClick={handleExport} disabled={exporting}>
            {tr('btn_export') || 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}
