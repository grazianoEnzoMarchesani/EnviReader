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