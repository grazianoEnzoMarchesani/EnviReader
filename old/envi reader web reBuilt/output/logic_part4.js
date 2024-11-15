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
            chartDiv.style.width = '90vh';
            chartDiv.style.height = '500px';
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
                calculable: false,
                orient: 'vertical',
                left: 0,
                top: 0,
                inRange: {
                    color: selectedPalette
                },
                textStyle: {
                    color: getTextColor()
                }
            },
            series: [{
                type: 'custom',
                renderItem: (params, api) => {
                    const rowIndex = api.value(1);
                    const colIndex = api.value(0);

                    const startY = rowHeights.slice(0, rowIndex).reduce((a, b) => a + b, 0);
                    const startX = columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0)+100;

                    const width = columnWidths[colIndex] * state.scaleFactor;
                    const height = rowHeights[rowIndex] * state.scaleFactor;

                    return {
                        type: 'rect',
                        shape: {
                            x: startX * state.scaleFactor,
                            y: (totalHeight - startY - rowHeights[rowIndex]) * state.scaleFactor,
                            width: width*1.05,
                            height: height*1.05
                        },
                        style: {
                            fill: api.visual('color')
                        }
                    };
                },
                encode: {
                    x: 0,
                    y: 1
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