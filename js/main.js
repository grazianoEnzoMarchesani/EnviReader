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
import { initializeScaleFactorSlider } from './enviropment.js';
import { selectedPalette, selectedDifferencePalette, reversePalette } from './fileMan.js';
import { saveAllChartsAsSVG } from './imageExport.js';
import { initThemeManager } from './theme.js';



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
        saveAllChartsButton.addEventListener('click', saveAllChartsAsSVG);
    } else {
        console.error("Elemento 'saveAllChartsButton' non trovato!");
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

    await initializeDataMenu(); // Assicurati che questa chiamata avvenga prima di utilizzare le palette

    // Aggiungi i listener per i pulsanti di ribaltamento
    document.getElementById('reversePaletteButton').addEventListener('click', () => {
        selectedPalette = reversePalette(selectedPalette);
        updateVisualization('filesetA');
        updateVisualization('filesetB');
        console.log('Palette ribaltata:', selectedPalette);
    });

    document.getElementById('reverseDifferencePaletteButton').addEventListener('click', () => {
        selectedDifferencePalette = reversePalette(selectedDifferencePalette);
        updateVisualization('filesetA');
        updateVisualization('filesetB');
        console.log('Palette differenze ribaltata:', selectedDifferencePalette);
    });

    console.log('Inizializzazione dei pulsanti di ribaltamento');
    console.log('Selected Palette:', selectedPalette);
    console.log('Selected Difference Palette:', selectedDifferencePalette);
}


// Event listener per il caricamento del DOM
document.addEventListener('DOMContentLoaded', () => {
    initThemeManager();
    initializeScaleFactorSlider();
    init();
});
