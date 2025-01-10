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
        spacing: { x: spacingX, y: spacingY, z: spacingZ },
        sumSpacing: {
            x: spacingX.reduce((a, b) => a + b, 0),
            y: spacingY.reduce((a, b) => a + b, 0),
            z: spacingZ.reduce((a, b) => a + b, 0)
        }
    };

    // Aggiorna le dimensioni globali
    state.dimensions = { x: nrXData, y: nrYData, z: nrZData };
    state.spacing = { x: spacingX, y: spacingY, z: spacingZ };
    const sumDimensions = { x: nrXData, y: nrYData, z: nrZData };
    const sumSpacing = { 
        x: spacingX.reduce((a, b) => a + b, 0), 
        y: spacingY.reduce((a, b) => a + b, 0), 
        z: spacingZ.reduce((a, b) => a + b, 0) 
    };
    // console.log('Somma delle dimensioni:', sumDimensions);
    // console.log('Somma degli spazi:', sumSpacing);

    checkCongruence();
    logExtractedValues(filesetKey);

    return {
        variableNames: xmlDoc.querySelector("name_variables").textContent.split(',').map(name => name.trim()),
        nrVariables: parseInt(xmlDoc.querySelector("nr_variables").textContent),
        dimensions: { x: nrXData, y: nrYData, z: nrZData },
        sumDimensions,
        sumSpacing
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
export function extractSlice(dataView, dimensions, nrVariables, variableIndex, sliceConfig) {
    if (!dataView || !dimensions || !sliceConfig) {
        console.error('Parametri mancanti in extractSlice:', {
            hasDataView: !!dataView,
            hasDimensions: !!dimensions,
            hasSliceConfig: !!sliceConfig
        });
        return null;
    }

    try {
        const { level = null, sectionX = null, sectionY = null, terrainData = null } = sliceConfig;
        const { x: dimX, y: dimY, z: dimZ } = dimensions;
        
        if (!dimX || !dimY || !dimZ) {
            console.error('Dimensioni non valide:', dimensions);
            return null;
        }

        const bytesPerValue = 4;
        const totalDataPoints = dimX * dimY * dimZ;
        const variableOffset = variableIndex * totalDataPoints * bytesPerValue;

        let sliceData;
        let sliceLength;

        const processValue = (value) => {
            return (value === -999 || isNaN(value)) ? null : Number(value.toFixed(2));
        };

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
                sliceData[i] = processValue(value);
            }
        } else if (sectionX !== null) {
            sliceLength = dimY * dimZ;
            sliceData = new Array(sliceLength);
            for (let i = 0; i < sliceLength; i++) {
                const y = i % dimY;
                const z = Math.floor(i / dimY);
                const offset = variableOffset + ((z * dimY + y) * dimX + sectionX) * bytesPerValue;
                const value = dataView.getFloat32(offset, true);
                sliceData[i] = processValue(value);
            }
        } else if (sectionY !== null) {
            sliceLength = dimX * dimZ;
            sliceData = new Array(sliceLength);
            for (let i = 0; i < sliceLength; i++) {
                const x = i % dimX;
                const z = Math.floor(i / dimX);
                const offset = variableOffset + ((z * dimY + sectionY) * dimX + x) * bytesPerValue;
                const value = dataView.getFloat32(offset, true);
                sliceData[i] = processValue(value);
            }
        } else {
            console.error('Configurazione slice non valida:', sliceConfig);
            return null;
        }

        return sliceData;
    } catch (error) {
        console.error('Errore durante l\'estrazione dello slice:', error);
        return null;
    }
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

