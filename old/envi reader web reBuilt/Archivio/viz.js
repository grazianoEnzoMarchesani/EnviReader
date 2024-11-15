import { DOM } from './enviropment.js';
import { state } from './enviropment.js';
import { chartInstances } from './enviropment.js';

import { getFileCoupleSeries } from './fileMan.js';
import { getFilesInFolder } from './fileMan.js';
import { readEDTFile } from './fileMan.js';
import { readEDXFile } from './processing.js';
import { changeSliderValue } from './utils.js';

import { handleTimeSliderChange } from './events.js';
import { visualizeData } from './viz2.js';
import { visualizeTimeSeries } from './viz2.js';
import { resizeChartContainers } from './viz2.js';


/************         Funzioni di visualizzazione         ************/
export function captureChartImage(chartKey) {
    return new Promise((resolve, reject) => {
        const chart = chartInstances[chartKey];
        if (!chart) {
            reject(new Error(`Chart non trovato per la chiave ${chartKey}`));
            return;
        }

        const container = chart.getDom().closest('.chart-container');
        if (!container) {
            reject(new Error('Container del chart non trovato'));
            return;
        }

        // Utilizziamo html2canvas per catturare l'intero container del chart
        html2canvas(container, {
            logging: false, // Disabilita il logging per migliorare le prestazioni
            useCORS: true, // Abilita CORS per le immagini esterne
            scale: window.devicePixelRatio // Usa il pixel ratio del dispositivo per una migliore qualità
        }).then(canvas => {
            resolve(canvas.toDataURL('image/png'));
        }).catch(error => {
            //console.error('Errore durante la cattura del chart:', error);
            reject(error);
        });
    });
}

export async function captureAllCharts() {
    const chartImages = [];
    for (const chartKey in chartInstances) {
        try {
            const imageDataUrl = await captureChartImage(chartKey);
            chartImages.push({ key: chartKey, dataUrl: imageDataUrl });
        } catch (error) {
            //console.error(`Errore nella cattura dell'immagine per ${chartKey}:`, error);
        }
    }
    return chartImages;
}


