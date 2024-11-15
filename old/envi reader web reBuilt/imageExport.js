import { state } from './enviropment.js';
import { chartInstances } from './enviropment.js';
import { chartInstancesLines } from './enviropment.js';
import { calculateMetersValue } from './utils.js';
import { DOM } from './enviropment.js';
export function captureChartImage(chartKey) {
    return new Promise((resolve, reject) => {
        const chart = chartInstances[chartKey];
        if (!chart) {
            reject(new Error(`Chart non trovato per la chiave ${chartKey}`));
            return;
        }

        const container = chart.getDom().closest('.chart-container');
        if (!container) {
            reject(new Error('Container del chart non trovato'));
            return;
        }

        const svgContent = chart.renderToSVGString({
            pixelRatio: 2,
            excludeComponents: ['toolbox']
        });

        const chartInfo = extractChartInfo(container, chartKey);
        const svgWithInfo = addInfoToSVG(svgContent, chartInfo);
        const trimmedSVG = trimSVGToContent(svgWithInfo);

        resolve(trimmedSVG);
    });
}

function extractChartInfo(container, chartKey) {
    const titleElement = container.querySelector('h3');
    const subtitleElement = container.querySelector('.chart-subtitle');
    const infoDiv = container.querySelector('.info-div');

    const title = titleElement ? titleElement.textContent : '';
    const subtitle = subtitleElement ? subtitleElement.textContent : '';
    const info = infoDiv ? infoDiv.textContent : '';

    const [filesetKey, viewType] = chartKey.split('-');
    const { dimensions, spacing } = state;
    let additionalInfo = '';

    if (viewType === 'level') {
        const level = parseInt(document.getElementById('levelSlider').value);
        additionalInfo = `Level: ${level} (${calculateMetersValue(level, spacing.z).toFixed(2)}m)`;
    } else if (viewType === 'section-x') {
        const sectionX = parseInt(document.getElementById('sectionXSlider').value);
        additionalInfo = `X: ${sectionX} (${calculateMetersValue(sectionX, spacing.x).toFixed(2)}m)`;
    } else if (viewType === 'section-y') {
        const sectionY = parseInt(document.getElementById('sectionYSlider').value);
        additionalInfo = `Y: ${sectionY} (${calculateMetersValue(sectionY, spacing.y).toFixed(2)}m)`;
    }

    return { title, subtitle, info, additionalInfo };
}

function addInfoToSVG(svgContent, chartInfo) {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svg = svgDoc.documentElement;

    const originalWidth = parseInt(svg.getAttribute('width') || svg.width.baseVal.value);
    const originalHeight = parseInt(svg.getAttribute('height') || svg.height.baseVal.value);

    const maxWidth = 800;
    const scaleFactor = Math.min(1, maxWidth / originalWidth);
    const newWidth = Math.round(originalWidth * scaleFactor);
    const newHeight = Math.round(originalHeight * scaleFactor);

    const infoHeight = 150;
    const totalHeight = newHeight + infoHeight;

    const contentGroup = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');

    while (svg.firstChild) {
        contentGroup.appendChild(svg.firstChild);
    }

    svg.appendChild(contentGroup);

    svg.setAttribute('width', newWidth);
    svg.setAttribute('height', totalHeight);
    svg.setAttribute('viewBox', `0 0 ${originalWidth} ${originalHeight + infoHeight / scaleFactor}`);

    contentGroup.setAttribute('transform', `translate(0, ${infoHeight / scaleFactor}) scale(${scaleFactor})`);

    addInfoText(svg, chartInfo, scaleFactor);

    setAllTextColorToBlack(svg);

    const serializer = new XMLSerializer();
    return serializer.serializeToString(svgDoc);
}

function addInfoText(svg, chartInfo, scaleFactor) {
    const textGroup = svg.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'g');
    textGroup.setAttribute('font-family', 'Helvetica, Arial, sans-serif');
    textGroup.setAttribute('font-size', `${14 * scaleFactor}px`);
    textGroup.setAttribute('fill', 'black');

    const texts = [
        { text: chartInfo.title, x: 10, y: 30, weight: 'bold', size: 14 },
        { text: chartInfo.subtitle, x: 10, y: 55, size: 12 },
        { text: chartInfo.info, x: 10, y: 80, size: 12, style: 'italic' }
    ];

    texts.forEach(({ text, x, y, weight, size, style }) => {
        if (text) {  // Aggiungi questo controllo
            const textElement = svg.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'text');
            textElement.setAttribute('x', x);
            textElement.setAttribute('y', y);
            textElement.setAttribute('font-size', `${size * scaleFactor}px`);
            if (weight) textElement.setAttribute('font-weight', weight);
            if (style) textElement.setAttribute('font-style', style);
            textElement.textContent = text;
            textGroup.appendChild(textElement);
        }
    });

    svg.insertBefore(textGroup, svg.firstChild);
}

