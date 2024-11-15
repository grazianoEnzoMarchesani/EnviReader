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
        sidebar.style.width = '320px';
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
    window.visualizeData = function(...args) {
        //console.log('visualizeData called with:', ...args);
        return originalVisualizeData.apply(this, args);
    };

    const originalUpdateVisualization = updateVisualization;
    window.updateVisualization = async function(...args) {
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