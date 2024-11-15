
import { dataCache } from './enviropment.js';

import { processEDXFile } from './processing.js';
import { extractSlice } from './processing.js';

import { COLOR_PALETTES } from './options.js';
import { FILE_STRUCTURE } from './options.js';


import { DOM } from './enviropment.js';
import { state } from './enviropment.js';
import { chartInstances } from './enviropment.js';


import { readEDXFile } from './processing.js';

import { calculateMetersValue } from './utils.js';
import { handleDirectorySelection } from './utils.js';

import { updateVisualization } from './viz.js';
import { resizeChartContainers } from './viz2.js';

import { updatePathDisplays } from './fileMan2.js';



export let selectedPath = ""

// Gestione del cambio dello schema di colori
export let selectedPalette = ['#568d96', '#dbdcce', '#fec386', '#d88949', '#ac7d6d']; // Default palette

export let selectedDifferencePalette = ['#e6e9ec', '#cdd3d8', '#969ea4', '#666c71', '#585c5f']; // Default palette for differences




// Ottiene le coppie di file serie
export function getFileCoupleSeries(files) {
    const regex = /^(.+?)_((?:BIO_)?[A-Z]+)_(\d{4}-\d{2}-\d{2})(?:_(\d{2}\.\d{2}\.\d{2}))?\.(EDT|EDX)$/;
    const filePairs = new Map();

    files.forEach(file => {
        const match = file.name.match(regex);
        if (match) {
            const [, name, type, date, time, ext] = match;
            const key = time ? `${name}_${type}_${date}_${time}` : `${name}_${type}_${date}`;

            if (!filePairs.has(key)) {
                filePairs.set(key, {});
            }
            filePairs.get(key)[ext.toUpperCase()] = file;
        }
    });

    return Array.from(filePairs.values())
        .filter(pair => pair.EDT && pair.EDX)
        .sort((a, b) => a.EDT.name.localeCompare(b.EDT.name));
}


// Funzione ricorsiva per costruire la struttura della directory
export async function buildDirectoryStructure(dirHandle) {
    const structure = {};
    for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
            structure.files = structure.files || [];
            structure.files.push(await entry.getFile());
        } else if (entry.kind === 'directory') {
            structure[entry.name] = await buildDirectoryStructure(entry);
        }
    }
    return structure;
}
// Trova il file EDX nella struttura
export function findEDXFile(structure) {
    if (structure.files) {
        const edxFile = structure.files.find(file => file.name.endsWith('.EDX'));
        if (edxFile) return edxFile;
    }
    for (const key in structure) {
        if (typeof structure[key] === 'object' && !Array.isArray(structure[key])) {
            const result = findEDXFile(structure[key]);
            if (result) return result;
        }
    }
    return null;
}


// Ottiene i file nella cartella specificata
export function getFilesInFolder(structure, path) {
    const parts = path.split('/');
    let current = structure;
    for (const part of parts) {
        if (current[part]) {
            current = current[part];
        } else {
            return [];
        }
    }
    return current.files || [];
}


// Legge un file EDT
export async function readEDTFile(file, edxInfo, selectedVariable, sliceConfig) {
    const cacheKey = `${file.name}-${selectedVariable}-${JSON.stringify(sliceConfig)}`;

    if (dataCache.has(cacheKey)) {
        return dataCache.get(cacheKey);
    }

    const buffer = await file.arrayBuffer();
    const dataView = new DataView(buffer);

    const { dimensions, nrVariables, variableNames } = edxInfo;
    const variableIndex = variableNames.indexOf(selectedVariable);

    if (variableIndex === -1) {
        throw new Error("Selected variable not found in EDX file");
    }

    const sliceData = extractSlice(dataView, dimensions, nrVariables, variableIndex, sliceConfig);

    // Ottimizzazione: convertire l'array in Float32Array e arrotondare a 2 decimali
    const optimizedSliceData = new Float32Array(sliceData.length);
    for (let i = 0; i < sliceData.length; i++) {
        if (sliceData[i] === null) {
            optimizedSliceData[i] = NaN;
        } else {
            optimizedSliceData[i] = Number(sliceData[i].toFixed(2));
        }
    }

    dataCache.set(cacheKey, optimizedSliceData);

    // Limita la dimensione della cache (ad esempio, a 50 elementi)
    if (dataCache.size > 50) {
        const oldestKey = dataCache.keys().next().value;
        dataCache.delete(oldestKey);
    }

    return optimizedSliceData;
}

