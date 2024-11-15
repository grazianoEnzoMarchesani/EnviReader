// src/utils.js

function getColormap(name) {
    const colormaps = {
        viridis: ['#440154', '#414487', '#2a788e', '#22a884', '#7ad151', '#fde725'],
        plasma: ['#0d0887', '#6a00a8', '#b12a90', '#e16462', '#fca636', '#f0f921'],
        inferno: ['#000004', '#420a68', '#932667', '#dd513a', '#fca50a', '#fcffa4'],
        magma: ['#000004', '#3b0f70', '#8c2981', '#de4968', '#fe9f6d', '#fcfdbf'],
        cividis: ['#00224e', '#123570', '#3b496c', '#575d6d', '#707880', '#919b91', '#b8b8aa', '#e1d4c0']
    };
    
    return colormaps[name] || colormaps.viridis;
}

function exportCSV(data) {
    let csvContent = "data:text/csv;charset=windows-1252,";
    data.forEach(row => {
        csvContent += row.join(",") + "\n";
    });
    return encodeURI(csvContent);
}

function exportImage(chart) {
    return chart.getDataURL({
        pixelRatio: 2,
        backgroundColor: '#fff'
    });
}

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
        const fileName = `saladiniPost_AT_${timeStr}.EDT`;
        console.log('Attempting to load file:', fileName);
        
        const file = await folder.getFileHandle(fileName);
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
    } catch (error) {
        console.error('Error loading wind data:', error);
    }

    console.log('Wind data loaded:', Object.keys(windData));
    return Object.keys(windData).length === windComponents.length ? windData : null;
}

// src/dataProcessors.js

function processEDXEDT(edxContent, edtContent) {
    const metadata = parseEDX(edxContent);
    const data = parseEDT(edtContent, metadata);
    return { metadata, data };
}

function parseEDX(arrayBuffer) {
    // Assumiamo che il file sia codificato in windows-1252. Se non funziona, prova con 'windows-1252' o 'iso-8859-1'
    const content = new TextDecoder('windows-1252').decode(arrayBuffer);
    const metadata = {
        data_type: parseInt(content.match(/<data_type>\s*(\d+)/)[1]),
        data_content: parseInt(content.match(/<data_content>\s*(\d+)/)[1]),
        nr_xdata: parseInt(content.match(/<nr_xdata>\s*(\d+)/)[1]),
        nr_ydata: parseInt(content.match(/<nr_ydata>\s*(\d+)/)[1]),
        nr_zdata: parseInt(content.match(/<nr_zdata>\s*(\d+)/)[1]),
    };

    const variablesMatch = content.match(/<variables>([\s\S]*?)<\/variables>/);
    if (variablesMatch) {
        const variablesContent = variablesMatch[1];
        metadata.nr_variables = parseInt(variablesContent.match(/<nr_variables>\s*(\d+)/)[1]);
        const nameVariablesMatch = variablesContent.match(/<name_variables>([\s\S]*?)<\/name_variables>/);
        if (nameVariablesMatch) {
            metadata.name_variables = nameVariablesMatch[1].split(',').map(name => {
                // Sostituisce il carattere di grado non valido con il simbolo ° corretto
                return name.trim().replace(/\xB0/g, '°');
            });
        } else {
            metadata.name_variables = [];
        }
    }

    return metadata;
}

function parseEDT(arrayBuffer, metadata) {
    const dataView = new DataView(arrayBuffer);
    const data = new Array(metadata.nr_variables);

    let offset = 0;
    for (let v = 0; v < metadata.nr_variables; v++) {
        data[v] = new Array(metadata.nr_zdata);
        for (let z = 0; z < metadata.nr_zdata; z++) {
            data[v][z] = new Array(metadata.nr_ydata);
            for (let y = 0; y < metadata.nr_ydata; y++) {
                data[v][z][y] = new Array(metadata.nr_xdata);
                for (let x = 0; x < metadata.nr_xdata; x++) {
                    data[v][z][y][x] = dataView.getFloat32(offset, true);
                    offset += 4;
                }
            }
        }
    }

    return data;
}

function processData(data, terrainData, zLevel, followTerrain) {
    const [nrVariables, nrZdata, nrYdata, nrXdata] = [
        data.length,
        data[0].length,
        data[0][0].length,
        data[0][0][0].length
    ];

    const processedData = new Array(nrVariables);

    for (let v = 0; v < nrVariables; v++) {
        processedData[v] = new Array(nrYdata);
        for (let y = 0; y < nrYdata; y++) {
            processedData[v][y] = new Array(nrXdata);
            for (let x = 0; x < nrXdata; x++) {
                let value;
                if (followTerrain && terrainData) {
                    const terrainZ = Math.floor(terrainData[y][x]);
                    const adjustedZ = Math.min(Math.max(zLevel + terrainZ, 0), nrZdata - 1);
                    value = data[v][adjustedZ][y][x];
                } else {
                    value = data[v][zLevel][y][x];
                }
                // Sostituiamo i valori nulli (-999) con null
                processedData[v][y][x] = value === -999 ? null : value;
            }
        }
    }

    return processedData;
}

