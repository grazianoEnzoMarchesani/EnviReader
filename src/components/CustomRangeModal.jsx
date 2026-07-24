import { useState, useEffect } from 'react';
import { useAppState } from '../state/AppStateContext';
import { useI18n } from '../i18n/I18nContext';
import { useModalKeyboard } from '../lib/useModalKeyboard';

const roundForDisplay = (n) => Math.round(n * 100) / 100;

export default function CustomRangeModal() {
  const { state, set } = useAppState();
  const { tr } = useI18n();
  const modalData = state.customRangeModal;

  const [minVal, setMinVal] = useState('');
  const [maxVal, setMaxVal] = useState('');

  useEffect(() => {
    if (modalData) {
      setMinVal(modalData.min != null ? String(roundForDisplay(modalData.min)) : '');
      setMaxVal(modalData.max != null ? String(roundForDisplay(modalData.max)) : '');
    }
  }, [modalData]);

  const handleSave = () => {
    const numMin = parseFloat(minVal);
    const numMax = parseFloat(maxVal);

    if (!isNaN(numMin) && !isNaN(numMax) && numMin <= numMax) {
      set((s) => ({
        customRanges: {
          ...s.customRanges,
          [modalData.key]: { min: numMin, max: numMax },
        },
        scaleType: 'custom',
        customRangeModal: null,
      }));
    }
  };

  const handleClose = () => {
    set({ customRangeModal: null });
  };

  useModalKeyboard(!!modalData, handleSave, handleClose);

  if (!modalData) return null;

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{modalData.title}</div>
        <p className="modal-text" style={{ marginBottom: '16px' }}>
          {tr('modal_custom_range_desc')}
        </p>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{tr('label_min')}</label>
            <input
              type="number"
              step="any"
              value={minVal}
              onChange={(e) => setMinVal(e.target.value)}
              style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{tr('label_max')}</label>
            <input
              type="number"
              step="any"
              value={maxVal}
              onChange={(e) => setMaxVal(e.target.value)}
              style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button className="primary-btn" onClick={handleClose} style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}>
            {tr('btn_cancel')}
          </button>
          <button className="primary-btn" onClick={handleSave}>
            {tr('btn_apply')}
          </button>
        </div>
      </div>
    </div>
  );
}
