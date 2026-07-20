//....enviropment.js
import { DOM } from './enviropment.js';
import { state } from './enviropment.js';

import { updateTimeSlider } from './fileMan.js';

import { updateDataMenu } from './fileMan.js';
import { updateSliderRanges } from './fileMan.js';



import { loadTerrainData } from './fileMan.js';
import { reloadEDXFiles } from './fileMan.js';
import { logExtractedValues } from './processing.js';
import { updateTimeButtons } from './fileMan.js';
import { updateTimeLabel } from './fileMan.js';
import { updatePathDisplays } from './fileMan2.js';
import { updateLevelLabel } from './fileMan.js';
import { updateSectionXLabel } from './fileMan.js';
import { updateSectionYLabel } from './fileMan.js';
import { handleToggleButton } from './utils.js';

import { updateVisualization } from './viz.js';



import { changeSliderValue } from './utils.js';

import { updateWindOpacityLabel } from './fileMan.js';
import { updateWindDensityLabel } from './fileMan.js';
import { updateFileset } from './fileMan.js';
import { updateWindSizeLabel } from './fileMan.js';


import { incrementTime } from './viz.js';
import { decrementTime } from './viz.js';


import { chartInstances } from './enviropment.js';





/************         Funzioni di gestione degli eventi         ************/


// Gestisce il cambio di gruppo dati
export async function handleDataGroupChange() {
    const selectedPath = DOM.selectDataGroup.value;

    await reloadEDXFiles(selectedPath);
    await updateDataMenu(selectedPath);

    if (DOM.selectData.options.length > 0) {
        updateTimeSlider();
        updateTimeButtons();
        updatePathDisplays();
        updateSliderRanges();

        if (state.filesetA && state.filesetA.edxData) logExtractedValues('filesetA');
        if (state.filesetB && state.filesetB.edxData) logExtractedValues('filesetB');

        await updateVisualization('filesetA');
        await updateVisualization('filesetB');
    } else {
        //console.warn("No data available for the selected path.");
    }
}

// Gestione del cambio dello slider del tempo
export async function handleTimeSliderChange() {
    console.log("handleTimeSliderChange chiamata");
    updateTimeLabel();
    updateTimeButtons();
    
    // Ottieni il tipo di vista corrente
    const viewTypes = ['level', 'section-x', 'section-y'];
    
    // Aggiorna tutte le visualizzazioni per ogni fileset
    for (const viewType of viewTypes) {
        if (state.filesetA) {
            await updateVisualization('filesetA', viewType);
        }
        if (state.filesetB) {
            await updateVisualization('filesetB', viewType);
        }
    }
}
// Gestione del cambio dello slider del livello
export function handleLevelSliderChange() {
    updateLevelLabel();
    updateVisualization('filesetA', 'level');
    updateVisualization('filesetB', 'level');
}

// Gestisce il cambio dello slider della sezione X
export async function handleSectionXSliderChange() {
    updateSectionXLabel();
    const xIndex = parseInt(DOM.sectionXSlider.value);
    const currentY = state.crossPosition ? state.crossPosition.yIndex : parseInt(DOM.sectionYSlider.value);
    
    state.crossPosition = {
        xIndex: xIndex,
        yIndex: currentY,
        viewType: 'section-x',
        value: null
    };

    await updateVisualization('filesetA', 'section-x');
    await updateVisualization('filesetB', 'section-x');
}

// Gestione del cambio dello slider della sezione Y
export async function handleSectionYSliderChange() {
    updateSectionYLabel();
    const yIndex = parseInt(DOM.sectionYSlider.value);
    const currentX = state.crossPosition ? state.crossPosition.xIndex : parseInt(DOM.sectionXSlider.value);
    
    state.crossPosition = {
        xIndex: currentX,
        yIndex: yIndex,
        viewType: 'section-y',
        value: null
    };

    await updateVisualization('filesetA', 'section-y');
    await updateVisualization('filesetB', 'section-y');
}

// Gestione del cambio dell'opacità del vento
export function handleWindOpacityChange() {
    const opacityValue = DOM.windOpacitySlider.value;
    updateWindOpacityLabel();
    updateVisualization('filesetA');
    updateVisualization('filesetB');
}

// Gestione del cambio della densità del vento
export function handleWindDensityChange() {
    const densityValue = DOM.windDensitySlider.value;
    updateWindDensityLabel();
    updateVisualization('filesetA');
    updateVisualization('filesetB');
}

// Gestione del salvataggio dei preset
export function handleSavePreset() {
    //console.log("Saving preset");
    // Implementare la logica per salvare il preset
}


