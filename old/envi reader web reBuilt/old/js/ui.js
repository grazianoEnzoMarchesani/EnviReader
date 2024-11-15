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