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

