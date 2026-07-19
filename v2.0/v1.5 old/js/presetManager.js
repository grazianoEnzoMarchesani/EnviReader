import { updateDataMenu } from './fileMan.js';
import { updateVisualization } from './viz.js';
import { DOM } from './enviropment.js';
import { state } from './enviropment.js';
import { setPalette } from './fileMan.js';
import { updateTimeLabel, updateTimeButtons } from './fileMan.js';

// Gestore dei preset
export async function initializePresetButtons() {
    const presets = await loadPresets();
    const presetKeys = Object.keys(presets);
    const presetContainer = document.querySelector('.preset-buttons'); // Assicurati che ci sia un contenitore per i pulsanti

    // Pulisci il contenitore esistente
    presetContainer.innerHTML = '';

    presetKeys.forEach((presetKey) => {
        const button = document.createElement('button');
        button.id = `${presetKey}Button`;
        button.textContent = `Set ${presetKey}`;
        button.addEventListener('click', () => applyPreset(presets[presetKey]));
        presetContainer.appendChild(button);
    });
}

async function loadPresets() {
    const response = await fetch('data/presets.json'); // Assicurati che il percorso sia corretto
    if (!response.ok) {
        throw new Error('Errore nel caricamento dei preset');
    }
    return await response.json();
}

async function applyPreset(preset) {
    if (!preset) return;

    // Gestione dei selettori
    const selectors = {
        dataGroupSelector: document.getElementById('dataGroupSelector'),
        dataSelector: document.getElementById('dataSelector'),
        scaleTypeSelector: document.getElementById('scaleType')
    };

    // Salva gli event listener originali solo se i selettori esistono
    const originalListeners = {};
    for (const [key, element] of Object.entries(selectors)) {
        if (element) {
            originalListeners[key] = element.onchange;
            element.onchange = null;
        }
    }

    // Imposta i valori dei selettori solo se esistono sia il selettore che il valore
    if (selectors.dataGroupSelector && preset['Data group']) {
        selectors.dataGroupSelector.value = preset['Data group'];
        await updateDataMenu(preset['Data group']);
    }

    if (selectors.dataSelector && preset['Data']) {
        selectors.dataSelector.value = preset['Data'];
    }

    if (selectors.scaleTypeSelector && preset['Legend bounds']) {
        selectors.scaleTypeSelector.value = preset['Legend bounds'];
    }

    // Imposta le palette di colori solo se sono definite completamente
    if (preset.colorPalette?.category && preset.colorPalette?.number) {
        setPalette(preset.colorPalette.category, preset.colorPalette.number, false);
    }
    if (preset.colorDiffPalette?.category && preset.colorDiffPalette?.number) {
        setPalette(preset.colorDiffPalette.category, preset.colorDiffPalette.number, true);
    }

    // Ripristina gli event listener originali
    for (const [key, element] of Object.entries(selectors)) {
        if (element && originalListeners[key]) {
            element.onchange = originalListeners[key];
        }
    }

    // Gestione degli slider
    const sliders = {
        levelSlider: preset.level,
        sectionXSlider: preset.sectionX,
        sectionYSlider: preset.sectionY,
        scaleFactorSlider: preset.scaleFactor,
        windOpacitySlider: preset.windOpacity,
        windSizeSlider: preset.windSize,
        windDensitySlider: preset.windDensity,
        timeSlider: preset.time
    };

    // Applica i valori solo agli slider esistenti e con valori validi
    for (const [sliderId, value] of Object.entries(sliders)) {
        const slider = document.getElementById(sliderId);
        if (slider && value !== undefined && value !== null) {
            const numValue = Number(value);
            if (!isNaN(numValue)) {
                slider.value = numValue;
                if (sliderId === 'timeSlider') {
                    updateTimeLabel();
                    updateTimeButtons();
                }
                slider.dispatchEvent(new Event('input'));
            }
        }
    }

    // Gestione dei toggle solo se esistono e hanno un valore valido
    if (DOM.followTerrainToggle && preset.followTerrain !== undefined) {
        DOM.followTerrainToggle.setAttribute('aria-checked', !preset.followTerrain);
        DOM.followTerrainToggle.dispatchEvent(new Event('click'));
    }

    const showWindFieldToggle = document.getElementById('showWindFieldToggle');
    if (showWindFieldToggle && preset['Show Wind Field'] !== undefined) {
        showWindFieldToggle.setAttribute('aria-checked', !preset['Show Wind Field']);
        showWindFieldToggle.dispatchEvent(new Event('click'));
    }

    // Aggiorna la visualizzazione
    await updateVisualization('filesetA');
    if (state.filesetB) {
        await updateVisualization('filesetB');
    }
}

document.getElementById('loadPresetButton').addEventListener('click', async () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    
    fileInput.onchange = async (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const presets = JSON.parse(e.target.result);
                    await createPresetButtons(presets);
                } catch (error) {
                    console.error('Errore nel caricamento dei preset:', error);
                }
            };
            reader.readAsText(file);
        }
    };
    
    fileInput.click();
});

async function createPresetButtons(presets) {
    const presetContainer = document.querySelector('.preset-buttons');
    presetContainer.innerHTML = ''; // Pulisci i pulsanti esistenti

    Object.keys(presets).forEach((presetKey) => {
        const button = document.createElement('button');
        button.id = `${presetKey}Button`;
        button.textContent = `Set ${presetKey}`;
        button.addEventListener('click', () => applyPreset(presets[presetKey]));
        presetContainer.appendChild(button);
    });
}