// Caricamento dei dati del terreno
export async function loadTerrainData(filesetKey) {
    const fileset = state[filesetKey];
    if (!fileset) {
        //console.error(`Fileset ${filesetKey} non trovato`);
        return null;
    }

    const selectedPath = 'solaraccess/ground';
    const files = getFilesInFolder(fileset.structure, selectedPath);
    const edtFiles = files.filter(file => file.name.match(/^.*_SA_\d{4}-\d{2}-\d{2}\.EDT$/));

    if (edtFiles.length === 0) {
        //console.error(`Nessun file EDT trovato in ${selectedPath}`);
        return null;
    }

    const edtFile = edtFiles[0];

    try {
        const buffer = await edtFile.arrayBuffer();
        const dataView = new DataView(buffer);

        const variableIndex = 3; // L'indice del terreno Ã¨ la quarta variabile (indice 3)
        const { x: nrXData, y: nrYData } = state.dimensions;
        const totalDataPoints = nrXData * nrYData;
        const bytesPerValue = 4; // Assumendo che i dati siano float a 32 bit

        const terrainData = new Float32Array(totalDataPoints);
        for (let i = 0; i < totalDataPoints; i++) {
            const offset = (variableIndex * totalDataPoints + i) * bytesPerValue;
            terrainData[i] = dataView.getFloat32(offset, true);
        }

        console.log(`Dati del terreno caricati per ${filesetKey}:`,
            "Primi 5 valori:", terrainData.slice(0, 5),
            "Ultimi 5 valori:", terrainData.slice(-5),
            "Min:", Math.min(...terrainData),
            "Max:", Math.max(...terrainData)
        );

        return terrainData;
    } catch (error) {
        //console.error(`Errore nella lettura del file EDT per ${filesetKey}:`, error);
        return null;
    }
}




// Ricarica i file EDX per il percorso selezionato
export async function reloadEDXFiles(selectedPath) {
    const reloadFileset = async (filesetKey) => {
        if (state[filesetKey]) {
            const files = getFilesInFolder(state[filesetKey].structure, selectedPath);
            const fileSeries = getFileCoupleSeries(files);
            if (fileSeries.length > 0) {
                const edxFile = fileSeries[0].EDX;
                const edxInfo = await processEDXFile(edxFile, filesetKey);
                state.edxVariables = edxInfo.variableNames;
                //console.log(`File EDX ricaricato per ${filesetKey}`);
            } else {
                //console.warn(`Nessun file EDX trovato per ${filesetKey} nel percorso: ${selectedPath}`);
            }
        }
    };

    await Promise.all([reloadFileset('filesetA'), reloadFileset('filesetB')]);
}









/************         Funzioni di aggiornamento UI         ************/



export function updateChartsTextColor() {
    const textColor = '#ffffff';
    Object.values(chartInstances).forEach(chart => {
        if (chart && typeof chart.setOption === 'function') {
            chart.setOption({
                visualMap: {
                    textStyle: {
                        color: textColor
                    }
                }
            });
        }
    });
}





