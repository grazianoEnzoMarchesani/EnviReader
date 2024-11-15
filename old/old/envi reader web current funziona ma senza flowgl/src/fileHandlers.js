// src/fileHandlers.js

async function readFileContent(fileHandle) {
    const file = await fileHandle.getFile();
    return await file.arrayBuffer();
}

async function scanSubfolder(folder) {
    const availableTimes = [];
    const fileMapping = {};

    for await (const entry of folder.values()) {
        if (entry.kind === 'file' && (entry.name.endsWith('.EDT') || entry.name.endsWith('.EDX'))) {
            const match = entry.name.match(/_(\d{4}-\d{2}-\d{2}(?:_\d{2}\.\d{2}\.\d{2})?)\.(EDT|EDX)$/);
            if (match) {
                const [, timeStr, fileType] = match;
                if (!fileMapping[timeStr]) {
                    fileMapping[timeStr] = {};
                }
                fileMapping[timeStr][fileType] = entry.name;
                if (fileType === 'EDT') {
                    availableTimes.push(timeStr);
                }
            }
        }
    }

    availableTimes.sort();
    return { availableTimes, fileMapping };
}

async function loadTerrainData(mainFolder) {
    try {
        const groundFolder = await mainFolder.getDirectoryHandle('solaraccess', { create: false })
                                             .then(folder => folder.getDirectoryHandle('ground', { create: false }));
        
        let terrainFile = null;
        for await (const entry of groundFolder.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('.EDT')) {
                terrainFile = entry;
                break;
            }
        }
        
        if (!terrainFile) {
            console.error('No terrain EDT file found in solaraccess/ground folder');
            return null;
        }

        const terrainEDTContent = await readFileContent(terrainFile);
        const terrainEDXFile = await groundFolder.getFileHandle(terrainFile.name.replace('.EDT', '.EDX'));
        const terrainEDXContent = await readFileContent(terrainEDXFile);

        const { metadata, data } = processEDXEDT(terrainEDXContent, terrainEDTContent);

        if (data.length >= 4 && data[3].length > 0) {
            return data[3][0];
        } else {
            console.error('Terrain data not found in the expected location');
            return null;
        }
    } catch (error) {
        console.error('Error loading terrain data:', error);
        return null;
    }
}

async function loadWindData(folder, timeStr) {
    const windComponents = ['Flow u (m/s)', 'Flow v (m/s)', 'Flow w (m/s)'];
    const windData = {};

    try {
        console.log('Searching for wind data in folder:', folder.name, 'for time:', timeStr);
        
        // Prova prima con il nome del file 'saladiniPost_AT_'
        let fileName = `saladiniPost_AT_${timeStr}.EDT`;
        console.log('Attempting to load file:', fileName);
        
        let file;
        try {
            file = await folder.getFileHandle(fileName);
        } catch (error) {
            // Se non trova il file, prova con 'saladini_AT_'
            fileName = `saladini_AT_${timeStr}.EDT`;
            console.log('File not found. Attempting to load alternative file:', fileName);
            file = await folder.getFileHandle(fileName);
        }

        const content = await readFileContent(file);
        const edxFile = await folder.getFileHandle(fileName.replace('.EDT', '.EDX'));
        const edxContent = await readFileContent(edxFile);
        const { metadata, data } = processEDXEDT(edxContent, content);
        
        console.log('Variables in file:', metadata.name_variables);
        
        for (const component of windComponents) {
            const componentIndex = metadata.name_variables.indexOf(component);
            if (componentIndex !== -1) {
                console.log(`Found ${component} data at index ${componentIndex}`);
                windData[component] = data[componentIndex];
            }
        }

        // Preprocess wind data
        windData.processedData = preprocessWindData(windData, metadata.nr_zdata, metadata.nr_ydata, metadata.nr_xdata);
    } catch (error) {
        console.error('Error loading wind data:', error);
    }

    console.log('Wind data loaded:', Object.keys(windData));
    return Object.keys(windData).length > 0 ? windData : null;
}

function preprocessWindData(windData, nrZdata, nrYdata, nrXdata) {
    const processedData = new Array(nrZdata);
    for (let z = 0; z < nrZdata; z++) {
        processedData[z] = new Array(nrYdata);
        for (let y = 0; y < nrYdata; y++) {
            processedData[z][y] = new Array(nrXdata);
            for (let x = 0; x < nrXdata; x++) {
                const u = windData['Flow u (m/s)'][z][y][x];
                const v = windData['Flow v (m/s)'][z][y][x];
                const w = windData['Flow w (m/s)'][z][y][x];
                const mag = Math.sqrt(u*u + v*v + w*w);
                processedData[z][y][x] = {u, v, w, mag};
            }
        }
    }
    return processedData;
}