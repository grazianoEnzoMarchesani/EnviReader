import { DOM } from './enviropment.js';
import { state } from './enviropment.js';
import { chartInstances } from './enviropment.js';
import { buildDirectoryStructure } from './fileMan.js';



export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}


// Controlla se il browser supporta l'API File System Access
if (!('showDirectoryPicker' in window)) {
    //console.warn('Questo browser non supporta l\'API File System Access. Alcune funzionalitÃ  potrebbero non funzionare correttamente.');
    // Qui potresti implementare un fallback o mostrare un messaggio all'utente
}

// Funzione di utilitÃ  per selezionare elementi DOM in modo sicuro
export function safeQuerySelector(selector) {
    const element = document.querySelector(selector);
    if (!element) {
        //console.warn(`Elemento non trovato: ${selector}`);
    }
    return element;
}


export function logError(errorMessage, errorDetails = {}) {
    //console.error(`Error: ${errorMessage}`, errorDetails);
    // In futuro, qui si potrebbe implementare la logica per inviare l'errore a un servizio di logging
}



export function calculateMetersValue(value, spacingArray) {
    let sum = 0;
    for (let i = 0; i <= value && i < spacingArray.length; i++) {
        sum += spacingArray[i];
    }
    return sum;
}
export function handleToggleButton(toggleButton, onToggle) {
    const isPressed = toggleButton.getAttribute('aria-checked') === 'true';
    const newState = !isPressed;
    toggleButton.setAttribute('aria-checked', newState.toString());

    // Forza un reflow per assicurarsi che l'animazione venga attivata
    toggleButton.offsetHeight;

    if (onToggle) {
        onToggle(newState);
    }
}




export function changeSliderValue(slider, increment = true) {
    const currentValue = parseInt(slider.value);
    const limitValue = increment ? parseInt(slider.max) : parseInt(slider.min);

    if ((increment && currentValue < limitValue) || (!increment && currentValue > limitValue)) {
        slider.value = currentValue + (increment ? 1 : -1);
        slider.dispatchEvent(new Event('change'));
    }
}

// Verifica se il toggle "Follow Terrain" Ã¨ abilitato
export function isFollowTerrainEnabled() {
    return DOM.followTerrainToggle && DOM.followTerrainToggle.getAttribute('aria-pressed') === 'true';
}

/************         Funzioni di gestione del file system         ************/

