import { resizeChartContainers } from './viz2.js'; // Assicurati che il percorso sia corretto
import { updateVisualization } from './viz.js'; // Importa la funzione qui
import { formatSliderLabel } from './fileMan.js'; // Assicurati che il percorso sia corretto

// Stato dell'applicazione
export let state = {
    filesetA: null,
    filesetB: null,
    currentTimeIndex: 0,
    isCongruent: true,
    edxVariables: [],
    dimensions: { x: 0, y: 0, z: 0 },
    differenceOrder: 'A-B',
    scaleFactor: 1,
    showWindField: false,
    crossPosition: {
        x: null,
        y: null,
        viewType: null
    }
};

// Selettori DOM
export const DOM = {};

export const chartInstances = {};
export const chartInstancesLines = {};

export const dataCache = new Map();

// Inizializza il riferimento allo slider e aggiungi l'evento
export function initializeScaleFactorSlider() {
    const scaleFactorSlider = document.getElementById('scaleFactorSlider');
    const scaleFactorLabel = document.getElementById('scaleFactorLabel');
    const incrementBtn = scaleFactorSlider.parentElement.querySelector('[aria-label="Increment scale factor"]');
    const decrementBtn = scaleFactorSlider.parentElement.querySelector('[aria-label="Decrement scale factor"]');

    scaleFactorSlider.addEventListener('input', async (event) => {
        const value = parseFloat(event.target.value);
        updateScaleFactor(value);
        scaleFactorLabel.innerHTML = formatSliderLabel('Scale Factor', value.toFixed(1));
        await updateVisualization('filesetA', 'all');
        await updateVisualization('filesetB', 'all');
    });

    incrementBtn.addEventListener('click', () => {
        const newValue = Math.min(parseFloat(scaleFactorSlider.value) + 0.5, parseFloat(scaleFactorSlider.max));
        scaleFactorSlider.value = newValue;
        scaleFactorSlider.dispatchEvent(new Event('input'));
    });

    decrementBtn.addEventListener('click', () => {
        const newValue = Math.max(parseFloat(scaleFactorSlider.value) - 0.5, parseFloat(scaleFactorSlider.min));
        scaleFactorSlider.value = newValue;
        scaleFactorSlider.dispatchEvent(new Event('input'));
    });

    // Imposta l'etichetta iniziale
    scaleFactorLabel.innerHTML = formatSliderLabel('Scale Factor', '1.0');
}

// Funzione per aggiornare il scaleFactor
export function updateScaleFactor(newScaleFactor) {
    state.scaleFactor = newScaleFactor;
    const scaleFactorValue = document.getElementById('scaleFactorSlider');
    if (scaleFactorSlider) {
        scaleFactorSlider.textContent = state.scaleFactor.toFixed(1);
    } else {
        console.error("Elemento 'scaleFactorSlider' non trovato nel DOM.");
    }
}

// Esempio di utilizzo della funzione per modificare scaleFactor
export function modifyScaleFactor(increment) {
    const newScaleFactor = state.scaleFactor + increment;
    updateScaleFactor(newScaleFactor);
}

async function updateAllCharts() {
    // Aggiorna la visualizzazione per entrambi i fileset
    if (state.filesetA) {
        await updateVisualization('filesetA', 'all');
    }
    if (state.filesetB) {
        await updateVisualization('filesetB', 'all');
    }
    
    // Ridimensiona i contenitori dei grafici
    resizeChartContainers();
}

