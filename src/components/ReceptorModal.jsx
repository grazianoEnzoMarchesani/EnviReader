import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { useModalKeyboard } from '../lib/useModalKeyboard';
import { loadReceptorData } from '../lib/envimet';
import TimeSeriesChart from './TimeSeriesChart';

export default function ReceptorModal({ receptor, structure, onClose }) {
  const { tr } = useI18n();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedZ, setSelectedZ] = useState(null);

  useModalKeyboard(!!receptor, onClose, onClose);

  useEffect(() => {
    if (!receptor || !structure) {
      setData(null);
      setSelectedZ(null);
      return;
    }
    setLoading(true);
    let cancelled = false;
    loadReceptorData(structure, receptor.name).then((res) => {
      if (!cancelled) {
        setData(res);
        setSelectedZ(null);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [receptor, structure]);

  if (!receptor) return null;

  let content;
  let heightSelectNode = null;
  
  if (loading) {
    content = <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>;
  } else if (!data) {
    content = <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>No data found for receptor: {receptor.name}</div>;
  } else {
    // find height column
    const heightKey = data.headers.find(h => {
      const lower = h.trim().toLowerCase();
      return lower === 'z (m)' || lower === '-z(cm)';
    });

    let chartData = data.data;

    if (heightKey) {
      const availableHeights = [...new Set(data.data.map(r => r[heightKey]))].filter(v => typeof v === 'number');
      availableHeights.sort((a, b) => a - b);
      if (availableHeights.length > 0) {
        let currentZ = selectedZ;
        if (currentZ === null || !availableHeights.includes(currentZ)) {
          const targetHeight = heightKey.includes('cm') ? 0 : 1.5;
          currentZ = availableHeights.reduce((prev, curr) => 
            Math.abs(curr - targetHeight) < Math.abs(prev - targetHeight) ? curr : prev
          );
        }
        
        chartData = data.data.filter(r => r[heightKey] === currentZ);
        const unit = heightKey.includes('cm') ? 'cm' : 'm';
        
        heightSelectNode = (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'color-mix(in srgb, var(--text) 3%, transparent)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '24px' }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Altezza (z)</label>
            <div style={{ position: 'relative' }}>
              <select 
                style={{
                  padding: '8px 36px 8px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  fontWeight: '600',
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  minWidth: '120px'
                }}
                value={currentZ} 
                onChange={(e) => setSelectedZ(Number(e.target.value))}
              >
                {availableHeights.map(h => (
                  <option key={h} value={h}>{h} {unit}</option>
                ))}
              </select>
              <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)', display: 'flex' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>
          </div>
        );
      }
    }

    // Assume we look for a 'DateTime' column for labels
    const timeKey = data.headers.find(h => h.trim().toLowerCase() === 'datetime') 
                 || data.headers.find(h => h.toLowerCase().includes('time') || h.toLowerCase().includes('date'));
    const labels = timeKey ? chartData.map(row => {
      let val = row[timeKey];
      if (typeof val === 'string' && val.includes(' ')) {
        val = val.replace(' ', ' · ');
      }
      return val;
    }) : chartData.map((_, i) => String(i));
    
    // We filter numeric headers
    const excludeHeaders = ['model time (min)', 'model time'];
    if (heightKey) excludeHeaders.push(heightKey.trim().toLowerCase());
    if (timeKey) excludeHeaders.push(timeKey.trim().toLowerCase());

    const numericHeaders = data.headers.filter(h => {
      const lower = h.trim().toLowerCase();
      if (excludeHeaders.includes(lower)) return false;
      return typeof chartData[0]?.[h] === 'number';
    });

    content = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {numericHeaders.length === 0 && <p className="modal-text">No numeric data found.</p>}
        {numericHeaders.map(header => (
          <div key={header} style={{ background: 'var(--surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '4px', height: '16px', background: 'var(--series-b, var(--accent))', borderRadius: '2px' }}></div>
              {header}
            </div>
            <div style={{ height: '260px', width: '100%', position: 'relative' }}>
              <TimeSeriesChart 
                series={[{ name: header, color: 'var(--series-b)', values: chartData.map(row => row[header]) }]} 
                labels={labels} 
                time={null} 
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ backdropFilter: 'blur(4px)' }}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '900px', padding: 0, display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 12px 32px rgba(0,0,0,0.2)' }}>
        {/* Header fixed */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)' }}>
              Receptor: <span style={{ color: 'var(--accent)' }}>{receptor.name}</span>
            </span>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', transition: 'background 0.2s' }} 
            onMouseOver={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--text) 5%, transparent)'} 
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        {/* Scrollable Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, background: 'color-mix(in srgb, var(--surface) 97%, transparent)' }}>
          {heightSelectNode}
          {content}
        </div>
        
        {/* Footer fixed */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface)', zIndex: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="primary-btn" style={{ width: 'auto', minWidth: '120px', margin: 0 }} onClick={onClose}>
            {tr('btn_close')}
          </button>
        </div>
      </div>
    </div>
  );
}
