import { DOM } from './enviropment.js';
import { updateTimeSlider } from './fileMan.js';
import { updateSliderRanges } from './fileMan.js';
import { populateDataGroupDropdown } from './fileMan.js';
import { updateAllLabels } from './fileMan.js';
import { createPathDisplay } from './fileMan.js';
import { initResizeListener } from './utils.js';
import { initializeColorPaletteSelector } from './fileMan.js';
import { initializeDataMenu } from './fileMan.js';
import { checkFilesetAStatus } from './fileMan.js';
import { state } from './enviropment.js';



//....utils.js
import { debounce } from './utils.js';

import { initializeDOMReferences } from './utils.js';
import { resizeAllCharts } from './utils.js';

//....events.js
import { handleResize } from './events.js';
import { addEventListeners } from './events.js';

//....viz.js
import { updateVisualization } from './viz.js';
import { cleanupCharts } from './viz.js';



import { saveAllCharts } from './imageExport.js';



debounce(updateVisualization, 250);



function addScaleTypeListener() {
    const scaleTypeSelector = document.getElementById('scaleType');
    if (scaleTypeSelector) {
        scaleTypeSelector.addEventListener('change', () => {
            const scaleType = scaleTypeSelector.value;
            updateVisualization('filesetA');
            if (state.filesetB) {
                updateVisualization('filesetB');
            }
            if (scaleType === 'allFilesets' || scaleType === 'syncedViews') {
                updateVisualization('filesetA');
                updateVisualization('filesetB');
            }
        });
    }
}

function addSaveAllChartsListener() {
    const saveAllChartsButton = document.getElementById('saveAllChartsButton');
    if (saveAllChartsButton) {
        saveAllChartsButton.addEventListener('click', saveAllCharts);
    } else {
        //console.error("Elemento 'saveAllChartsButton' non trovato!");
    }
}


// Funzione di inizializzazione
async function init() {
    addScaleTypeListener();
    initResizeListener();
    addSaveAllChartsListener();

    const cleanup = () => {
        window.removeEventListener('resize', handleResize);
        cleanupCharts();
    };
    window.addEventListener('beforeunload', cleanup);

    initializeDOMReferences();
    createPathDisplay();
    initializeColorPaletteSelector();

    if (DOM.selectDataGroup) {
        await populateDataGroupDropdown();
        DOM.selectDataGroup.value = DOM.selectDataGroup.options[0].value;
    } else {
        console.error("Elemento select per il gruppo di dati non trovato durante l'inizializzazione!");
    }

    addEventListeners();
    handleResize();
    window.addEventListener('resize', handleResize);

    const container = document.querySelector('.container');
    if (!container.classList.contains('sidebar-hidden')) {
        container.classList.add('sidebar-visible');
    }

    // Lazy load delle funzionalità non essenziali
    setTimeout(() => {
        updateSliderRanges();
        updateAllLabels();
        if (DOM.timeSlider && DOM.selectDataGroup) {
            updateTimeSlider();
        }
        initializeDataMenu();
        resizeAllCharts();
        checkFilesetAStatus(); // Aggiungi questa chiamata
    }, 0);
}


// Event listener per il caricamento del DOM
document.addEventListener('DOMContentLoaded', init);

