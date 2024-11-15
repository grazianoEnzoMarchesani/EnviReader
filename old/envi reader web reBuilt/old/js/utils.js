import {state} from './config.js';



/************         Funzioni di utilità         ************/

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
    //console.warn('Questo browser non supporta l\'API File System Access. Alcune funzionalità potrebbero non funzionare correttamente.');
    // Qui potresti implementare un fallback o mostrare un messaggio all'utente
}

// Funzione di utilità per selezionare elementi DOM in modo sicuro
export function safeQuerySelector(selector) {
    const element = document.querySelector(selector);
    if (!element) {
        //console.warn(`Elemento non trovato: ${selector}`);
    }
    return element;
}
// Funzione per formattare l'etichetta dello slider
export function formatSliderLabel(title, value, unit = '') {
    return `
        <span style="font-family: Helvetica, Arial, sans-serif; font-weight: bold;">${title}</span>
        <span style="font-family: Helvetica, Arial, sans-serif; font-weight: 300; font-style: italic; font-size: 0.9em;">${value}${unit}</span>
    `;
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

function handleScaleChange(event) {
    state.scaleFactor = parseFloat(event.target.value);
    document.getElementById('scaleValue').textContent = state.scaleFactor.toFixed(1) + 'x';
    updateChartContainers();
    resizeAllCharts();
    updateLegendScale(); // Aggiungi questa riga
}


export function changeSliderValue(slider, increment = true) {
    const currentValue = parseInt(slider.value);
    const limitValue = increment ? parseInt(slider.max) : parseInt(slider.min);

    if ((increment && currentValue < limitValue) || (!increment && currentValue > limitValue)) {
        slider.value = currentValue + (increment ? 1 : -1);
        slider.dispatchEvent(new Event('change'));
    }
}
// Confronta due array
export function arraysEqual(a, b) {
    if (!a || !b) return false;
    return a.length === b.length && a.every((val, index) => val === b[index]);
}

// Verifica se il toggle "Follow Terrain" è abilitato
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
// Legge il contenuto di un file
export function readFileContent(file) {
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
export function logExtractedValues(filesetKey) {
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
export function checkCongruence() {
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
export function logSelectedFileCouples(selectedPath, selectedCoupleA, selectedCoupleB, filesetA, filesetB) {
    //console.log('Selected file couples:');

    if (selectedCoupleA) {
        const edtPathA = getFullPath(filesetA, selectedPath, selectedCoupleA.EDT.name);
        const edxPathA = getFullPath(filesetA, selectedPath, selectedCoupleA.EDX.name);
        console.log(edtPathA);
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