// Aggiorna il cursore del tempo
export function updateTimeSlider() {
    if (!DOM.selectDataGroup || !DOM.timeSlider || !DOM.timeLabel) {
        //console.error("Elementi necessari per updateTimeSlider non trovati!");
        return;
    }

    const selectedPath = DOM.selectDataGroup.value;
    const { filesetA, filesetB } = state;

    let fileCoupleSeries = [];

    if (filesetA) {
        const filesA = getFilesInFolder(filesetA.structure, selectedPath);
        fileCoupleSeries = getFileCoupleSeries(filesA);
    }

    if (filesetB) {
        const filesB = getFilesInFolder(filesetB.structure, selectedPath);
        const fileSeriesB = getFileCoupleSeries(filesB);
        fileCoupleSeries = fileCoupleSeries.length > fileSeriesB.length ? fileCoupleSeries : fileSeriesB;
    }

    if (fileCoupleSeries.length > 0) {
        DOM.timeSlider.min = 0;
        DOM.timeSlider.max = fileCoupleSeries.length - 1;
        DOM.timeSlider.value = 0;
        updateTimeLabel();
    } else {
        DOM.timeSlider.min = 0;
        DOM.timeSlider.max = 0;
        DOM.timeSlider.value = 0;
        DOM.timeLabel.innerHTML = '<span style="font-weight: bold;">Time</span> <span style="font-weight: 300;">No valid files</span>';
    }
    updateTimeButtons();
}

// Aggiorna i pulsanti di incremento/decremento del tempo
export function updateTimeButtons() {
    if (!DOM.timeDecrementBtn || !DOM.timeIncrementBtn || !DOM.timeSlider) {
        //console.error("Elementi necessari per updateTimeButtons non trovati!");
        return;
    }
    DOM.timeDecrementBtn.disabled = parseInt(DOM.timeSlider.value) <= parseInt(DOM.timeSlider.min);
    DOM.timeIncrementBtn.disabled = parseInt(DOM.timeSlider.value) >= parseInt(DOM.timeSlider.max);
}


// Aggiorna l'etichetta del tempo
export function updateTimeLabel() {
    if (!DOM.timeSlider || !DOM.timeLabel) {
        //console.error("Elementi timeSlider o timeLabel non trovati nel DOM");
        return;
    }

    const selectedPath = DOM.selectDataGroup.value;
    const currentTimeIndex = parseInt(DOM.timeSlider.value);
    let fileNameToDisplay = "No valid files";

    const { filesetA, filesetB } = state;
    if (filesetA) {
        const filesA = getFilesInFolder(filesetA.structure, selectedPath);
        const fileSeriesA = getFileCoupleSeries(filesA);
        if (fileSeriesA.length > currentTimeIndex) {
            fileNameToDisplay = fileSeriesA[currentTimeIndex].EDT.name;
        }
    } else if (filesetB) {
        const filesB = getFilesInFolder(filesetB.structure, selectedPath);
        const fileSeriesB = getFileCoupleSeries(filesB);
        if (fileSeriesB.length > currentTimeIndex) {
            fileNameToDisplay = fileSeriesB[currentTimeIndex].EDT.name;
        }
    }

    const regex = /^(.+?)_((?:BIO_)?[A-Z]+)_(\d{4}-\d{2}-\d{2})(?:_(\d{2}\.\d{2}\.\d{2}))?\.(EDT|EDX)$/i;
    const match = fileNameToDisplay.match(regex);
    if (match) {
        const [, , type, date, time] = match;
        let displayText = `${type} ${date}`;
        if (time) {
            displayText += ` - ${time.replace(/\./g, ':')}`;
        }
        DOM.timeLabel.innerHTML = formatSliderLabel('Time', displayText);
    } else {
        DOM.timeLabel.innerHTML = formatSliderLabel('Time', 'Invalid format');
    }
}


// Funzione per formattare l'etichetta dello slider
export function formatSliderLabel(title, value, unit = '') {
    return `
        <span style="font-family: Helvetica, Arial, sans-serif; font-weight: bold;">${title}</span>
        <span style="font-family: Helvetica, Arial, sans-serif; font-weight: 300; font-style: italic; font-size: 0.9em;">${value}${unit}</span>
    `;
}

export function updateSliderLabel(sliderId, labelId, getValueText) {
    const slider = document.getElementById(sliderId);
    const label = document.getElementById(labelId);
    if (!slider || !label) {
        //console.warn(`Elementi per lo slider ${sliderId} non trovati nel DOM`);
        return;
    }

    const value = parseInt(slider.value);
    const newText = formatSliderLabel(labelId.replace('Label', ''), getValueText(value));

    // Aggiorna il contenuto solo se è cambiato
    if (label.innerHTML !== newText) {
        label.innerHTML = newText;
    }
}