// Gestione del toggle "Follow Terrain"
export async function handleFollowTerrainToggle() {
    if (!DOM.followTerrainToggle) {
        return;
    }

    handleToggleButton(DOM.followTerrainToggle, async (isEnabled) => {
        if (isEnabled) {
            state.terrainDataA = await loadTerrainData('filesetA');
            state.terrainDataB = state.filesetB ? await loadTerrainData('filesetB') : null;

            if (!state.terrainDataA && (!state.filesetB || !state.terrainDataB)) {
                DOM.followTerrainToggle.setAttribute('aria-checked', 'false');
                state.terrainDataA = null;
                state.terrainDataB = null;
            }
        } else {
            state.terrainDataA = null;
            state.terrainDataB = null;
        }

        await updateVisualization('filesetA');
        if (state.filesetB) await updateVisualization('filesetB');

        // Mostra o nascondi gli slider del vento
        const windControls = document.getElementById('windControls');
        if (state.showWindField) {
            windControls.style.display = 'block'; // Mostra gli slider
        } else {
            windControls.style.display = 'none'; // Nascondi gli slider
        }
    });
}

export function handleDifferenceOrderToggle() {
    handleToggleButton(DOM.differenceOrderToggle, (isAMinusB) => {
        state.differenceOrder = isAMinusB ? 'A-B' : 'B-A';
        if (DOM.differenceOrderValue) {
            DOM.differenceOrderValue.textContent = state.differenceOrder;
        }
        updateVisualization('filesetA');
        updateVisualization('filesetB');
    });
}


// Gestione del resize della finestra
export function handleResize() {
    const container = document.querySelector('.container');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const isMobile = window.innerWidth <= 768;
    const isSidebarVisible = !container.classList.contains('sidebar-hidden');

    if (isMobile) {
        sidebar.style.height = '350px';
        sidebar.style.width = '100%';
        mainContent.style.marginTop = isSidebarVisible ? '350px' : '0';
        mainContent.style.marginLeft = '0';
    } else {
        sidebar.style.height = '100%';
        sidebar.style.width = '350px';
        mainContent.style.marginTop = '0';
        mainContent.style.marginLeft = isSidebarVisible ? '350px' : '0'; // Aggiornato da 300px a 320px
    }


    if (chartInstances['timeSeries']) {
        chartInstances['timeSeries'].resize();
    }
}

export function handleChartClick(viewType, xIndex, yIndex) {
    let updateNeeded = false;

    const updateSliders = (sliders, values) => {
        sliders.forEach((slider, index) => {
            if (DOM[slider].value != values[index]) {
                DOM[slider].value = values[index];
                updateNeeded = true;
            }
        });
    };

    switch (viewType) {
        case 'level':
            updateSliders(['sectionXSlider', 'sectionYSlider'], [xIndex, yIndex]);
            updateSectionXLabel();
            updateSectionYLabel();
            break;
        case 'section-x':
            updateSliders(['sectionYSlider', 'levelSlider'], [xIndex, yIndex]);
            updateSectionYLabel();
            updateLevelLabel();
            break;
        case 'section-y':
            updateSliders(['sectionXSlider', 'levelSlider'], [xIndex, yIndex]);
            updateSectionXLabel();
            updateLevelLabel();
            break;
    }

    if (updateNeeded) {
        updateVisualization('filesetA');
        updateVisualization('filesetB');
        if (state.filesetA && state.filesetB) {
            updateVisualization('filesetDiff');
        }
    }
}



