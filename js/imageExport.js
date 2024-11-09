import { chartInstances, chartInstancesLines, DOM } from './enviropment.js';


export function captureSingleChartSVG(chartKey) {
    return new Promise((resolve, reject) => {
        const chart = chartKey === 'timeSeries' ? 
            chartInstancesLines[chartKey] : 
            chartInstances[chartKey];

        if (!chart) {
            reject(new Error(`Chart non trovato per la chiave ${chartKey}`));
            return;
        }

        try {
            const svgContent = chart.renderToSVGString({
                pixelRatio: 4,
                excludeComponents: ['toolbox']
            });

            resolve(svgContent);
        } catch (error) {
            reject(new Error(`Errore durante la generazione SVG: ${error.message}`));
        }
    });
}

function svgToPng(svgString) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            // Ottieni le dimensioni originali dell'SVG dal viewBox
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
            const svgElement = svgDoc.documentElement;
            
            // Ottieni il viewBox o le dimensioni dell'SVG
            let width, height;
            if (svgElement.hasAttribute('viewBox')) {
                const viewBox = svgElement.getAttribute('viewBox').split(' ');
                width = parseFloat(viewBox[2]);
                height = parseFloat(viewBox[3]);
            } else {
                width = parseFloat(svgElement.getAttribute('width') || img.width);
                height = parseFloat(svgElement.getAttribute('height') || img.height);
            }
            
            // Calcola le dimensioni mantenendo le proporzioni
            const scale = Math.min(1920 / width, 1080 / height);
            canvas.width = width * scale;
            canvas.height = height * scale;
            
            // Pulisci il canvas e disegna l'immagine
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            resolve(canvas.toDataURL('image/png'));
        };
        
        img.onerror = reject;
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
    });
}

export function saveChartAsImage(svgContent, fileName) {
    // Salva SVG
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    const svgLink = document.createElement('a');
    svgLink.href = svgUrl;
    svgLink.download = fileName + '.svg';
    document.body.appendChild(svgLink);
    svgLink.click();
    document.body.removeChild(svgLink);
    URL.revokeObjectURL(svgUrl);

    // Salva PNG
    return svgToPng(svgContent).then(pngDataUrl => {
        const pngLink = document.createElement('a');
        pngLink.href = pngDataUrl;
        pngLink.download = fileName + '.png';
        document.body.appendChild(pngLink);
        pngLink.click();
        document.body.removeChild(pngLink);
    });
}

export function saveAllChartsAsSVG() {
    const selectedVariable = DOM.selectData.value;
    const level = DOM.levelSlider.value;
    const sectionX = DOM.sectionXSlider.value;
    const sectionY = DOM.sectionYSlider.value;
    
    // Ottieni la data e l'ora dal timeLabel
    const timeLabel = DOM.timeLabel.textContent;
    const timeMatch = timeLabel.match(/(\d{4}-\d{2}-\d{2})(?:\s*-\s*(\d{2}:\d{2}:\d{2}))?/);
    const date = timeMatch ? timeMatch[1] : '';
    const time = timeMatch && timeMatch[2] ? timeMatch[2].replace(/:/g, '.') : '';

    // Sanitizza il nome della variabile per il filename
    const sanitizedVariable = selectedVariable.replace(/\s+/g, '');

    const chartKeys = [
        ...Object.keys(chartInstances),
        'timeSeries'
    ];

    const savePromises = chartKeys.map(chartKey => 
        captureSingleChartSVG(chartKey).then(svgContent => {
            if (!svgContent) {
                console.warn(`Nessun contenuto SVG generato per ${chartKey}`);
                return;
            }

            let baseFileName;
            if (chartKey === 'timeSeries') {
                baseFileName = `timeSeries-${sanitizedVariable}-${date}${time ? '-' + time : ''}`;
            } else {
                const sliderValue = chartKey.includes('level') ? level :
                                  chartKey.includes('section-x') ? sectionX :
                                  chartKey.includes('section-y') ? sectionY : '';
                                  
                baseFileName = `${chartKey}-${sliderValue}-${sanitizedVariable}-${date}${time ? '-' + time : ''}`;
            }

            return saveChartAsImage(svgContent, baseFileName);
        }).catch(error => {
            console.error(`Errore nel salvataggio del grafico ${chartKey}:`, error);
        })
    );

    Promise.all(savePromises).then(() => {
        console.log('Tutti i grafici sono stati salvati come SVG.');
    }).catch(error => {
        console.error('Errore nel salvataggio dei grafici:', error);
    });
}