// Aggiorna i display dei percorsi per tutti i fileset
export function updatePathDisplay(filesetKey) {
    const { rootDir } = state[filesetKey];
    const selectedPath = DOM.selectDataGroup.value;
    const fullPath = `${rootDir}/${selectedPath}`;
    
    if (filesetKey === 'filesetA') {
        DOM.pathDisplayA.textContent = `Selected path: ${fullPath}`;
    } else if (filesetKey === 'filesetB') {
        DOM.pathDisplayB.textContent = `Selected path: ${fullPath}`;
        // Mostra il contenitore del percorso B solo se il fileset A è caricato
        if (state.filesetA && state.filesetA.structure) {
            DOM.pathDisplayB.classList.add('visible');
        } else {
            DOM.pathDisplayB.classList.remove('visible');
        }
    }
}

// Funzione per aggiornare il fileset selezionato
export async function updateFileset(filesetKey) {
    const result = await handleDirectorySelection();
    
    if (!result) {
        console.log(`${filesetKey} non selezionato`);
        return;
    }

    state[filesetKey] = result;
    console.log(`Updated state for ${filesetKey}:`, state[filesetKey]);
    updatePathDisplays();
    console.log(`${filesetKey} directory structure:`, result.structure);

    const edxFile = findEDXFile(result.structure);
    if (!edxFile) {
        console.warn(`Nessun file EDX trovato per ${filesetKey}`);
        return;
    }

    try {
        const edxInfo = await processEDXFile(edxFile, filesetKey);
        state.edxVariables = edxInfo.variableNames;

        const selectedPath = DOM.selectDataGroup.value;
        await updateDataMenu(selectedPath);

        resizeChartContainers();

        // Controlla lo stato del fileset A e aggiorna la visibilità degli elementi del fileset B
        checkFilesetAStatus();
    } catch (error) {
        console.error(`Errore nel processare il file EDX per ${filesetKey}:`, error);
    }

    await updateTimeSlider();
    updateSliderRanges();
}


export function checkFilesetAStatus() {
    if (state.filesetA && state.filesetA.structure) {
        DOM.buttonFilesetB.classList.remove('hidden');
        DOM.pathDisplayB.classList.add('visible');
    } else {
        DOM.buttonFilesetB.classList.add('hidden');
        DOM.pathDisplayB.classList.remove('visible');
    }
}





// Popola il menu a tendina del gruppo dati
export function populateDataGroupDropdown(structure = FILE_STRUCTURE, prefix = '') {
    if (!DOM.selectDataGroup) {
        //console.error("Elemento select per il gruppo di dati non trovato!");
        return;
    }

    Object.entries(structure).forEach(([key, value]) => {
        const fullPath = prefix ? `${prefix}/${key}` : key;

        const option = document.createElement('option');
        option.value = option.textContent = fullPath;
        DOM.selectDataGroup.appendChild(option);

        if (value && typeof value === 'object' && !Array.isArray(value)) {
            populateDataGroupDropdown(value, fullPath);
        }
    });
}
// Popola il menu a tendina delle variabili
export function populateVariableDropdown(variableNames) {
    const selectElement = DOM.selectData;
    if (!selectElement) {
        //console.error(`Elemento select per i dati non trovato!`);
        return;
    }

    const fragment = document.createDocumentFragment();
    variableNames.forEach(name => {
        const option = document.createElement('option');
        option.value = option.textContent = name;
        fragment.appendChild(option);
    });

    selectElement.innerHTML = '';
    selectElement.appendChild(fragment);

    //console.log(`Menu a tendina 'Data' aggiornato con nuove variabili.`);
}