// Aggiunge i listener agli eventi
export function addEventListeners() {
    if (DOM.buttonFilesetA) {
        DOM.buttonFilesetA.addEventListener('click', () => {
            updateFileset('filesetA');
        });
    }

    if (DOM.buttonFilesetB) {
        DOM.buttonFilesetB.addEventListener('click', () => {
            updateFileset('filesetB');
        });
    }
    if (DOM.levelIncrementBtn) {
        DOM.levelIncrementBtn.addEventListener('click', () => changeSliderValue(DOM.levelSlider, true));
    }
    if (DOM.levelDecrementBtn) {
        DOM.levelDecrementBtn.addEventListener('click', () => changeSliderValue(DOM.levelSlider, false));
    }
    if (DOM.sectionXIncrementBtn) {
        DOM.sectionXIncrementBtn.addEventListener('click', () => changeSliderValue(DOM.sectionXSlider, true));
    }
    if (DOM.sectionXDecrementBtn) {
        DOM.sectionXDecrementBtn.addEventListener('click', () => changeSliderValue(DOM.sectionXSlider, false));
    }
    if (DOM.sectionYIncrementBtn) {
        DOM.sectionYIncrementBtn.addEventListener('click', () => changeSliderValue(DOM.sectionYSlider, true));
    }
    if (DOM.sectionYDecrementBtn) {
        DOM.sectionYDecrementBtn.addEventListener('click', () => changeSliderValue(DOM.sectionYSlider, false));
    }

    if (DOM.selectDataGroup) {
        DOM.selectDataGroup.addEventListener('change', handleDataGroupChange);
    }

    if (DOM.buttonFilesetA) {
        DOM.buttonFilesetA.addEventListener('click', () => {
            updateFileset('filesetA');
        });
    }

    if (DOM.buttonFilesetB) {
        DOM.buttonFilesetB.addEventListener('click', () => {
            updateFileset('filesetB');
        });
    }

    if (DOM.timeSlider) {
        DOM.timeSlider.addEventListener('change', handleTimeSliderChange);
    }

    if (DOM.timeIncrementBtn) {
        DOM.timeIncrementBtn.addEventListener('click', incrementTime);
    }

    if (DOM.timeDecrementBtn) {
        DOM.timeDecrementBtn.addEventListener('click', decrementTime);
    }

    if (DOM.selectData) {
        DOM.selectData.addEventListener('change', () => {
            //console.log("Variabile selezionata:", DOM.selectData.value);
            updateVisualization('filesetA');
            updateVisualization('filesetB');
        });
    }

    if (DOM.levelSlider) {
        DOM.levelSlider.addEventListener('input', handleLevelSliderChange);
    }

    if (DOM.sectionXSlider) {
        DOM.sectionXSlider.addEventListener('input', handleSectionXSliderChange);
    }

    if (DOM.sectionYSlider) {
        DOM.sectionYSlider.addEventListener('input', handleSectionYSliderChange);
    }

    if (DOM.followTerrainToggle) {
        DOM.followTerrainToggle.addEventListener('click', handleFollowTerrainToggle);
    }

    if (DOM.windOpacitySlider) {
        DOM.windOpacitySlider.addEventListener('input', handleWindOpacityChange);
    }

    if (DOM.windSizeSlider) {
        DOM.windSizeSlider.addEventListener('input', handleWindSizeChange);
    }

    if (DOM.windDensitySlider) {
        DOM.windDensitySlider.addEventListener('input', handleWindDensityChange);
    }

    if (DOM.savePresetButton) {
        DOM.savePresetButton.addEventListener('click', handleSavePreset);
    }
    if (DOM.differenceOrderToggle) {
        DOM.differenceOrderToggle.addEventListener('click', handleDifferenceOrderToggle);
    }
    if (DOM.differenceOrderValue) {
        DOM.differenceOrderValue.textContent = state.differenceOrder;
    }

    // Inizializza la visibilità degli slider del vento
    const windControls = document.getElementById('windControls');
    windControls.style.display = state.showWindField ? 'block' : 'none';
}

// Inizializza gli event listener
export function initializeEventListeners() {
    // ... existing event listeners ...

    // Aggiungi l'event listener per il toggle del campo di vento
    const showWindFieldToggle = document.getElementById('showWindFieldToggle');
    if (showWindFieldToggle) {
        showWindFieldToggle.addEventListener('click', handleWindFieldToggle);
    }
}

// Gestisce il toggle del campo di vento
export function handleWindFieldToggle(event) {
    const button = event.currentTarget;
    const isChecked = button.getAttribute('aria-checked') === 'true';
    button.setAttribute('aria-checked', (!isChecked).toString());
    state.showWindField = !isChecked;
    
    console.log('=== Wind Field Toggle ===');
    console.log('Toggle state:', !isChecked);
    console.log('Selected path:', DOM.selectDataGroup.value);
    
    const windControls = document.getElementById('windControls');
    if (state.showWindField) {
        console.log('Enabling wind controls');
        windControls.style.display = 'block';
    } else {
        console.log('Disabling wind controls');
        windControls.style.display = 'none';
    }
    
    if (DOM.selectDataGroup.value === 'atmosphere') {
        console.log('Atmosphere data selected, updating visualizations...');
        if (state.filesetA) {
            updateVisualization('filesetA', 'all');
        }
        if (state.filesetB) {
            updateVisualization('filesetB', 'all');
        }
    }
}

// Gestione del cambio della dimensione del vento
export function handleWindSizeChange() {
    const sizeValue = DOM.windSizeSlider.value;
    updateWindSizeLabel();
    updateVisualization('filesetA');
    updateVisualization('filesetB');
}