// src/chartHandlers.js

function initializeChart() {
    return echarts.init(document.getElementById('chart'), null, {renderer: 'webgl'});
}


function updatePlot(chart, currentData, terrainData, metadata, variableIndex, zLevel, followTerrain, colormap, windData) {
    console.log('Updating plot with wind data:', windData);


    let plotData = processData(currentData, terrainData, zLevel, followTerrain)[variableIndex];
    const validData = plotData.flat().filter(value => value !== null);
    
    const rangeSettings = getRangeSettings();
    let visualMapMin, visualMapMax;

    if (rangeSettings.type === 'manual') {
        visualMapMin = rangeSettings.min;
        visualMapMax = rangeSettings.max;
    } else {
        if (validData.length > 0) {
            visualMapMin = Math.min(...validData);
            visualMapMax = Math.max(...validData);
        } else {
            visualMapMin = 0;
            visualMapMax = 1;
        }
    }

    // Calcola il rapporto di aspetto per mantenere i pixel quadrati
    const aspectRatio = metadata.nr_ydata / metadata.nr_xdata;

    const option = {
        title: {
            text: `${metadata.name_variables[variableIndex]} - Z-level: ${zLevel}`,
            left: 'center'
        },
        tooltip: {
            trigger: 'item',
            formatter: function(params) {
                if (params.seriesType === 'heatmap') {
                    return `X: ${params.data[0]}<br>Y: ${params.data[1]}<br>Value: ${params.data[2] !== null ? params.data[2].toFixed(2) : 'N/A'}`;
                } else if (params.seriesType === 'flowGL' || params.seriesType === 'custom') {
                    return `X: ${params.data[0]}<br>Y: ${params.data[1]}<br>U: ${params.data[2].toFixed(2)}<br>V: ${params.data[3].toFixed(2)}<br>Magnitude: ${params.data[4].toFixed(2)}`;
                }
            }
        },
        visualMap: [{
            min: visualMapMin,
            max: visualMapMax,
            calculable: true,
            realtime: false,
            inRange: {
                color: getColormap(colormap)
            },
            dimension: 2,
            seriesIndex: 0
        }],
        xAxis: {
            type: 'value',
            min: 0,
            max: metadata.nr_xdata - 1,
            axisLine: { lineStyle: { color: '#fff' } },
            splitLine: { show: false }
        },
        yAxis: {
            type: 'value',
            min: 0,
            max: metadata.nr_ydata - 1,
            inverse: true,
            axisLine: { lineStyle: { color: '#fff' } },
            splitLine: { show: false }
        },
        series: [{
            type: 'heatmap',
            data: plotData.flatMap((row, i) => 
                row.map((value, j) => [j, metadata.nr_ydata - 1 - i, value])
            ),
            emphasis: {
                itemStyle: {
                    borderColor: '#333',
                    borderWidth: 1
                }
            },
            progressive: 1000,
            animation: false
        }]
    };

    // Preparazione dei dati del vento
    if (windData && windData['Flow u (m/s)'] && windData['Flow v (m/s)']) {
        const uData = processData([windData['Flow u (m/s)']], terrainData, zLevel, followTerrain)[0];
        const vData = processData([windData['Flow v (m/s)']], terrainData, zLevel, followTerrain)[0];
        
        let windVectors = [];
        for (let i = 0; i < uData.length; i++) {
            for (let j = 0; j < uData[i].length; j++) {
                const u = uData[i][j];
                const v = vData[i][j];
                if (u !== null && v !== null) {
                    const mag = Math.sqrt(u * u + v * v);
                    windVectors.push([j, metadata.nr_ydata - 1 - i, u, -v, mag]);  // Nota il -v qui
                }
            }
        }

        // Calcola il range per la visualMap del vento
        let windValMin = Infinity;
        let windValMax = -Infinity;
        windVectors.forEach(vector => {
            windValMin = Math.min(windValMin, vector[4]);
            windValMax = Math.max(windValMax, vector[4]);
        });

        // Aggiungi la visualMap per il vento
        option.visualMap.push({
            show: false,
            min: windValMin,
            max: windValMax,
            dimension: 4,
            seriesIndex: 1,
            inRange: {
                color: [
                    '#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8',
                    '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026'
                ]
            }
        });

        // Aggiungi la serie flowGL per i vettori del vento
        option.series.push({
            type: 'flowGL',
            data: windVectors,
            particleDensity: 128,
            particleSize: 3,
            particleSpeed: 1,
            supersampling: 1,
            gridWidth: metadata.nr_xdata,
            gridHeight: metadata.nr_ydata,
            itemStyle: {
                opacity: 0.7
            },
            coordinateSystem: 'cartesian2d'
        });
    }

    // Imposta le dimensioni del grafico per mantenere i pixel quadrati
    const chartDom = document.getElementById('chart');
    const width = chartDom.offsetWidth;
    const height = width * aspectRatio;
    chart.resize({width: width, height: height});

    chart.setOption(option);
}