// Aggiorna il menu dei dati
export async function updateDataMenu(selectedPath) {
    if (!DOM.selectData) {
        //console.error("Elemento select per i dati non trovato!");
        return;
    }

    const { filesetA, filesetB } = state;

    let files = [];
    if (filesetA) files = files.concat(getFilesInFolder(filesetA.structure, selectedPath));
    if (filesetB) files = files.concat(getFilesInFolder(filesetB.structure, selectedPath));

    const fileSeries = getFileCoupleSeries(files);
    if (fileSeries.length > 0) {
        const edxFile = fileSeries[0].EDX;
        try {
            const edxInfo = await readEDXFile(edxFile);
            populateVariableDropdown(edxInfo.variableNames);
        } catch (error) {
            //console.error(`Errore nella lettura del file EDX: ${error}`);
            DOM.selectData.innerHTML = '<option value="">Errore nella lettura dei dati</option>';
        }
    } else {
        //console.warn(`Nessuna coppia di file EDT/EDX valida trovata per il percorso selezionato: ${selectedPath}`);
        DOM.selectData.innerHTML = '<option value="">Nessun dato disponibile</option>';
    }
}
// Aggiorna i range degli slider
export function updateSliderRanges() {
    if (!state.dimensions) {
        //console.error("Le dimensioni dei dati non sono disponibili");
        return;
    }

    const { x: nrXData, y: nrYData, z: nrZData } = state.dimensions;

    // Aggiorna il range dello slider Level
    DOM.levelSlider.min = 0;
    DOM.levelSlider.max = nrZData - 1;
    DOM.levelSlider.value = 0;

    // Aggiorna il range dello slider Section X
    DOM.sectionXSlider.min = 0;
    DOM.sectionXSlider.max = nrXData - 1;
    DOM.sectionXSlider.value = Math.min(DOM.sectionXSlider.value, nrXData - 1);

    // Aggiorna il range dello slider Section Y
    DOM.sectionYSlider.min = 0;
    DOM.sectionYSlider.max = nrYData - 1;
    DOM.sectionYSlider.value = Math.min(DOM.sectionYSlider.value, nrYData - 1);

    // Aggiorna le etichette degli slider
    updateLevelLabel();
    updateSectionXLabel();
    updateSectionYLabel();
}

// Aggiorna l'etichetta del livello
export function updateLevelLabel() {
    updateSliderLabel('levelSlider', 'levelLabel', (value) => {
        const metersValue = calculateMetersValue(value, state.spacing?.z || []);
        return `${value} (${metersValue.toFixed(2)}m)`;
    });
}

// Aggiorna l'etichetta della sezione X
export function updateSectionXLabel() {
    updateSliderLabel('sectionXSlider', 'sectionXLabel', (value) => {
        const metersValue = calculateMetersValue(value, state.spacing?.x || []);
        return `${value} (${metersValue.toFixed(2)}m)`;
    });
}
// Aggiorna l'etichetta della sezione Y
export function updateSectionYLabel() {
    updateSliderLabel('sectionYSlider', 'sectionYLabel', (value) => {
        const metersValue = calculateMetersValue(value, state.spacing?.y || []);
        return `${value} (${metersValue.toFixed(2)}m)`;
    });
}
// Aggiorna l'etichetta dell'opacitÃ  del vento
export function updateWindOpacityLabel() {
    updateSliderLabel('windOpacitySlider', 'windOpacityLabel', (value) => `${value}%`);
}

// Aggiorna l'etichetta dell'animazione del vento
export function updateWindAnimationLabel() {
    updateSliderLabel('windAnimationSlider', 'windAnimationLabel', (value) => `${value}%`);
}

// Aggiorna l'etichetta della densitÃ  del vento
export function updateWindDensityLabel() {
    updateSliderLabel('windDensitySlider', 'windDensityLabel', (value) => `${value}%`);
}
export function updateAllLabels() {
    updateTimeLabel();
    updateLevelLabel();
    updateSectionXLabel();
    updateSectionYLabel();
    updateWindOpacityLabel();
    updateWindAnimationLabel();
    updateWindDensityLabel();
}

export function createPathDisplay() {
    // Crea e aggiunge i display dei percorsi
    DOM.pathDisplayA = document.createElement('div');
    DOM.pathDisplayB = document.createElement('div');
    
    DOM.pathDisplayA.className = 'path-display';
    DOM.pathDisplayB.className = 'path-display path-display-b'; // Aggiungi la classe specifica
    
    DOM.buttonFilesetA.insertAdjacentElement('afterend', DOM.pathDisplayA);
    DOM.buttonFilesetB.insertAdjacentElement('afterend', DOM.pathDisplayB);
}