export function cleanupCharts(filesetKey) {
    const chartKeys = Object.keys(chartInstances).filter(key => key.startsWith(filesetKey));
    chartKeys.forEach(key => {
        if (chartInstances[key]) {
            chartInstances[key].dispose();
            delete chartInstances[key];
        }
    });
    if (filesetKey === 'filesetA' || filesetKey === 'filesetB') {
        if (chartInstances['timeSeries']) {
            chartInstances['timeSeries'].dispose();
            delete chartInstances['timeSeries'];
        }
    }
}
// Aggiorna la visualizzazione per un fileset
export async function updateVisualization(filesetKey, viewType = 'all') {
    console.log(`Updating visualization for ${filesetKey}, viewType: ${viewType}`);
    const selectedVariable = DOM.selectData.value;
    const level = parseInt(DOM.levelSlider.value);
    const sectionX = parseInt(DOM.sectionXSlider.value);
    const sectionY = parseInt(DOM.sectionYSlider.value);
    const selectedPath = DOM.selectDataGroup.value;
    const scaleType = document.getElementById('scaleType').value;

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
    console.log(nrXData, nrYData, nrZData);
    const spacing = state[filesetKey].edxData.spacing;

    const terrainData = state[`terrainData${filesetKey.slice(-1)}`];

    const levelSliceConfig = { level, sectionX: null, sectionY: null, terrainData, spacing };
    const sectionXSliceConfig = { level: null, sectionX: Math.min(sectionX, nrXData - 1), sectionY: null, terrainData, spacing };
    const sectionYSliceConfig = { level: null, sectionX: null, sectionY: Math.min(sectionY, nrYData - 1), terrainData, spacing };

    let globalMinValue = Infinity;
    let globalMaxValue = -Infinity;

    const updateGlobalMinMax = (data) => {
        const validData = data.filter(v => v !== null && !isNaN(v));
        if (validData.length > 0) {
            globalMinValue = Math.min(globalMinValue, Math.min(...validData));
            globalMaxValue = Math.max(globalMaxValue, Math.max(...validData));
        }
    };

    if (scaleType === 'filesetGlobal' || scaleType === 'allFilesets' || scaleType === 'syncedViews') {
        const processFileset = async (fileset) => {
            const files = getFilesInFolder(fileset.structure, selectedPath);
            const fileSeries = getFileCoupleSeries(files);
            if (fileSeries.length > 0) {
                const edtFile = fileSeries[currentTimeIndex].EDT;
                const edxInfo = await readEDXFile(fileSeries[currentTimeIndex].EDX);
                updateGlobalMinMax(await readEDTFile(edtFile, edxInfo, selectedVariable, levelSliceConfig));
                updateGlobalMinMax(await readEDTFile(edtFile, edxInfo, selectedVariable, sectionXSliceConfig));
                updateGlobalMinMax(await readEDTFile(edtFile, edxInfo, selectedVariable, sectionYSliceConfig));
            }
        };

        if (scaleType === 'filesetGlobal') {
            await processFileset(fileset);
        } else if (scaleType === 'allFilesets' || scaleType === 'syncedViews') {
            await processFileset(state.filesetA);
            if (state.filesetB) {
                await processFileset(state.filesetB);
            }
        }
    }

    const getSyncedMinMax = async (viewType) => {
        let minValue = Infinity;
        let maxValue = -Infinity;

        const processFileset = async (fileset) => {
            const files = getFilesInFolder(fileset.structure, selectedPath);
            const fileSeries = getFileCoupleSeries(files);
            if (fileSeries.length > 0) {
                const edtFile = fileSeries[currentTimeIndex].EDT;
                const edxInfo = await readEDXFile(fileSeries[currentTimeIndex].EDX);
                let sliceConfig;
                switch (viewType) {
                    case 'level':
                        sliceConfig = { level, sectionX: null, sectionY: null, terrainData: state[`terrainData${fileset === state.filesetA ? 'A' : 'B'}`], spacing };
                        break;
                    case 'section-x':
                        sliceConfig = { level: null, sectionX: Math.min(sectionX, state.dimensions.x - 1), sectionY: null, terrainData: null, spacing };
                        break;
                    case 'section-y':
                        sliceConfig = { level: null, sectionX: null, sectionY: Math.min(sectionY, state.dimensions.y - 1), terrainData: null, spacing };
                        break;
                }
                const sliceData = await readEDTFile(edtFile, edxInfo, selectedVariable, sliceConfig);
                const validData = sliceData.filter(v => v !== null && !isNaN(v));
                if (validData.length > 0) {
                    minValue = Math.min(minValue, Math.min(...validData));
                    maxValue = Math.max(maxValue, Math.max(...validData));
                }
            }
        };

        await processFileset(state.filesetA);
        if (state.filesetB) {
            await processFileset(state.filesetB);
        }

        return { minValue, maxValue };
    };

    const visualizeSlice = async (sliceConfig, sliceType) => {
        const sliceData = await readEDTFile(edtFile, edxInfo, selectedVariable, sliceConfig);
        let minValue, maxValue;
        if (scaleType === 'syncedViews') {
            ({ minValue, maxValue } = await getSyncedMinMax(sliceType));
        } else if (scaleType === 'individual') {
            minValue = Math.min(...sliceData.filter(v => v !== null && !isNaN(v)));
            maxValue = Math.max(...sliceData.filter(v => v !== null && !isNaN(v)));
        } else {
            minValue = globalMinValue;
            maxValue = globalMaxValue;
        }
        visualizeData(sliceData, state.dimensions, sliceConfig, selectedVariable, sliceType, filesetKey, null, scaleType, minValue, maxValue);
    };

    if (viewType === 'all' || viewType === 'level') {
        await visualizeSlice(levelSliceConfig, 'level');
    }

    if (viewType === 'all' || viewType === 'section-x') {
        await visualizeSlice(sectionXSliceConfig, 'section-x');
    }

    if (viewType === 'all' || viewType === 'section-y') {
        await visualizeSlice(sectionYSliceConfig, 'section-y');
    }

    if (state.filesetA && state.filesetB && filesetKey === 'filesetB') {
        await calculateAndVisualizeDifference(selectedVariable, levelSliceConfig, sectionXSliceConfig, sectionYSliceConfig, viewType);
    }

    resizeChartContainers();
    
    console.log(`Visualization updated for ${filesetKey}`);
    if (filesetKey === 'filesetB' || (filesetKey === 'filesetA' && !state.filesetB)) {
        const selectedVariable = DOM.selectData.value;
        const selectedPath = DOM.selectDataGroup.value;
        
        const dataA = await readAllEDTFiles('filesetA', selectedPath, selectedVariable);
        const dataB = state.filesetB ? await readAllEDTFiles('filesetB', selectedPath, selectedVariable) : [];
        
        const timeSeriesData = prepareTimeSeriesData(dataA, dataB);
        visualizeTimeSeries(timeSeriesData, selectedVariable);
    }
}

