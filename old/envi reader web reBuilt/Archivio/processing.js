import { state } from './enviropment.js';

/************         Funzioni di processamento dei dati        ************/

// Processa un file EDX e aggiorna lo stato
export async function processEDXFile(file, filesetKey) {
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
}


// Processa i dati di spaziatura
 export function   processSpacingData(spacingString) {
    const result = [];
    const numbers = spacingString.split(',');
    for (let i = 0; i < numbers.length; i++) {
        result.push(Number(parseFloat(numbers[i].trim()).toFixed(2)));
    }
    return result;
}
// Legge un file EDX
export async  function   readEDXFile(file) {
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
export function   extractSlice(dataView, dimensions, nrVariables, variableIndex, sliceConfig) {
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


// Legge il contenuto di un file
export function   readFileContent(file) {
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
    const { edxData } = state[filesetKey];
    if (!edxData) {
        //console.warn(`Dati EDX non disponibili per ${filesetKey}`);
        return;
    }

    const { nrXData, nrYData, nrZData, spacing } = edxData;

    //console.log(`Valori estratti per ${filesetKey}:`);
    //console.log(`nr_xdata: ${nrXData}`);
    //console.log(`nr_ydata: ${nrYData}`);
    //console.log(`nr_zdata: ${nrZData}`);
    //console.log(`spacing_x: ${spacing?.x?.join(', ') || 'Non disponibile'}`);
    //console.log(`spacing_y: ${spacing?.y?.join(', ') || 'Non disponibile'}`);
    //console.log(`spacing_z: ${spacing?.z?.join(', ') || 'Non disponibile'}`);
}


// Verifica la congruenza tra i fileset
export function   checkCongruence() {
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
        //console.log('Non Ã¨ possibile verificare la congruenza: dati mancanti');
    }
}

// Confronta due array
export function   arraysEqual(a, b) {
    if (!a || !b) return false;
    return a.length === b.length && a.every((val, index) => val === b[index]);
}