// src/uiHandlers.js

function updateControls(subfolders, availableTimes, metadata) {
    document.getElementById('controls').style.display = 'block';
    updateSubfolderSelect(subfolders);
    updateTimeSlider(availableTimes);
    updateVariableSelect(metadata);
    updateZLevelSlider(metadata);
    updateColormapSelect();
    setupRangeControls();
}

function updateSubfolderSelect(subfolders) {
    const select = document.getElementById('subfolderSelect');
    select.innerHTML = '<option value="">Select a subfolder</option>';
    subfolders.forEach(subfolder => {
        const option = document.createElement('option');
        option.value = subfolder;
        option.textContent = subfolder;
        select.appendChild(option);
    });
    select.disabled = false;
}

function updateTimeSlider(availableTimes) {
    const slider = document.getElementById('timeSlider');
    slider.max = availableTimes.length - 1;
    slider.value = 0;
    updateTimeDisplay(availableTimes[0]);
}

function updateTimeDisplay(time) {
    document.getElementById('timeDisplay').textContent = time;
}

function updateVariableSelect(metadata) {
    const select = document.getElementById('variableSelect');
    select.innerHTML = '';
    if (metadata && metadata.name_variables) {
        metadata.name_variables.forEach((variable, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = variable;
            select.appendChild(option);
        });
    }
}

function updateZLevelSlider(metadata) {
    const slider = document.getElementById('zLevelSlider');
    if (metadata && metadata.nr_zdata) {
        slider.max = metadata.nr_zdata - 1;
        slider.value = 0;
        updateZLevelDisplay(0);
    }
}

function updateZLevelDisplay(value) {
    document.getElementById('zLevelDisplay').textContent = value;
}

function updateColormapSelect() {
    const select = document.getElementById('colormapSelect');
    const colormaps = ['viridis', 'plasma', 'inferno', 'magma', 'cividis'];
    select.innerHTML = '';
    colormaps.forEach(colormap => {
        const option = document.createElement('option');
        option.value = colormap;
        option.textContent = colormap;
        select.appendChild(option);
    });
}

function setupRangeControls() {
    const rangeType = document.getElementById('rangeType');
    const manualRange = document.getElementById('manualRange');
    const minRange = document.getElementById('minRange');
    const maxRange = document.getElementById('maxRange');

    rangeType.addEventListener('change', function() {
        if (this.value === 'manual') {
            manualRange.style.display = 'block';
        } else {
            manualRange.style.display = 'none';
        }
        app.updatePlot();
    });

    minRange.addEventListener('change', () => app.updatePlot());
    maxRange.addEventListener('change', () => app.updatePlot());
}

function getRangeSettings() {
    const rangeType = document.getElementById('rangeType').value;
    if (rangeType === 'manual') {
        const minValue = document.getElementById('minRange').value;
        const maxValue = document.getElementById('maxRange').value;
        if (minValue !== '' && maxValue !== '') {
            return {
                type: 'manual',
                min: parseFloat(minValue),
                max: parseFloat(maxValue)
            };
        }
    }
    return { type: 'auto' };
}

function setupRangeControls() {
    const rangeType = document.getElementById('rangeType');
    const manualRange = document.getElementById('manualRange');
    const minRange = document.getElementById('minRange');
    const maxRange = document.getElementById('maxRange');

    rangeType.addEventListener('change', function() {
        if (this.value === 'manual') {
            manualRange.style.display = 'block';
            if (minRange.value === '' || maxRange.value === '') {
                // Se i valori non sono impostati, usa i valori correnti del grafico
                const currentRange = app.chart.getOption().visualMap[0];
                minRange.value = currentRange.min;
                maxRange.value = currentRange.max;
            }
        } else {
            manualRange.style.display = 'none';
        }
        app.updatePlot();
    });

    minRange.addEventListener('change', () => app.updatePlot());
    maxRange.addEventListener('change', () => app.updatePlot());
}