// Calcola e visualizza la differenza tra i fileset
export async function calculateAndVisualizeDifference(selectedVariable, levelSliceConfig, sectionXSliceConfig, sectionYSliceConfig, viewType = 'all') {
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
            let globalMinDiff = Infinity;
            let globalMaxDiff = -Infinity;

            // Funzione per aggiornare i valori min e max globali della differenza
            const updateGlobalMinMaxDiff = (diffData) => {
                const validDiffData = diffData.filter(v => v !== null && !isNaN(v));
                if (validDiffData.length > 0) {
                    globalMinDiff = Math.min(globalMinDiff, Math.min(...validDiffData));
                    globalMaxDiff = Math.max(globalMaxDiff, Math.max(...validDiffData));
                }
            };

            // Calcola le differenze e aggiorna i valori min e max globali
            if (viewType === 'all' || viewType === 'level') {
                const levelSliceDataA = await readEDTFile(edtFileA, edxInfoA, selectedVariable, { ...levelSliceConfig, terrainData: state.terrainDataA });
                const levelSliceDataB = await readEDTFile(edtFileB, edxInfoB, selectedVariable, { ...levelSliceConfig, terrainData: state.terrainDataB });
                const levelDiffData = calculateDifference(levelSliceDataA, levelSliceDataB);
                updateGlobalMinMaxDiff(levelDiffData);
            }

            if (viewType === 'all' || viewType === 'section-x') {
                const sectionXSliceDataA = await readEDTFile(edtFileA, edxInfoA, selectedVariable, sectionXSliceConfig);
                const sectionXSliceDataB = await readEDTFile(edtFileB, edxInfoB, selectedVariable, sectionXSliceConfig);
                const sectionXDiffData = calculateDifference(sectionXSliceDataA, sectionXSliceDataB);
                updateGlobalMinMaxDiff(sectionXDiffData);
            }

            if (viewType === 'all' || viewType === 'section-y') {
                const sectionYSliceDataA = await readEDTFile(edtFileA, edxInfoA, selectedVariable, sectionYSliceConfig);
                const sectionYSliceDataB = await readEDTFile(edtFileB, edxInfoB, selectedVariable, sectionYSliceConfig);
                const sectionYDiffData = calculateDifference(sectionYSliceDataA, sectionYSliceDataB);
                updateGlobalMinMaxDiff(sectionYDiffData);
            }

            // Visualizza le differenze con i valori min e max globali
            if (viewType === 'all' || viewType === 'level') {
                const levelSliceDataA = await readEDTFile(edtFileA, edxInfoA, selectedVariable, { ...levelSliceConfig, terrainData: state.terrainDataA });
                const levelSliceDataB = await readEDTFile(edtFileB, edxInfoB, selectedVariable, { ...levelSliceConfig, terrainData: state.terrainDataB });
                const levelDiffData = calculateDifference(levelSliceDataA, levelSliceDataB);
                visualizeData(levelDiffData, state.dimensions, levelSliceConfig, selectedVariable, 'level', 'filesetDiff', state.differenceOrder, 'individual', globalMinDiff, globalMaxDiff);
            }

            if (viewType === 'all' || viewType === 'section-x') {
                const sectionXSliceDataA = await readEDTFile(edtFileA, edxInfoA, selectedVariable, sectionXSliceConfig);
                const sectionXSliceDataB = await readEDTFile(edtFileB, edxInfoB, selectedVariable, sectionXSliceConfig);
                const sectionXDiffData = calculateDifference(sectionXSliceDataA, sectionXSliceDataB);
                visualizeData(sectionXDiffData, state.dimensions, sectionXSliceConfig, selectedVariable, 'section-x', 'filesetDiff', state.differenceOrder, 'individual', globalMinDiff, globalMaxDiff);
            }

            if (viewType === 'all' || viewType === 'section-y') {
                const sectionYSliceDataA = await readEDTFile(edtFileA, edxInfoA, selectedVariable, sectionYSliceConfig);
                const sectionYSliceDataB = await readEDTFile(edtFileB, edxInfoB, selectedVariable, sectionYSliceConfig);
                const sectionYDiffData = calculateDifference(sectionYSliceDataA, sectionYSliceDataB);
                visualizeData(sectionYDiffData, state.dimensions, sectionYSliceConfig, selectedVariable, 'section-y', 'filesetDiff', state.differenceOrder, 'individual', globalMinDiff, globalMaxDiff);
            }
        }
    }
}