function setAllTextColorToBlack(element) {
    if (element.tagName === 'text' || element.tagName === 'tspan') {
        element.setAttribute('fill', 'black');
    }

    if (element.children) {
        Array.from(element.children).forEach(setAllTextColorToBlack);
    }
}

function trimSVGToContent(svgContent) {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svg = svgDoc.documentElement;

    // Seleziona solo gli elementi grafici che possono avere un bounding box
    const elements = Array.from(svg.querySelectorAll('*')).filter(element => {
        try {
            return typeof element.getBBox === 'function';
        } catch (error) {
            return false;
        }
    });

    // Calcola il bounding box complessivo degli oggetti contenuti
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach(element => {
        try {
            const bbox = element.getBBox();
            if (bbox.width && bbox.height) { // Considera solo elementi con dimensioni valide
                minX = Math.min(minX, bbox.x);
                minY = Math.min(minY, bbox.y);
                maxX = Math.max(maxX, bbox.x + bbox.width);
                maxY = Math.max(maxY, bbox.y + bbox.height);
            }
        } catch (error) {
            // Ignora elementi che generano errori con getBBox()
            //console.warn(`Impossibile ottenere il bounding box per l'elemento:`, element, error);
        }
    });

    // Se non sono stati trovati elementi validi, mantieni l'SVG invariato
    if (minX === Infinity || minY === Infinity || maxX === -Infinity || maxY === -Infinity) {
        return svgContent;
    }

    // Calcola le nuove dimensioni
    const newWidth = maxX - minX;
    const newHeight = maxY - minY;

    // Aggiorna il viewBox dell'SVG per ritagliare i margini
    svg.setAttribute('viewBox', `${minX} ${minY} ${newWidth} ${newHeight}`);
    svg.setAttribute('width', newWidth);
    svg.setAttribute('height', newHeight);

    // Serializza l'SVG modificato in una stringa
    const serializer = new XMLSerializer();
    return serializer.serializeToString(svgDoc);
}