// Gestione della selezione della directory
export async function handleDirectorySelection() {
    try {
        const dirHandle = await window.showDirectoryPicker();
        const directoryStructure = await buildDirectoryStructure(dirHandle);
        return { structure: directoryStructure, rootDir: dirHandle.name };
    } catch (err) {
        if (err.name !== 'AbortError') {
            //console.error('Errore nella selezione della directory:', err);
        }
        return null;
    }
}
export function resizeAllCharts() {
    Object.values(chartInstances).forEach(chart => {
        if (chart && typeof chart.resize === 'function') {
            const container = chart.getDom();
            const newScaledWidth = container.clientWidth * state.scaleFactor;
            const newScaledHeight = container.clientHeight * state.scaleFactor;
            chart.resize({ width: newScaledWidth, height: newScaledHeight });

            const option = chart.getOption();
            const visualMap = option.visualMap[0];

            // Aggiorna la scala della legenda
            chart.setOption({
                visualMap: [{
                    ...visualMap,
                    textStyle: {
                        fontSize: 11 * state.scaleFactor
                    },
                    itemWidth: 20 * state.scaleFactor,
                    itemHeight: 140 * state.scaleFactor,
                    formatter: function (value) {
                        return value.toFixed(2);
                    }
                }]
            });
        }
    });


}
// Costanti per i selettori
const SELECTORS = {

    dataGroupSelector: '#dataGroupSelector',
    dataSelector: '#dataSelector',
    openFilesetA: '#openFilesetA',
    openFilesetB: '#openFilesetB',
    timeSlider: '#timeSlider',
    sliderTitle: '.slider-title',
    incrementTimeBtn: '.slider-btn[aria-label="Increment time"]',
    decrementTimeBtn: '.slider-btn[aria-label="Decrement time"]',
    levelSlider: '#levelSlider',
    sectionXSlider: '#sectionXSlider',
    sectionYSlider: '#sectionYSlider',
    followTerrain: '#followTerrainToggle',
    windOpacitySlider: '#windOpacitySlider',
    windAnimationSlider: '#windAnimationSlider',
    windDensitySlider: '#windDensitySlider',
    savePresetButton: '#savePreset',
    visualizationContainerA: '#visualizationContainerA',
    visualizationContainerB: '#visualizationContainerB'
};
 // Inizializza i riferimenti al DOM e i selettori
 export function initializeDOMReferences() {
    // Selettori principali
    DOM.followTerrainToggle = document.getElementById('followTerrainToggle');
    DOM.followTerrainToggle = safeQuerySelector('#followTerrainToggle');

    DOM.levelIncrementBtn = safeQuerySelector('.slider-btn[aria-label="Increment plan level"]');
    DOM.levelDecrementBtn = safeQuerySelector('.slider-btn[aria-label="Decrement plan level"]');
    DOM.levelDecrementBtn = safeQuerySelector('.slider-btn[aria-label="Decrement plan level"]');
    DOM.sectionXIncrementBtn = safeQuerySelector('.slider-btn[aria-label="Increment section X"]');
    DOM.sectionYIncrementBtn = safeQuerySelector('.slider-btn[aria-label="Increment section Y"]');
    DOM.sectionYDecrementBtn = safeQuerySelector('.slider-btn[aria-label="Decrement section Y"]');

    DOM.selectDataGroup = safeQuerySelector(SELECTORS.dataGroupSelector);
    DOM.selectData = safeQuerySelector(SELECTORS.dataSelector);
    DOM.buttonFilesetA = safeQuerySelector(SELECTORS.openFilesetA);
    DOM.buttonFilesetB = safeQuerySelector(SELECTORS.openFilesetB);
    DOM.pathDisplayA = document.createElement('div');
    DOM.pathDisplayB = document.createElement('div');

    // Slider e relativi elementi
    DOM.timeSlider = safeQuerySelector(SELECTORS.timeSlider);
    DOM.timeLabel = safeQuerySelector(SELECTORS.sliderTitle);
    DOM.timeIncrementBtn = safeQuerySelector('.slider-btn[aria-label="Increment time"]');
    DOM.timeDecrementBtn = safeQuerySelector('.slider-btn[aria-label="Decrement time"]');
    DOM.levelSlider = safeQuerySelector(SELECTORS.levelSlider);
    DOM.levelLabel = safeQuerySelector('#levelLabel');
    DOM.sectionXSlider = safeQuerySelector(SELECTORS.sectionXSlider);
    DOM.sectionXLabel = safeQuerySelector('#sectionXLabel');
    DOM.sectionYSlider = safeQuerySelector(SELECTORS.sectionYSlider);
    DOM.sectionYLabel = safeQuerySelector('#sectionYLabel');

    // Contenitori di visualizzazione
    DOM.visualizationContainerA = safeQuerySelector(SELECTORS.visualizationContainerA);
    DOM.visualizationContainerB = safeQuerySelector(SELECTORS.visualizationContainerB);

    // Controlli aggiuntivi
    DOM.followTerrainCheckbox = safeQuerySelector(SELECTORS.followTerrain);
    DOM.windOpacitySlider = safeQuerySelector(SELECTORS.windOpacitySlider);
    DOM.windOpacityLabel = safeQuerySelector('#windOpacityLabel');
    DOM.windAnimationSlider = safeQuerySelector(SELECTORS.windAnimationSlider);
    DOM.windAnimationLabel = safeQuerySelector('#windAnimationLabel');
    DOM.windDensitySlider = safeQuerySelector(SELECTORS.windDensitySlider);
    DOM.windDensityLabel = safeQuerySelector('#windDensityLabel');
    DOM.savePresetButton = safeQuerySelector(SELECTORS.savePresetButton);

    // Log degli elementi trovati e non trovati
    const foundElements = Object.keys(DOM).filter(key => DOM[key] !== null);
    const notFoundElements = Object.keys(DOM).filter(key => DOM[key] === null);

    //console.log("Elementi DOM trovati:", foundElements);
    if (notFoundElements.length > 0) {
        //console.warn("Elementi DOM non trovati:", notFoundElements);
    }
    DOM.differenceOrderToggle = safeQuerySelector('#differenceOrderToggle');
    DOM.differenceOrderValue = safeQuerySelector('#differenceOrderValue');
    if (!DOM.followTerrainToggle) {
        //console.warn("Elemento 'followTerrainToggle' non trovato nel DOM. Alcune funzionalitÃ  potrebbero non funzionare correttamente.");
    }
}


export function initResizeListener() {
    window.addEventListener('resize', debounce(() => {

        resizeAllCharts();
    }, 250));
}


