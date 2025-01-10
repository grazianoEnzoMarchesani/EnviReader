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
import { initializeEventListeners } from './events.js';
import { initializePresetButtons } from './presetManager.js';



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
        // console.log('Palette ribaltata:', selectedPalette);
    });

    document.getElementById('reverseDifferencePaletteButton').addEventListener('click', () => {
        selectedDifferencePalette = reversePalette(selectedDifferencePalette);
        updateVisualization('filesetA');
        updateVisualization('filesetB');
        // console.log('Palette differenze ribaltata:', selectedDifferencePalette);
    });

    // console.log('Inizializzazione dei pulsanti di ribaltamento');
    // console.log('Selected Palette:', selectedPalette);
    // console.log('Selected Difference Palette:', selectedDifferencePalette);

    initializePresetButtons(); // Inizializza i pulsanti preset
}


// Event listener per il caricamento del DOM
document.addEventListener('DOMContentLoaded', () => {
    initializeScaleFactorSlider();
    initializeEventListeners();
    initThemeManager();
    init();
});

let presets = {}; // Inizializza la variabile presets

// Funzione per caricare i preset esistenti
async function loadPresets() {
    try {
        const response = await fetch('data/presets.json');
        presets = await response.json();
    } catch (error) {
        console.error('Errore nel caricamento dei preset:', error);
    }
}

// Chiamata per caricare i preset all'avvio
loadPresets();

document.getElementById('savePreset').addEventListener('click', () => {
    // Ottieni i valori delle palette correnti dai selettori DOM
    const regularPaletteSelector = document.querySelector('.color-palette-selector:not(.difference-palette-selector)');
    const differencePaletteSelector = document.querySelector('.difference-palette-selector');
    
    // Ottieni i nomi delle palette dai selettori
    const regularPaletteName = regularPaletteSelector?.querySelector('.selected-palette-name')?.textContent || '';
    const differencePaletteName = differencePaletteSelector?.querySelector('.selected-palette-name')?.textContent || '';
    
    // Estrai i numeri delle palette dal testo (es: "Palette - Palette 3" -> "3")
    const regularPaletteNumber = regularPaletteName.match(/Palette (\d+)/)?.[1] || "1";
    const differencePaletteNumber = differencePaletteName.match(/Palette (\d+)/)?.[1] || "2";

    const presetKey = `preset${Object.keys(presets).length + 1}`;
    const preset = {
        [presetKey]: {
            "Data group": document.getElementById('dataGroupSelector')?.value || '',
            "Data": document.getElementById('dataSelector')?.value || '',
            "time": parseInt(document.getElementById('timeSlider')?.value) || 0,
            "level": parseInt(document.getElementById('levelSlider')?.value) || 0,
            "sectionX": parseInt(document.getElementById('sectionXSlider')?.value) || 0,
            "sectionY": parseInt(document.getElementById('sectionYSlider')?.value) || 0,
            "followTerrain": DOM.followTerrainToggle?.getAttribute('aria-checked') === 'true',
            "scaleFactor": state.scaleFactor,
            "windOpacity": parseInt(document.getElementById('windOpacitySlider')?.value) || 0,
            "windDensity": parseInt(document.getElementById('windDensitySlider')?.value) || 0,
            "windSize": parseInt(document.getElementById('windSizeSlider')?.value) || 0,
            "Show Wind Field": DOM.showWindFieldToggle?.getAttribute('aria-checked') === 'true',
            "Legend bounds": document.getElementById('scaleType')?.value || '',
            "colorPalette": {
                "category": "Palette",
                "number": regularPaletteNumber
            },
            "colorDiffPalette": {
                "category": "Palette",
                "number": differencePaletteNumber
            }
        }
    };

    const json = JSON.stringify(preset, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'preset.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});
