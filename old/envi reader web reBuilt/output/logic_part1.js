const COLOR_PALETTES = {
    "Blue Dominant": {
        1: ['#2b82b8', '#2ab1d5', '#59cee5', '#abe7f2', '#ccf0f7'],
        2: ['#8e9ffa', '#b9d4fe', '#7d7eac', '#5b88b8', '#5ab5d7'],
        // ... (aggiungi tutte le altre palette blu)
    },
    "Green Dominant": {
        1: ['#aab195', '#65704c', '#717a62', '#fdfae4', '#e2b079'],
        2: ['#e3d5cc', '#f3ede9', '#7e9198', '#74afab', '#b3ccaa'],
        // ... (aggiungi tutte le altre palette verdi)
    },
    "Gray/Neutral Dominant": {
        1: ['#f7f7f5', '#eceae5', '#e8e2db', '#f8f1ea', '#ece2db'],
        2: ['#b6b6b5', '#8e8f93', '#a7a19b', '#fbd391', '#edeae8'],
        // ... (aggiungi tutte le altre palette grigie/neutre)
    },
    "Brown/Beige Dominant": {
        1: ['#ecefd0', '#faf8e0', '#fbf4db', '#eed8b9', '#e0be9d'],
        2: ['#f6efdd', '#e7d6b2', '#d3b99d', '#b5989a', '#9591a5'],
        // ... (aggiungi tutte le altre palette marroni/beige)
    },
    "Pink/Purple Dominant": {
        1: ['#f8f5e8', '#f5e0d5', '#f2d6e2', '#cbcce7', '#badfe9'],
        2: ['#dde0f3', '#d3dbf1', '#c4d2f2', '#e5eaf5', '#667ca2'],
        // ... (aggiungi tutte le altre palette rosa/viola)
    },
    "Red/Orange Dominant": {
        1: ['#f2d29c', '#f5be96', '#eda08c', '#ead0ce', '#a85959'],
        2: ['#d27375', '#f29862', '#fbbe6f', '#f8d898', '#f1ebd1'],
        // ... (aggiungi tutte le altre palette rosse/arancioni)
    },
    "Yellow/Gold Dominant": {
        1: ['#4e645c', '#fec22f', '#fc9a2a', '#eed5c0', '#2c4187'],
        2: ['#b7ea63', '#fed446', '#f88f86', '#e782dd', '#bd7dfd'],
        // ... (aggiungi tutte le altre palette gialle/oro)
    }
};
// Costanti per i selettori
const SELECTORS = {
    followTerrain: '#followTerrainToggle',
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

// Struttura predefinita delle cartelle
const FILE_STRUCTURE = {
    atmosphere: {},
    biomet: {
        PET: {},
        PMV: {},
        SET: {},
        UTCI: {}
    },
    radiation: {},
    receptors: {},
    soil: {},
    solaraccess: {
        ground: {},
    },
    surface: {}
};
// Stato dell'applicazione
let state = {
    filesetA: null,
    filesetB: null,
    currentTimeIndex: 0,
    isCongruent: true,
    edxVariables: [],
    dimensions: { x: 0, y: 0, z: 0 },
    differenceOrder: 'A-B',
    scaleFactor: 1
};

// Selettori DOM
const DOM = {};

// Gestione del cambio dello schema di colori
let selectedPalette = ['#2b82b8', '#2ab1d5', '#59cee5', '#abe7f2', '#ccf0f7']; // Default palette

const chartInstances = {};

const dataCache = new Map();

const debouncedUpdateVisualization = debounce(updateVisualization, 250);

/************         Funzioni di utilità         ************/

function debounce(func, wait) {
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
    //console.warn('Questo browser non supporta l\'API File System Access. Alcune funzionalità potrebbero non funzionare correttamente.');
    // Qui potresti implementare un fallback o mostrare un messaggio all'utente
}

// Funzione di utilità per selezionare elementi DOM in modo sicuro
function safeQuerySelector(selector) {
    const element = document.querySelector(selector);
    if (!element) {
        //console.warn(`Elemento non trovato: ${selector}`);
    }
    return element;
}
// Funzione per formattare l'etichetta dello slider
function formatSliderLabel(title, value, unit = '') {
    return `
        <span style="font-family: Helvetica, Arial, sans-serif; font-weight: bold;">${title}</span>
        <span style="font-family: Helvetica, Arial, sans-serif; font-weight: 300; font-style: italic; font-size: 0.9em;">${value}${unit}</span>
    `;
}

function logError(errorMessage, errorDetails = {}) {
    //console.error(`Error: ${errorMessage}`, errorDetails);
    // In futuro, qui si potrebbe implementare la logica per inviare l'errore a un servizio di logging
}

function calculateMetersValue(value, spacingArray) {
    let sum = 0;
    for (let i = 0; i <= value && i < spacingArray.length; i++) {
        sum += spacingArray[i];
    }
    return sum;
}
function handleToggleButton(toggleButton, onToggle) {
    const isPressed = toggleButton.getAttribute('aria-checked') === 'true';
    const newState = !isPressed;
    toggleButton.setAttribute('aria-checked', newState.toString());

    // Forza un reflow per assicurarsi che l'animazione venga attivata
    toggleButton.offsetHeight;

    if (onToggle) {
        onToggle(newState);
    }
}

function handleScaleChange(event) {
    state.scaleFactor = parseFloat(event.target.value);
    document.getElementById('scaleValue').textContent = state.scaleFactor.toFixed(1) + 'x';
    updateChartContainers();
    resizeAllCharts();
}

function changeSliderValue(slider, increment = true) {
    const currentValue = parseInt(slider.value);
    const limitValue = increment ? parseInt(slider.max) : parseInt(slider.min);

    if ((increment && currentValue < limitValue) || (!increment && currentValue > limitValue)) {
        slider.value = currentValue + (increment ? 1 : -1);
        slider.dispatchEvent(new Event('change'));
    }
}
// Confronta due array
function arraysEqual(a, b) {
    if (!a || !b) return false;
    return a.length === b.length && a.every((val, index) => val === b[index]);
}

// Verifica se il toggle "Follow Terrain" è abilitato
function isFollowTerrainEnabled() {
    return DOM.followTerrainToggle && DOM.followTerrainToggle.getAttribute('aria-pressed') === 'true';
}

/************         Funzioni di gestione del file system         ************/

// Gestione della selezione della directory
async function handleDirectorySelection() {
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

// Funzione ricorsiva per costruire la struttura della directory
async function buildDirectoryStructure(dirHandle) {
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
function findEDXFile(structure) {
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
function getFilesInFolder(structure, path) {
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
// Ottiene le coppie di file serie
function getFileCoupleSeries(files) {
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
// Legge il contenuto di un file
function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const arrayBuffer = event.target.result;
            try {
                const content = new TextDecoder('ISO-8859-1').decode(arrayBuffer);
                if (content.includes('<name_variables>')) {
                    //console.log('Codifica utilizzata: ISO-8859-1');
                    resolve(content);
                } else {
                    reject(new Error("Il contenuto del file non sembra essere nel formato atteso"));
                }
            } catch (e) {
                //console.error('Errore nella decodifica del file:', e);
                reject(e);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
}
// Log dei valori estratti dal file EDX
function logExtractedValues(filesetKey) {
    const data = state[filesetKey].edxData;
    //console.log(`Valori estratti per ${filesetKey}:`);
    //console.log(`nr_xdata: ${data.nrXData}`);
    //console.log(`nr_ydata: ${data.nrYData}`);
    //console.log(`nr_zdata: ${data.nrZData}`);
    //console.log(`spacing_x: ${data.spacing?.x?.join(', ') || 'Non disponibile'}`);
    //console.log(`spacing_y: ${data.spacing?.y?.join(', ') || 'Non disponibile'}`);
    //console.log(`spacing_z: ${data.spacing?.z?.join(', ') || 'Non disponibile'}`);
}

// Legge un file EDT
async function readEDTFile(file, edxInfo, selectedVariable, sliceConfig) {
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
async function loadTerrainData(filesetKey) {
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

        const variableIndex = 3; // L'indice del terreno è la quarta variabile (indice 3)
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
        console.error(`Errore nella lettura del file EDT per ${filesetKey}:`, error);
        return null;
    }
}

// Verifica la congruenza tra i fileset
function checkCongruence() {
    if (state.filesetA?.edxData && state.filesetB?.edxData) {
        const dataA = state.filesetA.edxData;
        const dataB = state.filesetB.edxData;

        const isCongruent =
            dataA.nrXData === dataB.nrXData &&
            dataA.nrYData === dataB.nrYData &&
            dataA.nrZData === dataB.nrZData &&
            arraysEqual(dataA.spacing?.x, dataB.spacing?.x) &&
            arraysEqual(dataA.spacing?.y, dataB.spacing?.y) &&
            arraysEqual(dataA.spacing?.z, dataB.spacing?.z);

        state.isCongruent = isCongruent;
        //console.log(`I fileset sono ${isCongruent ? 'congruenti' : 'non congruenti'}`);
    } else {
        //console.log('Non è possibile verificare la congruenza: dati mancanti');
    }
}
// Funzione per loggare le coppie di file selezionate
function logSelectedFileCouples(selectedPath, selectedCoupleA, selectedCoupleB, filesetA, filesetB) {
    //console.log('Selected file couples:');

    if (selectedCoupleA) {
        const edtPathA = getFullPath(filesetA, selectedPath, selectedCoupleA.EDT.name);
        const edxPathA = getFullPath(filesetA, selectedPath, selectedCoupleA.EDX.name);
        //console.log('Fileset A:');
        //console.log(`EDT: ${edtPathA}`);
        //console.log(`EDX: ${edxPathA}`);
    } else if (filesetA) {
        //console.log('Fileset A: No matching files for this time step');
    }