export function resizeChartContainers() {
    const filesetCount = state.filesetB ? 3 : 1; // Includiamo anche il container della differenza
    let maxWidth = 0;
    let maxHeight = 0;

    // Calcola le dimensioni massime per tutti i tipi di grafici
    ['level', 'section-x', 'section-y'].forEach(viewType => {
        const optimalSize = calculateOptimalChartSize([], state.dimensions, viewType, filesetCount);
        maxWidth = Math.max(maxWidth, optimalSize.width);
        maxHeight = Math.max(maxHeight, optimalSize.height);
    });

    // Applica le dimensioni massime a tutti i grafici
    Object.keys(chartInstances).forEach(chartKey => {
        const chart = chartInstances[chartKey];
        if (chart) {
            const container = chart.getDom();
            const scaledWidth = maxWidth * 2; // Raddoppia la larghezza
            const scaledHeight = maxHeight * 2; // Raddoppia l'altezza

            container.style.width = `${scaledWidth}px`;
            container.style.height = `${scaledHeight}px`;
            chart.resize({ width: scaledWidth, height: scaledHeight });
        }
    });

    // Aggiorna il grafico delle serie temporali
    if (chartInstancesLines['timeSeries']) {
        const timeSeriesChart = chartInstancesLines['timeSeries'];
        const container = timeSeriesChart.getDom();
        const parentWidth = container.parentElement.clientWidth;
        const scaledWidth = parentWidth - 40; // 40px per il padding
        const scaledHeight = maxHeight * 2; // Raddoppia l'altezza

        container.style.width = `${scaledWidth}px`;
        container.style.height = `${scaledHeight}px`;
        timeSeriesChart.resize({ width: scaledWidth, height: scaledHeight });
    }

    // Chiama resizeAllCharts per assicurarti che tutti i grafici siano ridimensionati
    resizeAllCharts();
}

function calculateOptimalChartSize(dimensions, viewType, scale = state.scaleFactor) {
    const padding = 40;
    const legendWidth = 80;
    
    // Calcola le dimensioni base in base al tipo di vista
    let baseWidth, baseHeight;
    
    switch (viewType) {
        case 'level':
            baseWidth = dimensions.x * state.spacing.x.reduce((a, b) => a + b, 0);
            baseHeight = dimensions.y * state.spacing.y.reduce((a, b) => a + b, 0);
            break;
        case 'section-x':
            baseWidth = dimensions.y * state.spacing.y.reduce((a, b) => a + b, 0);
            baseHeight = dimensions.z * state.spacing.z.reduce((a, b) => a + b, 0);
            break;
        case 'section-y':
            baseWidth = dimensions.x * state.spacing.x.reduce((a, b) => a + b, 0);
            baseHeight = dimensions.z * state.spacing.z.reduce((a, b) => a + b, 0);
            break;
        default:
            baseWidth = 300;
            baseHeight = 300;
    }

    // Calcola l'aspect ratio desiderato
    const targetAspectRatio = baseWidth / baseHeight;
    
    // Ottieni le dimensioni del contenitore padre
    const containerWidth = document.querySelector('.main-content').clientWidth - padding * 2;
    const containerHeight = window.innerHeight * 0.7; // 70% dell'altezza della viewport
    
    // Calcola le dimensioni ottimali mantenendo l'aspect ratio
    let finalWidth, finalHeight;
    
    if (containerWidth / containerHeight > targetAspectRatio) {
        // Il container è più largo del necessario
        finalHeight = containerHeight;
        finalWidth = containerHeight * targetAspectRatio;
    } else {
        // Il container è più alto del necessario
        finalWidth = containerWidth;
        finalHeight = containerWidth / targetAspectRatio;
    }
    
    // Aggiungi spazio per la legenda
    finalWidth += legendWidth;
    
    // Applica il fattore di scala
    finalWidth *= scale;
    finalHeight *= scale;
    
    return {
        width: Math.round(finalWidth),
        height: Math.round(finalHeight)
    };
}

function updateChartContainer(chartDiv, dimensions, viewType) {
    const optimalSize = calculateOptimalChartSize(dimensions, viewType);
    
    // Imposta le dimensioni del container
    chartDiv.style.width = `${optimalSize.width}px`;
    chartDiv.style.height = `${optimalSize.height}px`;
    
    // Memorizza le dimensioni originali per riferimenti futuri
    chartDiv.setAttribute('data-original-width', optimalSize.width);
    chartDiv.setAttribute('data-original-height', optimalSize.height);
    
    return optimalSize;
}