export function initializeColorPaletteSelector() {
    const regularPaletteSelector = document.querySelector('.color-palette-selector:not(.difference-palette-selector)');
    const differencePaletteSelector = document.querySelector('.difference-palette-selector');

    if (regularPaletteSelector) {
        const selectedPalette = regularPaletteSelector.querySelector('.selected-palette');
        const paletteOptions = regularPaletteSelector.querySelector('.palette-options');
        
        selectedPalette.addEventListener('click', () => {
            paletteOptions.classList.toggle('show');
        });

        populateColorPaletteSelector(paletteOptions, false);
    }

    if (differencePaletteSelector) {
        const selectedDifferencePalette = differencePaletteSelector.querySelector('.selected-palette');
        const differencePaletteOptions = differencePaletteSelector.querySelector('.palette-options');
        
        selectedDifferencePalette.addEventListener('click', () => {
            differencePaletteOptions.classList.toggle('show');
        });

        populateColorPaletteSelector(differencePaletteOptions, true);
    }

    // Chiudi i selettori quando si clicca fuori
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.color-palette-selector')) {
            document.querySelectorAll('.palette-options').forEach(options => {
                options.classList.remove('show');
            });
        }
    });
}

export function populateColorPaletteSelector(paletteOptions, isDifference = false) {
    if (!paletteOptions) {
        console.error("Elemento delle opzioni della palette di colori non trovato!");
        return;
    }

    paletteOptions.innerHTML = ''; // Clear existing options

    for (const category in COLOR_PALETTES) {
        for (const paletteNumber in COLOR_PALETTES[category]) {
            const palette = COLOR_PALETTES[category][paletteNumber];
            const option = document.createElement('div');
            option.classList.add('palette-option');
            option.setAttribute('data-value', `${category}|${paletteNumber}`);

            const preview = document.createElement('div');
            preview.classList.add('palette-preview');
            palette.forEach(color => {
                const colorSample = document.createElement('div');
                colorSample.classList.add('color-sample');
                colorSample.style.backgroundColor = color;
                preview.appendChild(colorSample);
            });

            const name = document.createElement('span');
            name.classList.add('palette-name');
            name.textContent = `${category} - Palette ${paletteNumber}`;

            option.appendChild(preview);
            option.appendChild(name);
            paletteOptions.appendChild(option);
        }
    }

    // Aggiungi l'event listener per la selezione della palette
    paletteOptions.addEventListener('click', (event) => handlePaletteSelection(event, isDifference));
}
export function handlePaletteSelection(event, isDifference = false) {
    const option = event.target.closest('.palette-option');
    if (!option) return;

    const value = option.getAttribute('data-value');
    const [category, paletteNumber] = value.split('|');
    const newPalette = COLOR_PALETTES[category][paletteNumber];

    const selector = isDifference ? '.difference-palette-selector' : '.color-palette-selector:not(.difference-palette-selector)';
    const selectedPaletteName = document.querySelector(`${selector} .selected-palette-name`);
    
    if (selectedPaletteName) {
        selectedPaletteName.textContent = `${category} - Palette ${paletteNumber}`;
    }

    if (isDifference) {
        selectedDifferencePalette = newPalette;
    } else {
        selectedPalette = newPalette;
    }

    document.querySelector(`${selector} .palette-options`).classList.remove('show');

    console.log(`${isDifference ? 'Difference color' : 'Color'} palette changed:`, newPalette);
    updateVisualization('filesetA');
    updateVisualization('filesetB');
    if (isDifference) {
        updateVisualization('filesetDiff');
    }
}

// Inizializza il menu dei dati
export async function initializeDataMenu() {
    if (!DOM.selectDataGroup || !DOM.selectData) {
        //console.error("Elementi select necessari non trovati!");
        return;
    }

    const selectedPath = DOM.selectDataGroup.value;
    await updateDataMenu(selectedPath);
    state.filesetA = null;
    state.filesetB = null;
}


