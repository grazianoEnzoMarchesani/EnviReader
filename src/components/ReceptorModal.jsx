import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { useModalKeyboard } from '../lib/useModalKeyboard';
import { loadReceptorData } from '../lib/envimet';
import TimeSeriesChart from './TimeSeriesChart';

export default function ReceptorModal({ receptor, structure, onClose }) {
  const { tr } = useI18n();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useModalKeyboard(!!receptor, onClose, onClose);

  useEffect(() => {
    if (!receptor || !structure) {
      setData(null);
      return;
    }
    setLoading(true);
    let cancelled = false;
    loadReceptorData(structure, receptor.name).then((res) => {
      if (!cancelled) {
        setData(res);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [receptor, structure]);

  if (!receptor) return null;

  let content;
  let selectedHeightLabel = '';
  
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
      const targetHeight = heightKey.includes('cm') ? 0 : 1.5;
      const availableHeights = [...new Set(data.data.map(r => r[heightKey]))].filter(v => typeof v === 'number');
      if (availableHeights.length > 0) {
        const closestHeight = availableHeights.reduce((prev, curr) => 
          Math.abs(curr - targetHeight) < Math.abs(prev - targetHeight) ? curr : prev
        );
        chartData = data.data.filter(r => r[heightKey] === closestHeight);
        selectedHeightLabel = ` (z = ${closestHeight}${heightKey.includes('cm') ? 'cm' : 'm'})`;
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
                time={0} 
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
        <div className="modal-title">Receptor: {receptor.name}{selectedHeightLabel || ''}</div>
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
