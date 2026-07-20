import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { generateBoundarySVGs } from './exportBoundary';

// Ritorna il tempo di attesa come Promise
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Ottiene un nome file parlante per la mappa corrente
function getMapFilename(state, type, vType, timeIndex, isAnimation = false) {
  const { dataset, level, filesetA, filesetB, seriesLabels } = state;
  let simName = type === 'A' ? (filesetA?.name || 'A') : type === 'B' ? (filesetB?.name || 'B') : 'Diff';
  
  if (filesetA?.name && filesetB?.name && filesetA.name === filesetB.name) {
    if (type === 'A') simName += '_A';
    if (type === 'B') simName += '_B';
  }
  
  const viewStr = vType === 'plan' ? `Z=${level}` : (vType === 'sectionX' ? 'SectionX' : 'SectionY');
  const timeStr = isAnimation ? 'Animation' : (seriesLabels[timeIndex] || `t=${timeIndex}`).replace(/[: \/]/g, '_');

  return `${simName}_${dataset}_${viewStr}_${timeStr}`;
}

// Genera un SVG "Ibrido": incorpora le mappe raster come immagini Base64 
// ma ricostruisce nativamente tutti i testi e le grafiche vettoriali
async function generateHybridSvg(card) {
  const cardRect = card.getBoundingClientRect();
  const width = cardRect.width;
  const height = cardRect.height;
  const computedBody = window.getComputedStyle(document.body);
  const bgColor = computedBody.getPropertyValue('--surface') || '#ffffff';

  let svgContent = `<rect width="100%" height="100%" fill="${bgColor.trim()}" />`;

  const escapeXml = (unsafe) => {
    if (!unsafe) return '';
    return String(unsafe).replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case "'": return '&apos;';
        case '"': return '&quot;';
      }
    });
  };

  const canvasToImageSvg = (canvas) => {
    if (!canvas) return '';
    const r = canvas.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return '';
    const b64 = canvas.toDataURL('image/png');
    return `<image href="${b64}" x="${r.left - cardRect.left}" y="${r.top - cardRect.top}" width="${r.width}" height="${r.height}" />`;
  };

  const extractSvgElement = (svgEl) => {
    if (!svgEl) return '';
    const r = svgEl.getBoundingClientRect();
    const clone = svgEl.cloneNode(true);
    clone.setAttribute('x', r.left - cardRect.left);
    clone.setAttribute('y', r.top - cardRect.top);
    clone.setAttribute('width', r.width);
    clone.setAttribute('height', r.height);
    return clone.outerHTML;
  };

  const extractTextSvg = (el) => {
    if (!el) return '';
    const r = el.getBoundingClientRect();
    const st = window.getComputedStyle(el);
    const color = st.color;
    const font = escapeXml(`${st.fontWeight} ${st.fontSize} ${st.fontFamily}`);
    const textContent = escapeXml(el.textContent.trim());
    const baselineY = r.top - cardRect.top + parseFloat(st.fontSize) * 0.8; 
    return `<text x="${r.left - cardRect.left}" y="${baselineY}" fill="${color}" style="font: ${font};">${textContent}</text>`;
  };

  const extractWidgetNativeSvg = (el, isLegendBar = false) => {
    if (!el) return '';
    const r = el.getBoundingClientRect();
    const st = window.getComputedStyle(el);
    const bg = st.backgroundColor !== 'rgba(0, 0, 0, 0)' ? st.backgroundColor : 'transparent';
    const border = st.borderTopColor !== 'rgba(0, 0, 0, 0)' && st.borderTopWidth !== '0px' ? st.borderTopColor : 'none';
    const radius = parseFloat(st.borderTopLeftRadius) || 0;
    
    let innerSvg = '';

    if (isLegendBar) {
      const bgImage = el.style.background || el.style.backgroundImage;
      let fill = bg;
      let defs = '';
      if (bgImage && bgImage.includes('linear-gradient')) {
        const colorsStr = bgImage.substring(bgImage.indexOf('linear-gradient') + 15, bgImage.lastIndexOf(')'));
        const parts = colorsStr.split(/,(?![^\(]*\))/);
        let colors = parts;
        if (parts[0].includes('deg') || parts[0].includes('to ')) colors = parts.slice(1);
        
        const gradientId = 'grad-' + Math.random().toString(36).substr(2, 9);
        let stops = '';
        colors.forEach((c, i) => {
          stops += `<stop offset="${(i / (colors.length - 1)) * 100}%" stop-color="${c.trim()}" />`;
        });
        defs = `<defs><linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">${stops}</linearGradient></defs>`;
        fill = `url(#${gradientId})`;
      }
      return `${defs}<rect x="${r.left - cardRect.left}" y="${r.top - cardRect.top}" width="${r.width}" height="${r.height}" rx="4" fill="${fill}" />`;
    }

    const texts = el.querySelectorAll('span, div');
    texts.forEach(textEl => {
      if (textEl.childElementCount === 0 && textEl.textContent.trim()) {
        const tr = textEl.getBoundingClientRect();
        const tst = window.getComputedStyle(textEl);
        const font = escapeXml(`${tst.fontWeight} ${tst.fontSize} ${tst.fontFamily}`);
        const text = escapeXml(textEl.textContent.trim());
        const by = tr.top - r.top + parseFloat(tst.fontSize) * 0.82;
        const isCentered = tst.textAlign === 'center' || st.alignItems === 'center' || st.justifyContent === 'center';
        
        let cx = tr.left - r.left;
        if (isCentered) cx += tr.width / 2;
        
        innerSvg += `<text x="${cx}" y="${by}" fill="${tst.color}" style="font: ${font};" ${isCentered ? 'text-anchor="middle"' : ''}>${text}</text>`;
      }
    });

    const svgEls = el.querySelectorAll('svg');
    svgEls.forEach(svgEl => {
      const clone = svgEl.cloneNode(true);
      const isCentered = st.alignItems === 'center' || st.justifyContent === 'center';
      const sst = window.getComputedStyle(svgEl);
      
      let w = parseFloat(sst.width) || 24;
      let h = parseFloat(sst.height) || 24;
      let x = (r.width - w) / 2;
      let y = (r.height - h) / 2;
      
      if (!isCentered) {
        const sr = svgEl.getBoundingClientRect();
        w = sr.width;
        h = sr.height;
        x = sr.left - r.left;
        y = sr.top - r.top;
      }

      clone.setAttribute('x', x);
      clone.setAttribute('y', y);
      clone.setAttribute('width', w);
      clone.setAttribute('height', h);
      
      const cFill = sst.fill !== 'none' ? sst.fill : sst.color;
      if (!clone.hasAttribute('fill') || clone.getAttribute('fill') === 'currentColor') {
         clone.setAttribute('fill', cFill);
      }
      
      clone.querySelectorAll('*').forEach(child => {
         if (child.getAttribute('fill') === 'currentColor') child.setAttribute('fill', cFill);
         if (child.getAttribute('stroke') === 'currentColor') child.setAttribute('stroke', cFill);
      });
      
      innerSvg += clone.outerHTML;
    });

    return `<svg x="${r.left - cardRect.left}" y="${r.top - cardRect.top}" width="${r.width}" height="${r.height}">
      <rect x="0" y="0" width="${r.width}" height="${r.height}" rx="${radius}" fill="${bg}" stroke="${border}" />
      ${innerSvg}
    </svg>`;
  };

  // 1. Canvases
  svgContent += canvasToImageSvg(card.querySelector('.map-canvas'));
  svgContent += canvasToImageSvg(card.querySelector('.map-wind-canvas'));

  // 2. SVG Overlays: crosshair marks in section views (one per axis), the
  // rotatable section cross in plan view
  card.querySelectorAll('.map-mark-svg').forEach((el) => { svgContent += extractSvgElement(el); });
  svgContent += extractSvgElement(card.querySelector('.map-section-svg'));

  const northContainer = card.querySelector('.map-north');
  if (northContainer) svgContent += extractWidgetNativeSvg(northContainer);

  const sectionCompass = card.querySelector('.map-section-compass');
  if (sectionCompass) svgContent += extractWidgetNativeSvg(sectionCompass);

  const calendarContainer = card.querySelector('.map-calendar');
  if (calendarContainer) svgContent += extractWidgetNativeSvg(calendarContainer);

  const clockContainer = card.querySelector('.map-clock');
  if (clockContainer) svgContent += extractWidgetNativeSvg(clockContainer);

  const windLegendWedge = card.querySelector('.map-wind-legend svg');
  if (windLegendWedge) svgContent += extractSvgElement(windLegendWedge);

  // 4. Legend Bar
  const legendBar = card.querySelector('.map-legend-bar');
  if (legendBar) svgContent += extractWidgetNativeSvg(legendBar, true);

  // 5. Texts
  svgContent += extractTextSvg(card.querySelector('.chart-title'));
  svgContent += extractTextSvg(card.querySelector('.chart-stats'));
  card.querySelectorAll('.map-legend-label').forEach(el => {
    svgContent += extractTextSvg(el);
  });

  const fontStr = computedBody.getPropertyValue('--font') || 'sans-serif';
  const textColor = computedBody.getPropertyValue('--text').trim() || '#111827';
  const textSecondary = computedBody.getPropertyValue('--text-secondary').trim() || '#6b7280';

  // Spessore/colore/tratteggio della linea di sezione sono configurabili
  // dall'utente (CSS custom properties su .map-frame): li leggiamo dal primo
  // elemento live così l'SVG esportato riflette le impostazioni correnti
  // invece di un valore hardcoded.
  const sampleLine = card.querySelector('.map-section-svg line, .map-mark-svg line, .map-mark-svg polyline');
  const lineSt = sampleLine ? window.getComputedStyle(sampleLine) : null;
  const lineStroke = lineSt?.stroke || textColor;
  const lineWidth = lineSt?.strokeWidth || '1px';
  const lineDash = lineSt?.strokeDasharray || '4 3';

  const styleBlock = `
    <style>
      text { font-family: ${fontStr}; }
      .map-section-svg line { stroke: ${lineStroke}; stroke-width: ${lineWidth}; stroke-dasharray: ${lineDash}; }
      .map-mark-svg polyline, .map-mark-svg line { fill: none; stroke: ${lineStroke}; stroke-width: ${lineWidth}; stroke-dasharray: ${lineDash}; }
      .map-wind-legend svg { stroke: ${textSecondary}; stroke-width: 1.4; stroke-linecap: round; stroke-linejoin: round; fill: none; }
      .map-wind-legend .wind-wedge { fill: ${textSecondary}; stroke: none; }
      .map-north text { font-size: 8.5px; font-weight: 700; }
    </style>
  `;

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${styleBlock}${svgContent}</svg>`;
}

// Estrae lo stile calcolato e lo inietta in un tag <style> all'interno dell'SVG
function getStyledSvgString(svgElement) {
  const clonedSvg = svgElement.cloneNode(true);
  
  // Cerchiamo tutte le variabili CSS usate in .ts-chart e .ts- correlati
  // Un approccio più robusto per l'export SVG è assegnare fill/stroke e altri stili esplicitamente o tramite un tag <style>.
  // Siccome il grafico TimeSeriesChart dipende dal CSS esterno, estraiamo gli stili base.
  
  const computedBody = window.getComputedStyle(document.body);
  const extractVar = (name) => computedBody.getPropertyValue(name).trim();

  // Inietta uno style block per far sì che il grafico funzioni anche standalone (SVG viewer, browser)
  const styleStr = `
    :root {
      --accent: ${extractVar('--accent')};
      --accent-b: ${extractVar('--accent-b') || '#d97706'};
      --diff: ${extractVar('--diff') || '#db2777'};
      --series-a: ${extractVar('--series-a') || extractVar('--accent')};
      --series-b: ${extractVar('--series-b') || '#d97706'};
    }
    .ts-grid { stroke: ${extractVar('--border') || '#e5e7eb'}; stroke-width: 1; }
    .ts-tick { fill: ${extractVar('--text-secondary') || '#6b7280'}; font-size: 10.5px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .ts-line { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
    .ts-dot { stroke: ${extractVar('--surface') || '#ffffff'}; stroke-width: 2; pointer-events: none; }
    .ts-crosshair { stroke: ${extractVar('--text-faint') || '#d1d5db'}; stroke-width: 1; stroke-dasharray: 4 3; pointer-events: none; }
    .ts-now line { stroke: ${extractVar('--text') || '#111827'}; stroke-width: 2; }
    .ts-now circle { fill: ${extractVar('--text') || '#111827'}; }
    .ts-now text { fill: ${extractVar('--text') || '#111827'}; font-size: 10.5px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 700; }
  `;
  
  const styleElement = document.createElementNS("http://www.w3.org/2000/svg", "style");
  styleElement.textContent = styleStr;
  clonedSvg.insertBefore(styleElement, clonedSvg.firstChild);

  // Serializza in stringa SVG
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(clonedSvg);
  
  // Aggiunge name spaces se mancanti
  if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
    source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
  }
  
  return '<?xml version="1.0" standalone="no"?>\r\n' + source;
}

export async function exportCharts({ state, setState, exportMode, zipAll, groupFolders, saveSvg, saveBoundarySvg, saveGif, fps, saveDatasheet, datasheetFormat, datasheetDecimals, tr, onProgress }) {
  try {
    if (!window.htmlToImage) {
      throw new Error("html-to-image library is not loaded.");
    }

    const { seriesLabels, time: originalTime, compareMode: originalCompareMode, filesetBOpen } = state;
    const numSteps = seriesLabels?.length || 0;
    const originalViewType = state.viewType;
    const originalAppView = state.appView;

    if (originalAppView !== 'analysis') {
      onProgress('Preparing map views...');
      setState({ appView: 'analysis' });
      await wait(1500); // Allow time for map slices and temporal chart to mount
    }

    if (originalCompareMode !== exportMode) {
      onProgress('Configuring export views...');
      setState({ compareMode: exportMode });
      await wait(500); // Allow time for cards to mount/unmount
    }

    const zip = new JSZip();
    let hasExportedFiles = false;

    // 1. Esporta il grafico temporale vettoriale (SVG)
    const svgElement = document.querySelector('.ts-chart svg');
    if (svgElement) {
      onProgress('Saving temporal chart...');
      const svgString = getStyledSvgString(svgElement);
      if (zipAll) {
        const svgPath = groupFolders ? `SVGs/TemporalChart_${state.dataset || 'var'}.svg` : `TemporalChart_${state.dataset || 'var'}.svg`;
        zip.file(svgPath, svgString);
        hasExportedFiles = true;
      } else {
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        downloadBlob(blob, `TemporalChart_${state.dataset || 'var'}.svg`);
        hasExportedFiles = true;
      }
    }

    // 1.5. Esporta i grafici delle boundary conditions in SVG
    if (saveBoundarySvg) {
      onProgress('Saving boundary condition charts...');
      const fallbackTr = tr || ((k) => k);
      if (state.filesetA) {
        const svgsA = await generateBoundarySVGs(state.filesetA, 'A', state.foxFileA, fallbackTr, state.boundaryPeriod, state.boundaryRange);
        for (const { filename, svgString } of svgsA) {
          const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
          if (zipAll) {
            zip.file(groupFolders ? `Boundary_Charts/${filename}` : filename, blob);
          } else {
            downloadBlob(blob, filename);
          }
          hasExportedFiles = true;
        }
      }
      if (state.filesetB) {
        const svgsB = await generateBoundarySVGs(state.filesetB, 'B', state.foxFileB, fallbackTr, state.boundaryPeriod, state.boundaryRange);
        for (const { filename, svgString } of svgsB) {
          const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
          if (zipAll) {
            zip.file(groupFolders ? `Boundary_Charts/${filename}` : filename, blob);
          } else {
            downloadBlob(blob, filename);
          }
          hasExportedFiles = true;
        }
      }
    }

    const getMapTypes = () => {
      if (exportMode === 'single') return ['A'];
      if (exportMode === 'b') return ['B'];
      if (exportMode === 'diff') return ['Diff'];
      if (exportMode === 'ab') return ['A', 'B'];
      if (exportMode === 'abdiff') return ['A', 'B', 'Diff'];
      return ['A', 'B', 'Diff'];
    };
    const mapTypes = getMapTypes();
    const allViewTypes = ['plan', 'sectionX', 'sectionY'];

    const captureCurrentMaps = async () => {
      // Find all chart cards and extract their map-bodies safely with their associated type
      const cards = Array.from(document.querySelectorAll('.chart-card'));
      const captures = [];
      const bgColor = window.getComputedStyle(document.body).getPropertyValue('--surface') || '#ffffff';
      
      for (const card of cards) {
        const flipKey = card.getAttribute('data-flip-key'); // 'A', 'B', or 'Diff'
        const el = card.querySelector('.map-body');
        if (flipKey && el) {
          const canvas = await window.htmlToImage.toCanvas(el, {
            backgroundColor: bgColor.trim() || null
          });
          
          let svgString = null;
          if (saveSvg) {
            svgString = await generateHybridSvg(card);
          }
          
          captures.push({ type: flipKey, canvas, svgString });
        }
      }
      return captures;
    };

    // INJECT FIXED SIZE CSS FOR EXPORT
    // This guarantees that all exports are completely independent of the screen size
    // and the compare mode, resulting in identical high-res images every time.
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .chart-grid { display: block !important; width: 1200px !important; }
      .chart-grid > .chart-card { width: 1200px !important; flex: none !important; margin-bottom: 20px !important; }
    `;
    document.head.appendChild(styleEl);
    await wait(200); // give browser time to reflow layout to 1200px

    // 2. ALWAYS Capture static maps for the current time
    onProgress('Capturing current maps...');
    for (const vType of allViewTypes) {
      setState({ viewType: vType });
      await wait(200);
      
      const captures = await captureCurrentMaps();
      const currentSlices = window.__currentSlices || {};
      
      for (const { type, canvas, svgString } of captures) {
        const filenameBase = getMapFilename(state, type, vType, originalTime, false);
        const filenamePng = filenameBase + '.png';
        const blobPng = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        
        let datasheetBlob = null;
        let datasheetExt = '';
        if (saveDatasheet && !saveGif) {
          const slice = currentSlices[type];
          if (slice && slice.data) {
            if (datasheetFormat === 'txt') {
              let csvStr = '';
              for (let y = 0; y < slice.h; y++) {
                const srcRow = slice.h - 1 - y;
                const row = [];
                for (let x = 0; x < slice.w; x++) {
                  const val = slice.data[srcRow * slice.w + x];
                  row.push(Number.isNaN(val) ? '' : Number(val).toFixed(datasheetDecimals));
                }
                csvStr += row.join('\t') + '\n';
              }
              datasheetBlob = new Blob([csvStr], { type: 'text/tab-separated-values' });
              datasheetExt = '.txt';
            } else if (datasheetFormat === 'xlsx') {
              const aoa = [];
              for (let y = 0; y < slice.h; y++) {
                const srcRow = slice.h - 1 - y;
                const row = [];
                for (let x = 0; x < slice.w; x++) {
                  const val = slice.data[srcRow * slice.w + x];
                  row.push(Number.isNaN(val) ? null : Number(Number(val).toFixed(datasheetDecimals)));
                }
                aoa.push(row);
              }
              const ws = XLSX.utils.aoa_to_sheet(aoa);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Data");
              const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
              datasheetBlob = new Blob([wbout], { type: 'application/octet-stream' });
              datasheetExt = '.xlsx';
            }
          }
        }
        
        if (blobPng) {
          if (zipAll) {
            const pngPath = groupFolders ? `PNGs/${filenamePng}` : filenamePng;
            zip.file(pngPath, blobPng);
            if (saveSvg && svgString) {
              const svgPath = groupFolders ? `SVGs/${filenameBase}.svg` : `${filenameBase}.svg`;
              zip.file(svgPath, new Blob([svgString], { type: 'image/svg+xml' }));
            }
            if (datasheetBlob) {
              const dsPath = groupFolders ? `Data/${filenameBase}${datasheetExt}` : `${filenameBase}${datasheetExt}`;
              zip.file(dsPath, datasheetBlob);
            }
            hasExportedFiles = true;
          } else {
            downloadBlob(blobPng, filenamePng);
            if (saveSvg && svgString) {
              downloadBlob(new Blob([svgString], { type: 'image/svg+xml' }), filenameBase + '.svg');
            }
            if (datasheetBlob) {
              downloadBlob(datasheetBlob, filenameBase + datasheetExt);
            }
            hasExportedFiles = true;
          }
        }
      }
    }

    // 3. Optional: Capture GIFs for temporal trend
    if (saveGif && numSteps > 0) {
      if (!window.GIF) {
        throw new Error("GIF library is not loaded.");
      }

      onProgress('Loading GIF worker...');
      const workerRes = await fetch('https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js');
      const workerBlobData = await workerRes.blob();
      const workerUrl = URL.createObjectURL(workerBlobData);

      onProgress('Preparing GIF encoders...');
      const gifEncoders = [];
      for (const vType of allViewTypes) {
        for (const type of mapTypes) {
          const gif = new window.GIF({
            workers: 2,
            quality: 10,
            workerScript: workerUrl,
            width: 100, 
            height: 100
          });
          gifEncoders.push({ type, vType, gif });
        }
      }

      const datasheetBuilders = [];
      if (saveDatasheet) {
        for (const vType of allViewTypes) {
          for (const type of mapTypes) {
            datasheetBuilders.push({
              type, vType,
              wb: datasheetFormat === 'xlsx' ? XLSX.utils.book_new() : null,
              txtFiles: datasheetFormat === 'txt' ? [] : null
            });
          }
        }
      }

      for (let t = 0; t < numSteps; t++) {
        onProgress(`Rendering frame ${t + 1} of ${numSteps}...`);
        setState({ time: t });
        await wait(200); 

        for (const vType of allViewTypes) {
          setState({ viewType: vType });
          await wait(150); 
          
          const captures = await captureCurrentMaps();
          const currentSlices = window.__currentSlices || {};
          
          for (let i = 0; i < captures.length; i++) {
            const { type, canvas } = captures[i];
            const encoderObj = gifEncoders.find(g => g.type === type && g.vType === vType);
            if (encoderObj) {
              if (t === 0) {
                encoderObj.gif.options.width = canvas.width;
                encoderObj.gif.options.height = canvas.height;
              }
              encoderObj.gif.addFrame(canvas, { delay: 1000 / fps });
            }
            
            if (saveDatasheet) {
              const slice = currentSlices[type];
              const builder = datasheetBuilders.find(b => b.type === type && b.vType === vType);
              if (builder && slice && slice.data) {
                const sheetName = (seriesLabels[t] || `t=${t}`).replace(/[: \/\\?*\[\]]/g, '-').substring(0, 31);
                
                if (datasheetFormat === 'txt') {
                  let csvStr = '';
                  for (let y = 0; y < slice.h; y++) {
                    const srcRow = slice.h - 1 - y;
                    const row = [];
                    for (let x = 0; x < slice.w; x++) {
                      const val = slice.data[srcRow * slice.w + x];
                      row.push(Number.isNaN(val) ? '' : Number(val).toFixed(datasheetDecimals));
                    }
                    csvStr += row.join('\t') + '\n';
                  }
                  builder.txtFiles.push({ name: sheetName, blob: new Blob([csvStr], { type: 'text/tab-separated-values' }) });
                } else if (datasheetFormat === 'xlsx') {
                  const aoa = [];
                  for (let y = 0; y < slice.h; y++) {
                    const srcRow = slice.h - 1 - y;
                    const row = [];
                    for (let x = 0; x < slice.w; x++) {
                      const val = slice.data[srcRow * slice.w + x];
                      row.push(Number.isNaN(val) ? null : Number(Number(val).toFixed(datasheetDecimals)));
                    }
                    aoa.push(row);
                  }
                  const ws = XLSX.utils.aoa_to_sheet(aoa);
                  XLSX.utils.book_append_sheet(builder.wb, ws, sheetName);
                }
              }
            }
          }
        }
      }

      if (saveDatasheet) {
        onProgress('Saving temporal data...');
        for (const builder of datasheetBuilders) {
          const filenameBase = getMapFilename(state, builder.type, builder.vType, 0, true);
          
          if (datasheetFormat === 'xlsx') {
            const wbout = XLSX.write(builder.wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: 'application/octet-stream' });
            if (zipAll) {
              const dsPath = groupFolders ? `Data/${filenameBase}.xlsx` : `${filenameBase}.xlsx`;
              zip.file(dsPath, blob);
              hasExportedFiles = true;
            } else {
              downloadBlob(blob, `${filenameBase}.xlsx`);
              hasExportedFiles = true;
            }
          } else if (datasheetFormat === 'txt') {
            for (const f of builder.txtFiles) {
              const fName = `${filenameBase}_${f.name}.txt`;
              if (zipAll) {
                const dsPath = groupFolders ? `Data/${fName}` : fName;
                zip.file(dsPath, f.blob);
                hasExportedFiles = true;
              } else {
                downloadBlob(f.blob, fName);
                hasExportedFiles = true;
              }
            }
          }
        }
      }

      onProgress('Encoding GIFs... This might take a while.');
      for (const encoderObj of gifEncoders) {
        const { type, vType, gif } = encoderObj;
        
        if (gif.frames.length === 0) continue;

        const filename = getMapFilename(state, type, vType, 0, true) + '.gif';
        
        const blob = await new Promise((resolve, reject) => {
          gif.on('finished', resolve);
          gif.on('abort', () => reject(new Error('GIF generation aborted')));
          try {
            gif.render();
          } catch (e) {
            reject(e);
          }
        });

        if (zipAll) {
          const gifPath = groupFolders ? `GIFs/${filename}` : filename;
          zip.file(gifPath, blob);
          hasExportedFiles = true;
        } else {
          downloadBlob(blob, filename);
          hasExportedFiles = true;
        }
      }
      URL.revokeObjectURL(workerUrl);
    }

    // 4. Cleanup and restore
    document.head.removeChild(styleEl);
    setState({ time: originalTime, viewType: originalViewType, appView: originalAppView, compareMode: originalCompareMode });
    await wait(100);

    if (!hasExportedFiles) {
      throw new Error('No maps found on screen to export.');
    }

    if (zipAll) {
      if (!hasExportedFiles || Object.keys(zip.files).length === 0) {
        throw new Error("No files were generated for the ZIP archive.");
      }
      onProgress('Zipping files...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, 'EnviReader_Export.zip');
    }

    onProgress('Export completed!');
    await wait(500);
  } catch (err) {
    console.error('exportUtils error:', err);
    // Assicuriamoci di ripulire lo stile in caso di errore (se esiste)
    const injected = document.head.querySelector('style:last-of-type');
    if (injected && injected.textContent.includes('1200px')) {
      document.head.removeChild(injected);
    }
    if (originalTime !== undefined) {
      setState({ time: originalTime, viewType: originalViewType, appView: originalAppView, compareMode: originalCompareMode });
    }
    throw err; 
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
