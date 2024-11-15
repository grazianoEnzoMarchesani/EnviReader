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
        console.log('Searching for wind data in folder:', folder.name);
        const entries = await folder.values();
        for await (const entry of entries) {
            if (entry.kind === 'file' && entry.name.endsWith('.EDT')) {
                console.log('Processing file:', entry.name);
                const file = await folder.getFileHandle(entry.name);
                const content = await readFileContent(file);
                const edxFile = await folder.getFileHandle(entry.name.replace('.EDT', '.EDX'));
                const edxContent = await readFileContent(edxFile);
                const { metadata, data } = processEDXEDT(edxContent, content);
                
                console.log('Variables in file:', metadata.name_variables);
                
                let foundComponents = 0;
                for (const component of windComponents) {
                    const componentIndex = metadata.name_variables.indexOf(component);
                    if (componentIndex !== -1) {
                        console.log(`Found ${component} data at index ${componentIndex}`);
                        windData[component] = data[componentIndex];
                        foundComponents++;
                    }
                }

                if (foundComponents === windComponents.length) {
                    console.log('All wind components found in file:', entry.name);
                    break; // Abbiamo trovato tutti i componenti del vento
                }
            }
        }
    } catch (error) {
        console.error('Error scanning for wind data:', error);
    }

    console.log('Wind data loaded:', Object.keys(windData));
    return Object.keys(windData).length === windComponents.length ? windData : null;
}