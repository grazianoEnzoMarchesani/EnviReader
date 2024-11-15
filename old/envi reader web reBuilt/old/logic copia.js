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
    updateLegendScale(); // Aggiungi questa riga
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

    if (selectedCoupleB) {
        const edtPathB = getFullPath(filesetB, selectedPath, selectedCoupleB.EDT.name);
        const edxPathB = getFullPath(filesetB, selectedPath, selectedCoupleB.EDX.name);
        //console.log('Fileset B:');
        //console.log(`EDT: ${edtPathB}`);
        //console.log(`EDX: ${edxPathB}`);
    } else if (filesetB) {
        //console.log('Fileset B: No matching files for this time step');
    }
}

// Ricarica i file EDX per il percorso selezionato
async function reloadEDXFiles(selectedPath) {
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

/************         Funzioni di processamento dei dati        ************/
// Processa un file EDX e aggiorna lo stato
async function processEDXFile(file, filesetKey) {
    try {
        const content = await readFileContent(file);
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(content, "text/xml");

        const nrXData = parseInt(xmlDoc.querySelector("nr_xdata").textContent);
        const nrYData = parseInt(xmlDoc.querySelector("nr_ydata").textContent);
        const nrZData = parseInt(xmlDoc.querySelector("nr_zdata").textContent);

        const spacingX = processSpacingData(xmlDoc.querySelector("spacing_x").textContent);
        const spacingY = processSpacingData(xmlDoc.querySelector("spacing_y").textContent);
        const spacingZ = processSpacingData(xmlDoc.querySelector("spacing_z").textContent);

        state[filesetKey].edxData = {
            nrXData,
            nrYData,
            nrZData,
            spacing: { x: spacingX, y: spacingY, z: spacingZ }
        };

        // Aggiorna le dimensioni globali
        state.dimensions = { x: nrXData, y: nrYData, z: nrZData };
        state.spacing = { x: spacingX, y: spacingY, z: spacingZ };

        checkCongruence();
        logExtractedValues(filesetKey);

        return {
            variableNames: xmlDoc.querySelector("name_variables").textContent.split(',').map(name => name.trim()),
            nrVariables: parseInt(xmlDoc.querySelector("nr_variables").textContent),
            dimensions: { x: nrXData, y: nrYData, z: nrZData }
        };
    } catch (error) {
        //console.error(`Errore nel processare il file EDX per ${filesetKey}:`, error);
        throw error;
    }
}


// Processa i dati di spaziatura
function processSpacingData(spacingString) {
    const result = [];
    const numbers = spacingString.split(',');
    for (let i = 0; i < numbers.length; i++) {
        result.push(Number(parseFloat(numbers[i].trim()).toFixed(2)));
    }
    return result;
}
// Legge un file EDX
async function readEDXFile(file) {
    const content = await readFileContent(file);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, "text/xml");

    const decodeText = (text) => {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    };

    const variableNames = xmlDoc.querySelector("name_variables").textContent
        .split(',')
        .map(name => decodeText(name.trim()));

    const nrVariables = parseInt(xmlDoc.querySelector("nr_variables").textContent);
    const dimensions = {
        x: parseInt(xmlDoc.querySelector("nr_xdata").textContent),
        y: parseInt(xmlDoc.querySelector("nr_ydata").textContent),
        z: parseInt(xmlDoc.querySelector("nr_zdata").textContent)
    };

    return { variableNames, nrVariables, dimensions };
}

// Estrai uno slice di dati dal file EDT
function extractSlice(dataView, dimensions, nrVariables, variableIndex, sliceConfig) {
    const { level, sectionX, sectionY, terrainData } = sliceConfig;
    const { x: dimX, y: dimY, z: dimZ } = dimensions;
    const bytesPerValue = 4;
    const totalDataPoints = dimX * dimY * dimZ;
    const variableOffset = variableIndex * totalDataPoints * bytesPerValue;

    let sliceData;
    let sliceLength;

    if (level !== null) {
        sliceLength = dimX * dimY;
        sliceData = new Array(sliceLength);
        for (let i = 0; i < sliceLength; i++) {
            const x = i % dimX;
            const y = Math.floor(i / dimX);
            let adjustedLevel = level;
            if (terrainData) {
                const terrainHeight = Math.floor(terrainData[i]);
                adjustedLevel = Math.min(terrainHeight + level, dimZ - 1);
            }
            const offset = variableOffset + ((adjustedLevel * dimY + y) * dimX + x) * bytesPerValue;
            const value = dataView.getFloat32(offset, true);
            // Modifica qui: arrotonda a 2 cifre decimali
            sliceData[i] = value === -999 ? null : Number(value.toFixed(2));
        }


    } else if (sectionX !== null) {
        sliceLength = dimY * dimZ;
        sliceData = new Array(sliceLength);
        for (let i = 0; i < sliceLength; i++) {
            const y = i % dimY;
            const z = Math.floor(i / dimY);
            const offset = variableOffset + ((z * dimY + y) * dimX + sectionX) * bytesPerValue;
            const value = dataView.getFloat32(offset, true);
            sliceData[i] = value === -999 ? null : value;
        }
    } else if (sectionY !== null) {
        sliceLength = dimX * dimZ;
        sliceData = new Array(sliceLength);
        for (let i = 0; i < sliceLength; i++) {
            const x = i % dimX;
            const z = Math.floor(i / dimX);
            const offset = variableOffset + ((z * dimY + sectionY) * dimX + x) * bytesPerValue;
            const value = dataView.getFloat32(offset, true);
            sliceData[i] = value === -999 ? null : value;
        }
    }

    return sliceData;
}