export function saveSingleChart(chartKey) {
    return new Promise((resolve, reject) => {
        const chart = chartInstances[chartKey];
        if (!chart) {
            console.error(`Chart non trovato per la chiave ${chartKey}`);
            reject(new Error(`Chart non trovato per la chiave ${chartKey}`));
            return;
        }

        try {
            captureChartImage(chartKey).then(trimmedSVG => {
                const blob = new Blob([trimmedSVG], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(blob);

                const fileName = generateDescriptiveFileName(chartKey);

                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                URL.revokeObjectURL(url);

                console.log(`Chart ${chartKey} saved successfully as ${fileName}`);
                resolve();
            }).catch(error => {
                console.error(`Errore nel salvataggio del grafico ${chartKey}:`, error);
                reject(error);
            });
        } catch (error) {
            console.error(`Errore durante la preparazione del salvataggio per il grafico ${chartKey}:`, error);
            reject(error);
        }
    });
}
function generateDescriptiveFileName(chartKey) {
    const selectedVariable = document.getElementById('dataSelector').value;
    const date = new Date().toISOString().split('T')[0];

    if (chartKey === 'timeSeries') {
        return `ENVI-met_TimeSeries_${selectedVariable}_${date}.svg`;
    }

    const [filesetKey, viewType] = chartKey.split('-');
    const currentTimeIndex = document.getElementById('timeSlider').value;

    let viewInfo = '';
    if (viewType === 'level') {
        const level = document.getElementById('levelSlider').value;
        viewInfo = `_Level${level}`;
    } else if (viewType === 'section-x') {
        const sectionX = document.getElementById('sectionXSlider').value;
        viewInfo = `_SectionX${sectionX}`;
    } else if (viewType === 'section-y') {
        const sectionY = document.getElementById('sectionYSlider').value;
        viewInfo = `_SectionY${sectionY}`;
    }

    let filesetInfo = filesetKey === 'filesetDiff' ? 'Difference' : filesetKey;

    return `ENVI-met_${filesetInfo}_${selectedVariable}_${viewType}${viewInfo}_Time${currentTimeIndex}_${date}.svg`;
}

export function saveAllCharts() {
    const chartKeys = Object.keys(chartInstances);
    let totalCharts = chartKeys.length;
    let savedCharts = 0;

    // Verifica se esiste il grafico delle serie temporali
    if (chartInstancesLines['timeSeries']) {
        totalCharts++;
    }

    const savePromises = chartKeys.map((chartKey, index) => 
        new Promise((resolve) => {
            setTimeout(() => {
                saveSingleChart(chartKey)
                    .then(() => {
                        savedCharts++;
                        resolve();
                    })
                    .catch(error => {
                        console.error(`Errore nel salvataggio del grafico ${chartKey}:`, error);
                        resolve(); // Risolviamo comunque per continuare con gli altri grafici
                    });
            }, index * 500);
        })
    );

    // Aggiungi la promessa per il grafico delle serie temporali se esiste
    if (chartInstancesLines['timeSeries']) {
        savePromises.push(
            new Promise((resolve) => {
                setTimeout(() => {
                    saveTimeSeriesChart()
                        .then(() => {
                            savedCharts++;
                            resolve();
                        })
                        .catch(error => {
                            console.error('Errore nel salvataggio del grafico delle serie temporali:', error);
                            resolve(); // Risolviamo comunque
                        });
                }, chartKeys.length * 500);
            })
        );
    }

    // Attendiamo che tutte le promesse siano risolte
    Promise.all(savePromises).then(() => {
        if (savedCharts === totalCharts) {
           // alert('Tutti i grafici sono stati salvati con successo!');
        } else {
            alert(`Salvati ${savedCharts} grafici su ${totalCharts}. Alcuni grafici potrebbero non essere stati salvati correttamente.`);
        }
    });
}

function saveTimeSeriesChart() {
    return new Promise((resolve, reject) => {
        showLoading('timeSeriesChart');

        captureTimeSeriesImage().then(trimmedSVG => {
            const blob = new Blob([trimmedSVG], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);

            const fileName = generateDescriptiveFileName('timeSeries');

            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);

            console.log(`Time Series chart saved successfully as ${fileName}`);
            hideLoading('timeSeriesChart');
            resolve();
        }).catch(error => {
            console.error('Errore nel salvataggio del grafico delle serie temporali:', error);
            alert('Si è verificato un errore durante il salvataggio del grafico delle serie temporali. Per favore, riprova.');
            hideLoading('timeSeriesChart');
            reject(error);
        });
    });
}

export function captureTimeSeriesImage() {
    return new Promise((resolve, reject) => {
        const chart = chartInstancesLines['timeSeries'];
        if (!chart) {
            console.error('Grafico delle serie temporali non trovato');
            reject(new Error('Grafico delle serie temporali non trovato'));
            return;
        }

        const container = chart.getDom().closest('.time-series-container');
        if (!container) {
            console.error('Container del grafico delle serie temporali non trovato');
            reject(new Error('Container del grafico delle serie temporali non trovato'));
            return;
        }

        try {
            const svgContent = chart.renderToSVGString({
                pixelRatio: 2,
                excludeComponents: ['toolbox']
            });

            const chartInfo = {
                title: 'Time Series Comparison',
                subtitle: '', // Rimuoviamo il riferimento all'elemento h3
                info: `Variable: ${DOM.selectData ? DOM.selectData.value : 'N/A'}`
            };

            const svgWithInfo = addInfoToSVG(svgContent, chartInfo);
            const trimmedSVG = trimSVGToContent(svgWithInfo);

            resolve(trimmedSVG);
        } catch (error) {
            console.error('Errore durante la generazione dell\'immagine SVG:', error);
            reject(error);
        }
    });
}

function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-indicator';
        loadingDiv.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            z-index: 1000;
        `;
        loadingDiv.innerHTML = `
            <div class="spinner"></div>
            <p style="color: white; margin-top: 10px;">Saving...</p>
        `;
        element.style.position = 'relative';
        element.appendChild(loadingDiv);
    }
}

function hideLoading(elementId) {
    const element = document.getElementById(elementId);
    const loadingDiv = document.getElementById('loading-indicator');
    if (element && loadingDiv) {
        element.removeChild(loadingDiv);
    }
}