export function logWindData(windSpeed, windDirection, level, followTerrain, terrainData) {
    console.log('=== Wind Data Processing ===');
    console.log('Raw wind data:', {
        speedSample: windSpeed?.slice(0, 5),
        directionSample: windDirection?.slice(0, 5),
        level,
        followTerrain,
        hasTerrainData: !!terrainData
    });
    
    if (!windSpeed || !windDirection) {
        console.warn('Wind data missing');
        return;
    }

    let totalSpeed = 0;
    let totalDirection = 0;
    let count = 0;

    for (let i = 0; i < windSpeed.length; i++) {
        const speed = windSpeed[i];
        const direction = windDirection[i];

        if (isFinite(speed) && isFinite(direction) && speed !== -999 && direction !== -999 && !isNaN(speed) && !isNaN(direction)) {
            totalSpeed += speed;
            totalDirection += direction;
            count++;
        }
    }

    if (count > 0) {
        const avgSpeed = totalSpeed / count;
        const avgDirection = totalDirection / count;

        console.log('=== Dati del Vento ===');
        console.log(`Livello: ${level}`);
        console.log(`Velocità media: ${avgSpeed.toFixed(2)} m/s`);
        console.log(`Direzione media: ${avgDirection.toFixed(2)}°`);
        console.log(`Follow Terrain: ${followTerrain ? 'Attivo' : 'Disattivo'}`);
        console.log(`Numero di punti validi: ${count}`);
        console.log('==================');
    }
}

// Modifica nella funzione readEDTFile per supportare l'indice variabile specifico
export async function readEDTFile(file, edxInfo, selectedVariable, sliceConfig, variableIndex = null) {
    if (!file || !edxInfo || !sliceConfig) {
        console.error('Parametri mancanti in readEDTFile:', { file, edxInfo, sliceConfig });
        return null;
    }

    const cacheKey = `${file.name}-${selectedVariable}-${JSON.stringify(sliceConfig)}`;

    if (dataCache.has(cacheKey)) {
        return dataCache.get(cacheKey);
    }

    try {
        const buffer = await file.arrayBuffer();
        const dataView = new DataView(buffer);

        const { dimensions, nrVariables, variableNames } = edxInfo;
        
        // Usa l'indice fornito o cerca l'indice della variabile per nome
        const actualVariableIndex = variableIndex !== null ? 
            variableIndex : 
            variableNames.indexOf(selectedVariable);

        if (actualVariableIndex === -1) {
            console.error("Variabile non trovata:", selectedVariable);
            return null;
        }

        const sliceData = extractSlice(dataView, dimensions, nrVariables, actualVariableIndex, sliceConfig);
        
        if (!sliceData || !Array.isArray(sliceData)) {
            console.error('Dati slice non validi:', sliceData);
            return null;
        }

        // Ottimizzazione della cache
        const optimizedSliceData = new Float32Array(sliceData.length);
        for (let i = 0; i < sliceData.length; i++) {
            if (sliceData[i] === null || isNaN(sliceData[i])) {
                optimizedSliceData[i] = NaN;
            } else {
                optimizedSliceData[i] = Number(sliceData[i].toFixed(2));
            }
        }

        dataCache.set(cacheKey, optimizedSliceData);

        if (dataCache.size > 50) {
            const oldestKey = dataCache.keys().next().value;
            dataCache.delete(oldestKey);
        }

        return optimizedSliceData;
    } catch (error) {
        console.error('Errore in readEDTFile:', error);
        return null;
    }
}

export async function readWindData(file, edxInfo, sliceConfig) {
    if (!file || !edxInfo || !sliceConfig) {
        console.error('Parametri mancanti in readWindData');
        return null;
    }

    try {
        // Leggi velocità (indice 4) e direzione (indice 6) del vento
        const speedData = await readEDTFile(file, edxInfo, null, sliceConfig, 4);
        const directionData = await readEDTFile(file, edxInfo, null, sliceConfig, 6);

        if (!speedData || !directionData) {
            console.error('Errore nella lettura dei dati del vento');
            return null;
        }

        // Crea array degli indici validi (dove sia velocità che direzione hanno valori validi)
        const validIndices = [];
        const validSpeeds = [];
        const validDirections = [];

        for (let i = 0; i < speedData.length; i++) {
            const speed = speedData[i];
            const direction = directionData[i];

            if (isFinite(speed) && isFinite(direction) && 
                speed !== -999 && direction !== -999 && 
                !isNaN(speed) && !isNaN(direction)) {
                validIndices.push(i);
                validSpeeds.push(speed);
                validDirections.push(direction);
            }
        }

        logWindData(validSpeeds, validDirections, sliceConfig.level, 
                   sliceConfig.followTerrain, sliceConfig.terrainData);

        return {
            indices: validIndices,
            speed: validSpeeds,
            direction: validDirections
        };
    } catch (error) {
        console.error('Errore in readWindData:', error);
        return null;
    }
}