/************         Funzioni di aggiornamento UI         ************/


function updateSliderLabel(sliderId, labelId, getValueText) {
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
function updateChartsTextColor() {
    const textColor = document.body.classList.contains('dark-mode') ? '#ffffff' : '#333333';
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

function updateChartContainers() {
    const containers = document.querySelectorAll('.chart-container');
    containers.forEach(container => {
        const chartDiv = container.querySelector('.echarts-container');
        if (chartDiv) {
            const originalWidth = parseInt(chartDiv.getAttribute('data-original-width') || chartDiv.clientWidth);
            const originalHeight = parseInt(chartDiv.getAttribute('data-original-height') || chartDiv.clientHeight);

            if (!chartDiv.hasAttribute('data-original-width')) {
                chartDiv.setAttribute('data-original-width', originalWidth);
                chartDiv.setAttribute('data-original-height', originalHeight);
            }

            const scaledWidth = originalWidth * state.scaleFactor;
            const scaledHeight = originalHeight * state.scaleFactor;

            chartDiv.style.width = `${scaledWidth}px`;
            chartDiv.style.height = `${scaledHeight}px`;
        }
    });
}

// Funzione per aggiornare il fileset selezionato
async function updateFileset(filesetKey) {
    const result = await handleDirectorySelection();
    if (!result) {
        //console.log(`${filesetKey} non selezionato`);
        return;
    }

    state[filesetKey] = result;
    //console.log(`Updated state for ${filesetKey}:`, state[filesetKey]);
    updatePathDisplays();
    //console.log(`${filesetKey} directory structure:`, result.structure);

    const edxFile = findEDXFile(result.structure);
    if (!edxFile) {
        //console.warn(`Nessun file EDX trovato per ${filesetKey}`);
        return;
    }

    try {
        const edxInfo = await processEDXFile(edxFile, filesetKey);
        state.edxVariables = edxInfo.variableNames;

        const selectedPath = DOM.selectDataGroup.value;
        await updateDataMenu(selectedPath);
    } catch (error) {
        //console.error(`Errore nel processare il file EDX per ${filesetKey}:`, error);
    }

    await updateTimeSlider();
    updateSliderRanges();
}

// Aggiorna il display del percorso per il fileset
function updatePathDisplay(filesetKey) {
    const { rootDir } = state[filesetKey];
    const selectedPath = DOM.selectDataGroup.value;
    const fullPath = `${rootDir}/${selectedPath}`;
    DOM[`pathDisplay${filesetKey.slice(-1)}`].textContent = `Selected path: ${fullPath}`;
}

// Aggiorna i display dei percorsi per tutti i fileset
function updatePathDisplays() {
    const selectedPath = DOM.selectDataGroup.value;
    ['filesetA', 'filesetB'].forEach(filesetKey => {
        const fileset = state[filesetKey];
        if (fileset) {
            updatePathDisplay(filesetKey);
        }
    });
}

// Popola il menu a tendina del gruppo dati
function populateDataGroupDropdown(structure = FILE_STRUCTURE, prefix = '') {
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
function populateVariableDropdown(variableNames) {
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
async function updateDataMenu(selectedPath) {
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
function updateSliderRanges() {
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

// Aggiorna il cursore del tempo
function updateTimeSlider() {
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

// Aggiorna l'etichetta del tempo
function updateTimeLabel() {
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

// Aggiorna i pulsanti di incremento/decremento del tempo
function updateTimeButtons() {
    if (!DOM.timeDecrementBtn || !DOM.timeIncrementBtn || !DOM.timeSlider) {
        //console.error("Elementi necessari per updateTimeButtons non trovati!");
        return;
    }
    DOM.timeDecrementBtn.disabled = parseInt(DOM.timeSlider.value) <= parseInt(DOM.timeSlider.min);
    DOM.timeIncrementBtn.disabled = parseInt(DOM.timeSlider.value) >= parseInt(DOM.timeSlider.max);
}
// Aggiorna l'etichetta del livello
function updateLevelLabel() {
    updateSliderLabel('levelSlider', 'levelLabel', (value) => {
        const metersValue = calculateMetersValue(value, state.spacing?.z || []);
        return `${value} (${metersValue.toFixed(2)}m)`;
    });
}

function updateLegendScale() {
    Object.values(chartInstances).forEach(chart => {
        if (chart && typeof chart.setOption === 'function') {
            const option = chart.getOption();
            const visualMap = option.visualMap[0];

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

// Aggiorna l'etichetta della sezione X
function updateSectionXLabel() {
    updateSliderLabel('sectionXSlider', 'sectionXLabel', (value) => {
        const metersValue = calculateMetersValue(value, state.spacing?.x || []);
        return `${value} (${metersValue.toFixed(2)}m)`;
    });
}
// Aggiorna l'etichetta della sezione Y
function updateSectionYLabel() {
    updateSliderLabel('sectionYSlider', 'sectionYLabel', (value) => {
        const metersValue = calculateMetersValue(value, state.spacing?.y || []);
        return `${value} (${metersValue.toFixed(2)}m)`;
    });
}
// Aggiorna l'etichetta dell'opacità del vento
function updateWindOpacityLabel() {
    updateSliderLabel('windOpacitySlider', 'windOpacityLabel', (value) => `${value}%`);
}

// Aggiorna l'etichetta dell'animazione del vento
function updateWindAnimationLabel() {
    updateSliderLabel('windAnimationSlider', 'windAnimationLabel', (value) => `${value}%`);
}

// Aggiorna l'etichetta della densità del vento
function updateWindDensityLabel() {
    updateSliderLabel('windDensitySlider', 'windDensityLabel', (value) => `${value}%`);
}
function updateAllLabels() {
    updateTimeLabel();
    updateLevelLabel();
    updateSectionXLabel();
    updateSectionYLabel();
    updateWindOpacityLabel();
    updateWindAnimationLabel();
    updateWindDensityLabel();
}
// Aggiorna la rotazione del bottone del toggle
function updateButtonRotation() {
    const container = document.querySelector('.container');
    const toggleButton = document.getElementById('toggle-sidebar');
    const toggleIcon = toggleButton.querySelector('.material-icons');
    const isMobile = window.innerWidth <= 768;
    const isSidebarVisible = !container.classList.contains('sidebar-hidden');

    if (isMobile) {
        if (isSidebarVisible) {
            toggleIcon.style.transform = 'rotate(90deg)';
        } else {
            toggleIcon.style.transform = 'rotate(-90deg)';
        }
    } else {
        toggleIcon.style.transform = isSidebarVisible ? 'rotate(0deg)' : 'rotate(180deg)';
    }
}

/************         Funzioni di gestione degli eventi         ************/


// Gestisce il cambio di gruppo dati
async function handleDataGroupChange() {
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
        //console.warn("Nessun dato disponibile per il percorso selezionato.");
    }
}

// Gestione del cambio dello slider del tempo
async function handleTimeSliderChange() {
    updateTimeLabel();
    updateTimeButtons();
    await updateVisualization('filesetA');
    await updateVisualization('filesetB');
}
// Gestione del cambio dello slider del livello
function handleLevelSliderChange() {
    updateLevelLabel();
    updateVisualization('filesetA');
    updateVisualization('filesetB');
}

// Gestisce il cambio dello slider della sezione X
async function handleSectionXSliderChange() {
    updateSectionXLabel();
    await updateVisualization('filesetA');
    await updateVisualization('filesetB');
}


// Gestione del cambio dello slider della sezione Y
async function handleSectionYSliderChange() {
    updateSectionYLabel();
    await updateVisualization('filesetA');
    await updateVisualization('filesetB');
}
function handleColorSchemeChange() {
    const [category, paletteNumber] = DOM.colorPaletteSelector.value.split('|');
    selectedPalette = COLOR_PALETTES[category][paletteNumber];
    //console.log("Color palette changed:", selectedPalette);
    updateVisualization('filesetA');
    updateVisualization('filesetB');
}
// Gestione del cambio dell'opacità del vento
function handleWindOpacityChange() {
    //console.log("Wind opacity:", DOM.windOpacitySlider.value);
    updateVisualization('filesetA');
    updateVisualization('filesetB');
}

// Gestione del cambio dell'animazione del vento
function handleWindAnimationChange() {
    //console.log("Wind animation:", DOM.windAnimationSlider.value);
    updateVisualization('filesetA');
    updateVisualization('filesetB');
}

// Gestione del cambio della densità del vento
function handleWindDensityChange() {
    //console.log("Wind density", DOM.windDensitySlider.value);
    updateVisualization('filesetA');
    updateVisualization('filesetB');
}

// Gestione del salvataggio dei preset
function handleSavePreset() {
    //console.log("Saving preset");
    // Implementare la logica per salvare il preset
}


// Gestione del toggle "Follow Terrain"
async function handleFollowTerrainToggle() {
    if (!DOM.followTerrainToggle) {
        //console.error("Elemento 'followTerrainToggle' non trovato. Impossibile gestire il toggle.");
        return;
    }

    handleToggleButton(DOM.followTerrainToggle, async (isEnabled) => {
        //console.log("Follow terrain:", isEnabled);
        if (isEnabled) {
            state.terrainDataA = await loadTerrainData('filesetA');
            state.terrainDataB = state.filesetB ? await loadTerrainData('filesetB') : null;

            if (!state.terrainDataA && (!state.filesetB || !state.terrainDataB)) {
                //console.warn("Impossibile caricare i dati del terreno. La funzione 'Follow terrain' potrebbe non funzionare correttamente.");
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
    });
}

function handleDifferenceOrderToggle() {
    handleToggleButton(DOM.differenceOrderToggle, (isAMinusB) => {
        state.differenceOrder = isAMinusB ? 'A-B' : 'B-A';
        if (DOM.differenceOrderValue) {
            DOM.differenceOrderValue.textContent = state.differenceOrder;
        }
        updateVisualization('filesetA');
        updateVisualization('filesetB');
    });
}

// Gestione del cambio dei dati selezionati
function handleDataChange() {
    updateVisualization('filesetA');
    updateVisualization('filesetB');
}

// Gestione del resize della finestra
function handleResize() {
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

    updateButtonRotation();
}

function handleChartClick(viewType, xIndex, yIndex) {
    let updateNeeded = false;

    switch (viewType) {
        case 'level':
            if (DOM.sectionXSlider.value != xIndex || DOM.sectionYSlider.value != yIndex) {
                DOM.sectionXSlider.value = xIndex;
                DOM.sectionYSlider.value = yIndex;
                updateSectionXLabel();
                updateSectionYLabel();
                updateNeeded = true;
            }
            break;
        case 'section-x':
            if (DOM.sectionYSlider.value != xIndex || DOM.levelSlider.value != yIndex) {
                DOM.sectionYSlider.value = xIndex;
                DOM.levelSlider.value = yIndex;
                updateSectionYLabel();
                updateLevelLabel();
                updateNeeded = true;
            }
            break;
        case 'section-y':
            if (DOM.sectionXSlider.value != xIndex || DOM.levelSlider.value != yIndex) {
                DOM.sectionXSlider.value = xIndex;
                DOM.levelSlider.value = yIndex;
                updateSectionXLabel();
                updateLevelLabel();
                updateNeeded = true;
            }
            break;
    }

    if (updateNeeded) {
        // Aggiorniamo immediatamente tutte le visualizzazioni
        updateVisualization('filesetA');
        updateVisualization('filesetB');

        // Se c'è una differenza da calcolare, aggiorniamola
        if (state.filesetA && state.filesetB) {
            updateVisualization('filesetDiff');
        }
    }
}

/************         Funzioni di visualizzazione         ************/


function cleanupCharts(filesetKey) {
    const chartKeys = Object.keys(chartInstances).filter(key => key.startsWith(filesetKey));
    chartKeys.forEach(key => {
        if (chartInstances[key]) {
            chartInstances[key].dispose();
            delete chartInstances[key];
        }
    });
    // Non rimuovere i contenitori dei grafici qui
}


// Aggiorna la visualizzazione per un fileset
async function updateVisualization(filesetKey) {
    console.log(`Updating visualization for ${filesetKey}`);
    const selectedVariable = DOM.selectData.value;
    const level = parseInt(DOM.levelSlider.value);
    const sectionX = parseInt(DOM.sectionXSlider.value);
    const sectionY = parseInt(DOM.sectionYSlider.value);
    const selectedPath = DOM.selectDataGroup.value;
    const fileset = state[filesetKey];
    if (!fileset) {
        console.log(`Fileset ${filesetKey} non caricato`);
        return;
    }

    const files = getFilesInFolder(fileset.structure, selectedPath);
    const fileSeries = getFileCoupleSeries(files);
    if (fileSeries.length === 0) {
        console.error(`Nessun file trovato per ${filesetKey}`);
        return;
    }

    const currentTimeIndex = parseInt(DOM.timeSlider.value);
    const edtFile = fileSeries[currentTimeIndex].EDT;
    const edxInfo = await readEDXFile(fileSeries[currentTimeIndex].EDX);

    if (!edtFile || !edxInfo) {
        console.error(`File EDT o informazioni EDX non disponibili per ${filesetKey}`);
        return;
    }

    const { x: nrXData, y: nrYData, z: nrZData } = state.dimensions;
    const spacing = state[filesetKey].edxData.spacing;

    const terrainData = state[`terrainData${filesetKey.slice(-1)}`];

    const levelSliceConfig = { level, sectionX: null, sectionY: null, terrainData, spacing };
    const sectionXSliceConfig = { level: null, sectionX: Math.min(sectionX, nrXData - 1), sectionY: null, terrainData, spacing };
    const sectionYSliceConfig = { level: null, sectionX: null, sectionY: Math.min(sectionY, nrYData - 1), terrainData, spacing };

    const [levelSliceData, sectionXSliceData, sectionYSliceData] = await Promise.all([
        readEDTFile(edtFile, edxInfo, selectedVariable, levelSliceConfig),
        readEDTFile(edtFile, edxInfo, selectedVariable, sectionXSliceConfig),
        readEDTFile(edtFile, edxInfo, selectedVariable, sectionYSliceConfig)
    ]);

    visualizeData(levelSliceData, state.dimensions, levelSliceConfig, selectedVariable, 'level', filesetKey);
    visualizeData(sectionXSliceData, state.dimensions, sectionXSliceConfig, selectedVariable, 'section-x', filesetKey);
    visualizeData(sectionYSliceData, state.dimensions, sectionYSliceConfig, selectedVariable, 'section-y', filesetKey);

    if (state.filesetA && state.filesetB && filesetKey === 'filesetB') {
        await calculateAndVisualizeDifference(selectedVariable, levelSliceConfig, sectionXSliceConfig, sectionYSliceConfig);
    }
    console.log(`Visualization updated for ${filesetKey}`);
}

function debugChartUpdates() {
    const originalVisualizeData = visualizeData;
    window.visualizeData = function (...args) {
        //console.log('visualizeData called with:', ...args);
        return originalVisualizeData.apply(this, args);
    };

    const originalUpdateVisualization = updateVisualization;
    window.updateVisualization = async function (...args) {
        //console.log('updateVisualization called with:', ...args);
        return await originalUpdateVisualization.apply(this, args);
    };
}




// Visualizza i dati sul canvas
function visualizeData(sliceData, dimensions, sliceConfig, variableName, viewType, filesetKey, differenceOrder) {
    const { level, sectionX, sectionY } = sliceConfig;

    let containerSelector;
    let viewTitle;
    let rowHeightsBase, columnWidthsBase;

    if (filesetKey === 'filesetDiff') {
        containerSelector = `#visualizationContainerDiff`;
    } else {
        containerSelector = `#visualizationContainer${filesetKey.slice(-1)}`;
    }

    // Configura le basi delle righe e delle colonne in base al tipo di vista
    switch (viewType) {
        case 'level':
            viewTitle = 'Plan View';
            rowHeightsBase = state.spacing.y;
            columnWidthsBase = state.spacing.x;
            break;
        case 'section-x':
            viewTitle = 'Longitudinal Section';
            rowHeightsBase = state.spacing.z;
            columnWidthsBase = state.spacing.y;
            break;
        case 'section-y':
            viewTitle = 'Transverse Section';
            rowHeightsBase = state.spacing.z;
            columnWidthsBase = state.spacing.x;
            break;
        default:
            viewTitle = 'Unknown View';
            rowHeightsBase = [];
            columnWidthsBase = [];
    }

    const visualizationContainer = document.querySelector(containerSelector);
    if (visualizationContainer) {

        // Aggiungi questa funzione all'inizio della funzione visualizeData
        function getTextColor() {
            return document.body.classList.contains('dark-mode') ? '#ffffff' : '#333333';
        }

        let chartContainer = visualizationContainer.querySelector(`.chart-container.${viewType}`);

        if (!chartContainer) {
            chartContainer = document.createElement('div');
            chartContainer.className = `chart-container ${viewType}`;
            visualizationContainer.appendChild(chartContainer);

            const titleElement = document.createElement('h3');
            titleElement.textContent = viewTitle;
            chartContainer.appendChild(titleElement);

            const chartDiv = document.createElement('div');
            chartDiv.className = 'echarts-container';
            chartDiv.style.width = '100vh';
            chartDiv.style.height = '400px';
            chartContainer.appendChild(chartDiv);
        }

        let chartDiv = chartContainer.querySelector('.echarts-container');

        // Memorizza le dimensioni originali se non sono già state salvate
        if (!chartDiv.hasAttribute('data-original-width')) {
            chartDiv.setAttribute('data-original-width', chartDiv.clientWidth);
            chartDiv.setAttribute('data-original-height', chartDiv.clientHeight);
        }

        // Usa le dimensioni originali per il ridimensionamento
        const originalWidth = parseInt(chartDiv.getAttribute('data-original-width'));
        const originalHeight = parseInt(chartDiv.getAttribute('data-original-height'));
        const scaledWidth = originalWidth * state.scaleFactor;
        const scaledHeight = originalHeight * state.scaleFactor;

        chartDiv.style.width = `${scaledWidth}px`;
        chartDiv.style.height = `${scaledHeight}px`;

        // Gestione delle istanze ECharts
        const chartKey = `${filesetKey}-${viewType}`;
        if (chartInstances[chartKey]) {
            chartInstances[chartKey].dispose();
        }

        // Calcola le dimensioni totali in base alle spaziature
        const rowHeights = rowHeightsBase.map(height => height);
        const columnWidths = columnWidthsBase.map(width => width);
        const totalHeight = rowHeights.reduce((a, b) => a + b, 0);
        const totalWidth = columnWidths.reduce((a, b) => a + b, 0);

        // Prepara i dati per ECharts
        let data = [];
        let xAxis, yAxis;

        if (viewType === 'level') {
            xAxis = Array.from({ length: dimensions.x }, (_, i) => i);
            yAxis = Array.from({ length: dimensions.y }, (_, i) => i);

            data = new Array(dimensions.x * dimensions.y);
            let dataIndex = 0;

            for (let y = 0; y < dimensions.y; y++) {
                for (let x = 0; x < dimensions.x; x++) {
                    const value = sliceData[y * dimensions.x + x];
                    if (value !== null) {
                        data[dataIndex++] = [x, y, value];
                    }
                }
            }
            data.length = dataIndex;
        } else if (viewType === 'section-x') {
            xAxis = Array.from({ length: dimensions.y }, (_, i) => i);
            yAxis = Array.from({ length: dimensions.z }, (_, i) => i);

            data = new Array(dimensions.y * dimensions.z);
            let dataIndex = 0;

            for (let z = 0; z < dimensions.z; z++) {
                for (let y = 0; y < dimensions.y; y++) {
                    const value = sliceData[z * dimensions.y + y];
                    if (value !== null) {
                        data[dataIndex++] = [y, z, value];
                    }
                }
            }
            data.length = dataIndex;
        } else if (viewType === 'section-y') {
            xAxis = Array.from({ length: dimensions.x }, (_, i) => i);
            yAxis = Array.from({ length: dimensions.z }, (_, i) => i);

            data = new Array(dimensions.x * dimensions.z);
            let dataIndex = 0;

            for (let z = 0; z < dimensions.z; z++) {
                for (let x = 0; x < dimensions.x; x++) {
                    const value = sliceData[z * dimensions.x + x];
                    if (value !== null) {
                        data[dataIndex++] = [x, z, value];
                    }
                }
            }
            data.length = dataIndex;
        }

        // Calcola i valori min e max
        let minValue = Infinity;
        let maxValue = -Infinity;
        for (let i = 0; i < data.length; i++) {
            const value = data[i][2];
            if (value < minValue) minValue = value;
            if (value > maxValue) maxValue = value;
        }

        // Imposta l'opzione ECharts
        const option = {

            tooltip: {
                trigger: 'item',
                formatter: function (params) {
                    const xValue = params.value[0].toFixed(0);
                    const yValue = params.value[1].toFixed(0);
                    const actualValue = params.value[2].toFixed(2);
                    return `X: ${xValue}<br />Y: ${yValue}<br />Valore: ${actualValue}`;
                }
            },

       

            xAxis: {
                type: 'value',
                min: 0,
                max: totalWidth,
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { show: false },
                axisLabel: { show: false }
            },
            yAxis: {
                type: 'value',
                min: 0,
                max: totalHeight,

                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { show: false },
                axisLabel: { show: false }
            },
            visualMap: {
                min: minValue,
                max: maxValue,
                calculable: true,
                orient: 'vertical',
                left: 0,
                top: 0,
                inRange: {
                    color: selectedPalette
                },
                textStyle: {
                    color: getTextColor(),
                    fontSize: 11 * state.scaleFactor
                },
                itemWidth: 20 * state.scaleFactor,
                itemHeight: 140 * state.scaleFactor,
                formatter: function (value) {
                    return value.toFixed(2);  // Formatta i valori con 2 decimali
                },

            },
            series: [{
                type: 'custom',
                renderItem: (params, api) => {
                    const rowIndex = api.value(1);
                    const colIndex = api.value(0);

                    const startY = rowHeights.slice(0, rowIndex).reduce((a, b) => a + b, 0);
                    const startX = columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0) + 90;

                    const width = columnWidths[colIndex] * state.scaleFactor;
                    const height = rowHeights[rowIndex] * state.scaleFactor;

                    return {
                        type: 'rect',
                        shape: {
                            x: startX * state.scaleFactor / 1.2,
                            y: (totalHeight - startY - rowHeights[rowIndex]) * state.scaleFactor / 1.2,
                            width: width * 1.05,
                            height: height * 1.05,
                        },
                        style: {
                            fill: api.visual('color'),
                        }
                    };
                },
                data: data
            }]
        };

        // Inizializza il grafico con le dimensioni scalate
        const myChart = echarts.init(chartDiv, null, {
            width: scaledWidth,
            height: scaledHeight,
            renderer: 'svg'
        });
        chartInstances[chartKey] = myChart;

        myChart.setOption(option);

        // Aggiungi un evento click per il grafico
        myChart.on('click', function (params) {
            if (params.componentType === 'series') {
                const [xIndex, yIndex] = params.data;
                //console.log(`Clicked Rectangle - X: ${xIndex}, Y: ${yIndex}`);
                handleChartClick(viewType, xIndex, yIndex);
            }
        });

        // Gestione del resize con pulizia
        const resizeListener = () => {
            if (chartInstances[chartKey]) {
                const newScaledWidth = chartDiv.clientWidth * state.scaleFactor;
                const newScaledHeight = chartDiv.clientHeight * state.scaleFactor;
                chartInstances[chartKey].resize({ width: newScaledWidth, height: newScaledHeight });
            }
        };
        window.addEventListener('resize', resizeListener);

        // Aggiungi una funzione per rimuovere l'event listener
        const cleanup = () => {
            window.removeEventListener('resize', resizeListener);
        };

        // Memorizza la funzione di pulizia per un uso futuro
        if (!window.chartCleanupFunctions) {
            window.chartCleanupFunctions = {};
        }
        window.chartCleanupFunctions[chartKey] = cleanup;

        // Aggiorna o crea l'infoDiv
        let infoDiv = chartContainer.querySelector('.info-div');
        if (!infoDiv) {
            infoDiv = document.createElement('div');
            infoDiv.className = 'info-div';
            chartContainer.appendChild(infoDiv);
        }
        infoDiv.textContent = `${variableName}, Min: ${minValue.toFixed(2)}, Max: ${maxValue.toFixed(2)}, Null values: ${sliceData.filter(v => v === null).length}`;
        if (filesetKey === 'filesetDiff') {
            infoDiv.textContent += `, Difference: ${differenceOrder}`;
        }
    } else {
        //console.error(`Container not found for ${filesetKey}. Selector: ${containerSelector}`);
    }
}

function resizeAllCharts() {
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

// Calcola e visualizza la differenza tra i fileset
async function calculateAndVisualizeDifference(selectedVariable, levelSliceConfig, sectionXSliceConfig, sectionYSliceConfig) {
    const filesetA = state.filesetA;
    const filesetB = state.filesetB;
    const selectedPath = DOM.selectDataGroup.value;

    const filesA = getFilesInFolder(filesetA.structure, selectedPath);
    const filesB = getFilesInFolder(filesetB.structure, selectedPath);
    const fileSeriesA = getFileCoupleSeries(filesA);
    const fileSeriesB = getFileCoupleSeries(filesB);

    if (fileSeriesA.length > 0 && fileSeriesB.length > 0) {
        const currentTimeIndex = parseInt(DOM.timeSlider.value);
        const edtFileA = fileSeriesA[currentTimeIndex].EDT;
        const edtFileB = fileSeriesB[currentTimeIndex].EDT;
        const edxInfoA = await readEDXFile(fileSeriesA[currentTimeIndex].EDX);
        const edxInfoB = await readEDXFile(fileSeriesB[currentTimeIndex].EDX);

        if (edtFileA && edtFileB && edxInfoA && edxInfoB) {
            const levelSliceDataA = await readEDTFile(edtFileA, edxInfoA, selectedVariable, { ...levelSliceConfig, terrainData: state.terrainDataA });
            const levelSliceDataB = await readEDTFile(edtFileB, edxInfoB, selectedVariable, { ...levelSliceConfig, terrainData: state.terrainDataB });
            const sectionXSliceDataA = await readEDTFile(edtFileA, edxInfoA, selectedVariable, sectionXSliceConfig);
            const sectionXSliceDataB = await readEDTFile(edtFileB, edxInfoB, selectedVariable, sectionXSliceConfig);
            const sectionYSliceDataA = await readEDTFile(edtFileA, edxInfoA, selectedVariable, sectionYSliceConfig);
            const sectionYSliceDataB = await readEDTFile(edtFileB, edxInfoB, selectedVariable, sectionYSliceConfig);

            const levelDiffData = calculateDifference(levelSliceDataA, levelSliceDataB);
            const sectionXDiffData = calculateDifference(sectionXSliceDataA, sectionXSliceDataB);
            const sectionYDiffData = calculateDifference(sectionYSliceDataA, sectionYSliceDataB);

            visualizeData(levelDiffData, state.dimensions, levelSliceConfig, selectedVariable, 'level', 'filesetDiff', state.differenceOrder);
            visualizeData(sectionXDiffData, state.dimensions, sectionXSliceConfig, selectedVariable, 'section-x', 'filesetDiff', state.differenceOrder);
            visualizeData(sectionYDiffData, state.dimensions, sectionYSliceConfig, selectedVariable, 'section-y', 'filesetDiff', state.differenceOrder);
        }
    }
}
// Calcola la differenza tra i dati di due fileset
function calculateDifference(dataA, dataB) {
    const length = Math.min(dataA.length, dataB.length);
    const isAMinusB = state.differenceOrder === 'A-B';

    // Riutilizza l'array result se possibile
    if (!this.resultArray || this.resultArray.length !== length) {
        this.resultArray = new Float32Array(length);
    }

    for (let i = 0; i < length; i++) {
        const valueA = dataA[i];
        const valueB = dataB[i];
        this.resultArray[i] = (valueA === null || valueB === null) ? null :
            (isAMinusB ? valueA - valueB : valueB - valueA);
    }

    return this.resultArray;
}

function incrementTime() {
    if (!DOM.timeSlider) {
        //console.error("Elemento timeSlider non trovato!");
        return;
    }
    changeSliderValue(DOM.timeSlider, true);
    handleTimeSliderChange();
}


function decrementTime() {
    if (!DOM.timeSlider) {
        //console.error("Elemento timeSlider non trovato!");
        return;
    }
    changeSliderValue(DOM.timeSlider, false);
    handleTimeSliderChange();
}




/************         Funzioni di inizializzazione         ************/

// Inizializza i riferimenti al DOM e i selettori
function initializeDOMReferences() {
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
        //console.warn("Elemento 'followTerrainToggle' non trovato nel DOM. Alcune funzionalità potrebbero non funzionare correttamente.");
    }
}


function createPathDisplay() {
    // Crea e aggiunge i display dei percorsi
    DOM.pathDisplayA.className = 'path-display';
    DOM.pathDisplayB.className = 'path-display';
    DOM.buttonFilesetA.insertAdjacentElement('afterend', DOM.pathDisplayA);
    DOM.buttonFilesetB.insertAdjacentElement('afterend', DOM.pathDisplayB);
}

function initResizeListener() {
    window.addEventListener('resize', debounce(() => {
        updateChartContainers();
        resizeAllCharts();
    }, 250));
}



function initializeColorPaletteSelector() {
    const selectedPalette = document.querySelector('.selected-palette');
    const paletteOptions = document.querySelector('.palette-options');

    if (!selectedPalette || !paletteOptions) {
        //console.error("Elementi del selettore della palette di colori non trovati!");
        return;
    }

    selectedPalette.addEventListener('click', () => {
        paletteOptions.classList.toggle('show');
    });

    // Chiudi il selettore quando si clicca fuori
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.color-palette-selector')) {
            paletteOptions.classList.remove('show');
        }
    });

    populateColorPaletteSelector();
}

function populateColorPaletteSelector() {
    const paletteSelector = document.querySelector('.color-palette-selector');
    const paletteOptions = paletteSelector.querySelector('.palette-options');

    if (!paletteSelector || !paletteOptions) {
        //console.error("Elementi del selettore della palette di colori non trovati!");
        return;
    }

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
    paletteOptions.addEventListener('click', handlePaletteSelection);
}


function handlePaletteSelection(event) {
    const option = event.target.closest('.palette-option');
    if (!option) return;

    const value = option.getAttribute('data-value');
    const [category, paletteNumber] = value.split('|');
    selectedPalette = COLOR_PALETTES[category][paletteNumber];

    const selectedPaletteName = document.querySelector('.selected-palette-name');
    if (selectedPaletteName) {
        selectedPaletteName.textContent = `${category} - Palette ${paletteNumber}`;
    }

    document.querySelector('.palette-options').classList.remove('show');

    //console.log("Color palette changed:", selectedPalette);
    updateVisualization('filesetA');
    updateVisualization('filesetB');
}


// Aggiunge i listener agli eventi
function addEventListeners() {

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
        DOM.levelSlider.addEventListener('change', handleLevelSliderChange);
    }

    if (DOM.sectionXSlider) {
        DOM.sectionXSlider.addEventListener('change', handleSectionXSliderChange);
    }

    if (DOM.sectionYSlider) {
        DOM.sectionYSlider.addEventListener('change', handleSectionYSliderChange);
    }

    if (DOM.followTerrainToggle) {
        DOM.followTerrainToggle.addEventListener('click', handleFollowTerrainToggle);
    } else {
        //console.warn("Impossibile aggiungere l'event listener per 'followTerrainToggle'. L'elemento non è stato trovato.");
    }


    if (DOM.windOpacitySlider) {
        DOM.windOpacitySlider.addEventListener('change', updateWindOpacityLabel);
    }

    if (DOM.windAnimationSlider) {
        DOM.windAnimationSlider.addEventListener('change', updateWindAnimationLabel);
    }

    if (DOM.windDensitySlider) {
        DOM.windDensitySlider.addEventListener('change', updateWindDensityLabel);
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
    const scaleSlider = document.getElementById('scaleSlider');
    if (scaleSlider) {
        scaleSlider.addEventListener('change', handleScaleChange);
    }
}

// Inizializza il toggle della sidebar
function initSidebarToggle() {
    const toggleButton = document.getElementById('toggle-sidebar');
    const container = document.querySelector('.container');



    toggleButton.addEventListener('click', () => {
        container.classList.toggle('sidebar-hidden');
        container.classList.toggle('sidebar-visible');
        updateButtonRotation();

        handleResize();

        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 300);
    });
}

// Inizializza il menu dei dati
async function initializeDataMenu() {
    if (!DOM.selectDataGroup || !DOM.selectData) {
        //console.error("Elementi select necessari non trovati!");
        return;
    }

    const selectedPath = DOM.selectDataGroup.value;
    await updateDataMenu(selectedPath);
    state.filesetA = null;
    state.filesetB = null;
}

// Funzione di inizializzazione
async function init() {
    initResizeListener();
    debugChartUpdates();
    const cleanup = () => {
        window.removeEventListener('resize', handleResize);
        cleanupCharts();
    };
    window.addEventListener('beforeunload', cleanup);

    initializeDOMReferences();
    createPathDisplay();
    initializeColorPaletteSelector(); // Questa è la chiamata corretta

    if (DOM.selectDataGroup) {
        await populateDataGroupDropdown();
        DOM.selectDataGroup.value = DOM.selectDataGroup.options[0].value;
    } else {
        //console.error("Elemento select per il gruppo di dati non trovato durante l'inizializzazione!");
    }

    addEventListeners();
    initSidebarToggle();
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
        updateLegendScale();
    }, 0);
    window.addEventListener('resize', debounce(resizeAllCharts, 250));
}




// Event listener per il caricamento del DOM
document.addEventListener('DOMContentLoaded', init);

// Gestione del tema scuro/chiaro
document.addEventListener('DOMContentLoaded', () => {
    const themeSwitcher = document.getElementById('theme-icon');

    const currentTheme = localStorage.getItem('theme') || 'light';
    document.body.classList.add(`${currentTheme}-mode`);
    themeSwitcher.classList.add(currentTheme === 'light' ? 'icon-sun' : 'icon-moon');

    themeSwitcher.addEventListener('click', () => {
        const isLight = document.body.classList.contains('light-mode');
        document.body.classList.toggle('light-mode', !isLight);
        document.body.classList.toggle('dark-mode', isLight);
        themeSwitcher.classList.toggle('icon-sun', !isLight);
        themeSwitcher.classList.toggle('icon-moon', isLight);

        localStorage.setItem('theme', isLight ? 'dark' : 'light');
        updateChartsTextColor();
    });
});