// Calcola la differenza tra i dati di due fileset
export function calculateDifference(dataA, dataB) {
    const length = Math.min(dataA.length, dataB.length);
    const isAMinusB = state.differenceOrder === 'A-B';

    const resultArray = new Float32Array(length);

    for (let i = 0; i < length; i++) {
        const valueA = dataA[i];
        const valueB = dataB[i];
        if (valueA === null || isNaN(valueA) || valueB === null || isNaN(valueB)) {
            resultArray[i] = null;
        } else {
            resultArray[i] = isAMinusB ? valueA - valueB : valueB - valueA;
        }
    }

    return resultArray;
}

// Calcola la differenza tra i dati di due fileset

export function incrementTime() {
    if (!DOM.timeSlider) {
        //console.error("Elemento timeSlider non trovato!");
        return;
    }
    changeSliderValue(DOM.timeSlider, true);
    handleTimeSliderChange();
}

export function decrementTime() {
    if (!DOM.timeSlider) {
        //console.error("Elemento timeSlider non trovato!");
        return;
    }
    changeSliderValue(DOM.timeSlider, false);
    handleTimeSliderChange();
}

async function readAllEDTFiles(filesetKey, selectedPath, selectedVariable) {
    const fileset = state[filesetKey];
    if (!fileset) return [];

    const files = getFilesInFolder(fileset.structure, selectedPath);
    const fileSeries = getFileCoupleSeries(files);
    const data = [];

    for (const filePair of fileSeries) {
        const edtFile = filePair.EDT;
        const edxFile = filePair.EDX;
        const edxInfo = await readEDXFile(edxFile);
        
        const level = parseInt(DOM.levelSlider.value);
        const sectionX = parseInt(DOM.sectionXSlider.value);
        const sectionY = parseInt(DOM.sectionYSlider.value);

        const sliceConfig = {
            level,
            sectionX,
            sectionY,
            terrainData: state[`terrainData${filesetKey.slice(-1)}`],
            spacing: state.spacing
        };

        const sliceData = await readEDTFile(edtFile, edxInfo, selectedVariable, sliceConfig);
        const value = sliceData[sectionY * state.dimensions.x + sectionX];
        
        // Estrai la data dal nome del file
        const dateMatch = edtFile.name.match(/(\d{4}-\d{2}-\d{2})(?:_(\d{2}\.\d{2}\.\d{2}))?/);
        const date = dateMatch ? dateMatch[1] : '';
        const time = dateMatch && dateMatch[2] ? dateMatch[2].replace(/\./g, ':') : '00:00:00';
        
        data.push({
            date: `${date}T${time}`,
            value: value !== null ? value : null
        });
    }

    return data;
}

function prepareTimeSeriesData(dataA, dataB) {
    const mergedData = dataA.map((item, index) => ({
        date: item.date,
        valueA: item.value,
        valueB: dataB[index] ? dataB[index].value : null
    }));

    return mergedData.sort((a, b) => new Date(a.date) - new Date(b.date));
}
