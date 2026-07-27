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
    content = <p className="modal-text">Loading...</p>;
  } else if (!data) {
    content = <p className="modal-text">No data found for receptor: {receptor.name}</p>;
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
          <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ color: 'var(--text-color)', fontSize: '14px', fontWeight: '500' }}>Altezza (z):</label>
            <select 
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--card-bg)',
                color: 'var(--text-color)',
                fontSize: '14px',
                outline: 'none',
                cursor: 'pointer'
              }}
              value={currentZ} 
              onChange={(e) => setSelectedZ(Number(e.target.value))}
            >
              {availableHeights.map(h => (
                <option key={h} value={h}>{h} {unit}</option>
              ))}
            </select>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
        {numericHeaders.length === 0 && <p className="modal-text">No numeric data found.</p>}
        {numericHeaders.map(header => (
          <div key={header}>
            <div className="credits-subtitle" style={{ marginBottom: '8px' }}>{header}</div>
            <div style={{ height: '240px', width: '100%', position: 'relative' }}>
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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card credits-card" onClick={(e) => e.stopPropagation()} style={{ width: '80%', maxWidth: '800px' }}>
        <div className="modal-title" style={{ marginBottom: '15px' }}>Receptor: {receptor.name}</div>
        {heightSelectNode}
        {content}
        <div style={{ marginTop: '20px' }}>
          <button className="primary-btn" onClick={onClose}>
            {tr('btn_close')}
          </button>
        </div>
      </div>
    </div>
  );
}
