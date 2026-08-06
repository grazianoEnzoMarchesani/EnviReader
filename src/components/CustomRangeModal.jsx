import { useState, useEffect } from 'react';
import { useAppState } from '../state/AppStateContext';
import { useI18n } from '../i18n/I18nContext';
import { useModalKeyboard } from '../lib/useModalKeyboard';
import { useModalTransition } from '../lib/useModalTransition';

const roundForDisplay = (n) => Math.round(n * 100) / 100;

// Slider a due maniglie per velocizzare l'inserimento: i suoi estremi restano
// fissi ai limiti con cui il modale si è aperto (il range "naturale" di
// quella vista), anche se poi l'utente digita valori diversi nei campi di
// testo — che restano comunque liberi di accettare qualsiasi numero.
function DualRangeSlider({ boundMin, boundMax, minVal, maxVal, onChange }) {
  const span = boundMax - boundMin;
  const step = span > 0 ? span / 500 : 1;
  const clamp = (n) => Math.min(boundMax, Math.max(boundMin, n));
  const curMin = clamp(isNaN(minVal) ? boundMin : minVal);
  const curMax = clamp(isNaN(maxVal) ? boundMax : maxVal);

  const handleMin = (e) => {
    const v = Math.min(parseFloat(e.target.value), curMax);
    onChange(roundForDisplay(v), null);
  };
  const handleMax = (e) => {
    const v = Math.max(parseFloat(e.target.value), curMin);
    onChange(null, roundForDisplay(v));
  };

  const minPct = span > 0 ? ((curMin - boundMin) / span) * 100 : 0;
  const maxPct = span > 0 ? ((curMax - boundMin) / span) * 100 : 100;
  // euristica per portare in primo piano la maniglia più vicina al bordo
  // opposto, così resta afferrabile anche quando le due si sovrappongono
  const minOnTop = (curMin - boundMin) > (boundMax - curMax);

  return (
    <div className="dual-range">
      <div className="dual-range-track" />
      <div className="dual-range-fill" style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }} />
      <input
        type="range"
        className="dual-range-input"
        style={{ zIndex: minOnTop ? 4 : 3 }}
        min={boundMin}
        max={boundMax}
        step={step}
        value={curMin}
        onChange={handleMin}
        aria-label="Min"
      />
      <input
        type="range"
        className="dual-range-input"
        style={{ zIndex: minOnTop ? 3 : 4 }}
        min={boundMin}
        max={boundMax}
        step={step}
        value={curMax}
        onChange={handleMax}
        aria-label="Max"
      />
    </div>
  );
}

export default function CustomRangeModal() {
  const { state, set } = useAppState();
  const { tr } = useI18n();
  const modalData = state.customRangeModal;

  const [minVal, setMinVal] = useState('');
  const [maxVal, setMaxVal] = useState('');
  const [bounds, setBounds] = useState(null);

  useEffect(() => {
    if (modalData) {
      setMinVal(modalData.min != null ? String(roundForDisplay(modalData.min)) : '');
      setMaxVal(modalData.max != null ? String(roundForDisplay(modalData.max)) : '');
      setBounds(
        modalData.min != null && modalData.max != null && modalData.min < modalData.max
          ? { min: modalData.min, max: modalData.max }
          : null,
      );
    }
  }, [modalData]);

  const handleSave = () => {
    const numMin = parseFloat(minVal);
    const numMax = parseFloat(maxVal);

    if (!isNaN(numMin) && !isNaN(numMax) && numMin <= numMax) {
      set((s) => {
        const is3D = modalData.key.endsWith('-3d');
        return {
          customRanges: {
            ...s.customRanges,
            [modalData.key]: { min: numMin, max: numMax },
          },
          ...(is3D ? { scaleType3D: 'custom' } : { scaleType: 'custom' }),
          customRangeModal: null,
        };
      });
    }
  };

  const handleClose = () => {
    set({ customRangeModal: null });
  };

  useModalKeyboard(!!modalData, handleSave, handleClose);
  const { data: modalDisplay, closing } = useModalTransition(modalData);

  if (!modalDisplay) return null;

  return (
    <div className={`modal-backdrop${closing ? ' is-closing' : ''}`} onClick={handleClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{modalDisplay.title}</div>
        <p className="modal-text" style={{ marginBottom: '16px' }}>
          {tr('modal_custom_range_desc')}
        </p>

        {bounds && (
          <DualRangeSlider
            boundMin={bounds.min}
            boundMax={bounds.max}
            minVal={parseFloat(minVal)}
            maxVal={parseFloat(maxVal)}
            onChange={(newMin, newMax) => {
              if (newMin != null) setMinVal(String(newMin));
              if (newMax != null) setMaxVal(String(newMax));
            }}
          />
        )}

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