// src/app.js

const app = {
    mainFolder: null,
    subfolders: [],
    currentSubfolder: null,
    availableTimes: [],
    fileMapping: {},
    metadata: {},
    currentData: null,
    terrainData: null,
    windData: null,
    chart: null,

    async init() {
        this.setupEventListeners();
        this.chart = initializeChart();
        this.log('Application initialized');
    },

    setupEventListeners() {
        document.getElementById('selectFolder').addEventListener('click', () => this.selectMainFolder());
        document.getElementById('subfolderSelect').addEventListener('change', (e) => this.selectSubfolder(e.target.value));
        document.getElementById('timeSlider').addEventListener('input', (e) => this.updateTime(e.target.value));
        document.getElementById('variableSelect').addEventListener('change', () => this.updatePlot());
        document.getElementById('zLevelSlider').addEventListener('input', () => this.updatePlot());
        document.getElementById('followTerrain').addEventListener('change', () => this.updatePlot());
        document.getElementById('colormapSelect').addEventListener('change', () => this.updatePlot());
        document.getElementById('exportCSV').addEventListener('click', () => this.exportCSV());
        document.getElementById('exportImage').addEventListener('click', () => this.exportImage());
        document.getElementById('rangeType').addEventListener('change', () => this.updatePlot());
        document.getElementById('minRange').addEventListener('change', () => this.updatePlot());
        document.getElementById('maxRange').addEventListener('change', () => this.updatePlot());
    },

    async selectMainFolder() {
        if (this.folderSelectionInProgress) return;
        this.folderSelectionInProgress = true;
        try {
            this.mainFolder = await window.showDirectoryPicker();
            this.log('Main folder selected: ' + this.mainFolder.name);
            this.subfolders = await this.getSubfolders(this.mainFolder);
            this.updateSubfolderSelect();
        } catch (error) {
            if (error.name !== 'AbortError') {
                this.log('Error selecting folder: ' + error.message, 'error');
            }
        } finally {
            this.folderSelectionInProgress = false;
        }
    },

    async getSubfolders(folder) {
        const subfolders = [];
        for await (const entry of folder.values()) {
            if (entry.kind === 'directory') {
                subfolders.push(entry.name);
            }
        }
        return subfolders.sort((a, b) => a.localeCompare(b)); // Ordina alfabeticamente
    },

    updateSubfolderSelect() {
        updateSubfolderSelect(this.subfolders);
        this.log('Subfolder select updated with ' + this.subfolders.length + ' options');
    },

    async selectSubfolder(subfolderName) {
        try {
            this.log('Selecting subfolder: ' + subfolderName);
            this.currentSubfolder = await this.mainFolder.getDirectoryHandle(subfolderName);
            await this.scanSubfolder();
            this.terrainData = await loadTerrainData(this.mainFolder);
            updateControls(this.subfolders, this.availableTimes, this.metadata);
            this.log('Subfolder selected and data loaded');
        } catch (error) {
            this.log('Error selecting subfolder: ' + error.message, 'error');
        }
    },

    async scanSubfolder() {
        try {
            const { availableTimes, fileMapping } = await scanSubfolder(this.currentSubfolder);
            this.availableTimes = availableTimes;
            this.fileMapping = fileMapping;
            this.log('Subfolder scanned. Available times: ' + this.availableTimes.length);
            
            if (this.availableTimes.length > 0) {
                await this.loadData(this.availableTimes[0]);
            } else {
                this.log('No available times found in the subfolder', 'warn');
            }
        } catch (error) {
            this.log('Error scanning subfolder: ' + error.message, 'error');
        }
    },

    async updateTime(index) {
        updateTimeDisplay(this.availableTimes[index]);
        await this.loadData(this.availableTimes[index]);
        this.updatePlot();
    },

    async loadData(selectedTime) {
        try {
            const files = this.fileMapping[selectedTime];
            if (files.EDT && files.EDX) {
                this.log('Loading data for time: ' + selectedTime);
                const edxContent = await readFileContent(await this.currentSubfolder.getFileHandle(files.EDX));
                const edtContent = await readFileContent(await this.currentSubfolder.getFileHandle(files.EDT));
                const { metadata, data } = processEDXEDT(edxContent, edtContent);
                this.metadata = metadata;
                this.currentData = data;
                this.log('Data loaded successfully');
    
                // Inizializza windData a null
                this.windData = null;
    
                // Carica i dati del vento
                try {
                    this.log('Attempting to load wind data');
                    const atmosphereFolder = await this.mainFolder.getDirectoryHandle('atmosphere');
                    this.windData = await loadWindData(atmosphereFolder, selectedTime);
                    if (this.windData) {
                        this.log('Wind data loaded successfully');
                        this.logWindData(parseInt(document.getElementById('zLevelSlider').value));
                    } else {
                        this.log('No wind data available', 'warn');
                    }
                } catch (windError) {
                    this.log('Error loading wind data: ' + windError.message, 'warn');
                    console.error('Detailed wind error:', windError);
                }
            } else {
                this.log('Missing EDX or EDT file for time: ' + selectedTime, 'warn');
            }
        } catch (error) {
            this.log('Error loading data: ' + error.message, 'error');
            console.error('Detailed error:', error);
        }
    },



updatePlot() {
    if (!this.currentData) {
        this.log('No data available for plotting', 'warn');
        return;
    }

    try {
        const variableIndex = parseInt(document.getElementById('variableSelect').value);
        const zLevel = parseInt(document.getElementById('zLevelSlider').value);
        const followTerrain = document.getElementById('followTerrain').checked;
        const colormap = document.getElementById('colormapSelect').value;

        this.log('Updating plot. Variable: ' + variableIndex + ', Z-level: ' + zLevel + ', Follow Terrain: ' + followTerrain);

        updatePlot(this.chart, this.currentData, this.terrainData, this.metadata, variableIndex, zLevel, followTerrain, colormap, this.windData);
        if (this.windData) {
            this.logWindData(zLevel);
        }
        this.log('Plot updated successfully');
    } catch (error) {
        this.log('Error updating plot: ' + error.message, 'error');
    }
},

logWindData(zLevel) {
    if (this.windData && this.windData['Flow u (m/s)'] && this.windData['Flow v (m/s)'] && this.windData['Flow w (m/s)']) {
        const uData = processData([this.windData['Flow u (m/s)']], this.terrainData, zLevel, true)[0];
        const vData = processData([this.windData['Flow v (m/s)']], this.terrainData, zLevel, true)[0];
        const wData = processData([this.windData['Flow w (m/s)']], this.terrainData, zLevel, true)[0];

        let sumU = 0, sumV = 0, sumW = 0, count = 0;
        for (let i = 0; i < uData.length; i++) {
            for (let j = 0; j < uData[i].length; j++) {
                if (uData[i][j] !== null && vData[i][j] !== null && wData[i][j] !== null) {
                    sumU += uData[i][j];
                    sumV += vData[i][j];
                    sumW += wData[i][j];
                    count++;
                }
            }
        }

        if (count > 0) {
            const avgU = sumU / count;
            const avgV = sumV / count;
            const avgW = sumW / count;

            this.log(`Wind data at Z-level ${zLevel}:`);
            this.log(`Average U component: ${avgU.toFixed(2)} m/s`);
            this.log(`Average V component: ${avgV.toFixed(2)} m/s`);
            this.log(`Average W component: ${avgW.toFixed(2)} m/s`);
        } else {
            this.log('Wind data not available for this Z-level', 'warn');
        }
    } else {
        this.log('Wind data not available', 'warn');
    }
},

    exportCSV() {
        if (!this.currentData) {
            this.log('No data available for CSV export', 'warn');
            return;
        }

        try {
            const variableIndex = parseInt(document.getElementById('variableSelect').value);
            const zLevel = parseInt(document.getElementById('zLevelSlider').value);
            const followTerrain = document.getElementById('followTerrain').checked;
            const data = processData(this.currentData, this.terrainData, zLevel, followTerrain)[variableIndex];
            
            const csvContent = exportCSV(data);
            const link = document.createElement("a");
            link.setAttribute("href", csvContent);
            link.setAttribute("download", "export.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            this.log('CSV exported successfully');
        } catch (error) {
            this.log('Error exporting CSV: ' + error.message, 'error');
        }
    },

    exportImage() {
        try {
            const imageUrl = exportImage(this.chart);
            const link = document.createElement('a');
            link.download = 'chart.png';
            link.href = imageUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            this.log('Image exported successfully');
        } catch (error) {
            this.log('Error exporting image: ' + error.message, 'error');
        }
    },

    log(message, level = 'info') {
        const logElement = document.getElementById('log');
        const logEntry = document.createElement('div');
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${level.toUpperCase()}: ${message}`;
        logEntry.className = level;
        logElement.appendChild(logEntry);
        logElement.scrollTop = logElement.scrollHeight;
        console.log(`[${level.toUpperCase()}] ${message}`);
    }
};

// src/main.js

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

