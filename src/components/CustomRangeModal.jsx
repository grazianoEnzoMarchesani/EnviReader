import { useState, useEffect } from 'react';
import { useAppState } from '../state/AppStateContext';
import { useI18n } from '../i18n/I18nContext';

export default function CustomRangeModal() {
  const { state, set } = useAppState();
  const { tr } = useI18n();
  const modalData = state.customRangeModal;

  const [minVal, setMinVal] = useState('');
  const [maxVal, setMaxVal] = useState('');

  useEffect(() => {
    if (modalData) {
      setMinVal(modalData.min != null ? String(modalData.min) : '');
      setMaxVal(modalData.max != null ? String(modalData.max) : '');
    }
  }, [modalData]);

  if (!modalData) return null;

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

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{modalData.title}</div>
        <p className="modal-text" style={{ marginBottom: '16px' }}>
          Imposta i limiti manuali per questa specifica visualizzazione.
        </p>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Minimo</label>
            <input
              type="number"
              step="any"
              value={minVal}
              onChange={(e) => setMinVal(e.target.value)}
              style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Massimo</label>
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
            Annulla
          </button>
          <button className="primary-btn" onClick={handleSave}>
            Applica
          </button>
        </div>
      </div>
    </div>
  );
}
