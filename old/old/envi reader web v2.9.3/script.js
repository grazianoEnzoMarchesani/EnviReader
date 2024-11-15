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

// src/dataProcessors.js

function processEDXEDT(edxContent, edtContent) {
    const metadata = parseEDX(edxContent);
    const data = parseEDT(edtContent, metadata);
    return { metadata, data };
}

function parseEDX(arrayBuffer) {
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
                processedData[v][y][x] = value === -999 ? null : value;
            }
        }
    }

    return processedData;
}

function processWindData(windSpeed, windDirection, zLevel, followTerrain, terrainData) {
    const windData = [];

    if (!windSpeed || !windDirection) {
        console.error('Wind data is missing');
        return windData;
    }

    const [nrZdata, nrYdata, nrXdata] = [
        windSpeed.length,
        windSpeed[0].length,
        windSpeed[0][0].length
    ];

    for (let y = 0; y < nrYdata; y++) {
        for (let x = 0; x < nrXdata; x++) {
            let z = zLevel;
            if (followTerrain && terrainData) {
                const terrainZ = Math.floor(terrainData[y][x]);
                z = Math.min(Math.max(zLevel + terrainZ, 0), nrZdata - 1);
            }

            if (windSpeed[z] && windSpeed[z][y] && windSpeed[z][y][x] !== undefined &&
                windDirection && windDirection[z] && windDirection[z][y] && windDirection[z][y][x] !== undefined) {
                
                const speed = windSpeed[z][y][x];
                const direction = windDirection[z][y][x];

                if (isFinite(speed) && isFinite(direction) && speed !== -999 && direction !== -999) {
                    const dirRad = (direction * Math.PI) / 180;
                    const u = -speed * Math.sin(dirRad);
                    const v = -speed * Math.cos(dirRad);

                    if (isFinite(u) && isFinite(v)) {
                        windData.push([x, nrYdata - 1 - y, u, v, speed]);
                    }
                }
            } else {
                console.warn(`Missing data at coordinates (x: ${x}, y: ${y}, z: ${z})`);
            }
        }
    }

    return windData;
}

// src/chartHandlers.js

function initializeChart() {
    const chartContainer = document.getElementById('chart');
    
    // Imposta dimensioni esplicite per il contenitore
    chartContainer.style.width = '100px';
    chartContainer.style.height = '1000px'; // Puoi modificare questo valore secondo le tue esigenze

    const chart = echarts.init(chartContainer);
    chart.setOption({
        backgroundColor: '#fff',
    });
    return chart;
}


function handleResize() {
    if (app.chart) {
        app.chart.resize();
    }
}

window.addEventListener('resize', () => {
    if (app.chart && app.metadata) {
        app.forceChartResize();
        app.updatePlot(false);  // Aggiorna il plot senza ridimensionare nuovamente
    }
});

function updatePlot(chart, currentData, terrainData, metadata, variableIndex, zLevel, followTerrain, colormap, windData, windOptions) {
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

    const aspectRatio = metadata.nr_ydata / metadata.nr_xdata;

    const option = {
        title: {
            text: `${metadata.name_variables[variableIndex]} - Z-level: ${zLevel}`,
            left: 'center'
        },
        tooltip: {
            trigger: 'item',
            formatter: function(params) {
                if (params.data[2] === null) {
                    return `X: ${params.data[0]}<br>Y: ${params.data[1]}<br>Value: N/A`;
                }
                return `X: ${params.data[0]}<br>Y: ${params.data[1]}<br>Value: ${params.data[2].toFixed(2)}`;
            }
        },
        visualMap: {
            min: visualMapMin,
            max: visualMapMax,
            calculable: true,
            realtime: false,
            inRange: {
                color: getColormap(colormap)
            }
        },
        grid: {
            top: 60,
            bottom: 40,
            left: 40,
            right: 40,
            containLabel: true,
            height: '1000px',
            width: '100px',
        },
        xAxis: {
            type: 'category',
            data: Array.from({length: metadata.nr_xdata}, (_, i) => i),
            name: 'X',
            splitArea: {
                show: true
            }
        },
        yAxis: {
            type: 'category',
            data: Array.from({length: metadata.nr_ydata}, (_, i) => i),
            name: 'Y',
            splitArea: {
                show: true
            },
            inverse: true 
        },
        series: [
            {
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
            },
            {
                type: 'flowGL',
                data: windData,
                supersampling: 4,
                particleType: 'line',
                particleDensity: windOptions.density,
                particleSpeed: windOptions.speed,
                particleSize: windOptions.size,
                itemStyle: {
                    opacity: windOptions.opacity,
                    color: windOptions.color
                },
                gridWidth: metadata.nr_xdata,
                gridHeight: metadata.nr_ydata,
                animation: false
            }
        ]
    };

    const chartDom = document.getElementById('chart');
    const width = chartDom.offsetWidth;
    const height = width * aspectRatio;
    chart.resize({width: width, height: height});

    chart.setOption(option, true);

    // Riabilita l'animazione dopo un breve ritardo
    setTimeout(() => {
        chart.setOption({
            series: [
                { animation: true },
                { animation: true }
            ]
        });
    }, 100);
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
    setupWindControls();
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
            if (minRange.value === '' || maxRange.value === '') {
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


function setupWindControls() {
    const windControls = ['windOpacitySlider', 'windDensitySlider', 'windSpeedSlider', 'windSizeSlider', 'windColorPicker'];
    windControls.forEach(controlId => {
        const control = document.getElementById(controlId);
        control.addEventListener('input', () => {
            app.resetFlowGL();
            app.updatePlot(false);  // Passa false per non ridimensionare il grafico
        });
        control.addEventListener('change', () => {
            app.resetFlowGL();
            app.updatePlot(false);  // Passa false per non ridimensionare il grafico
        });
    });
}

// Funzione debounce definita fuori dall'oggetto app
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
const app = {
    isSelectingFolder: false,
    mainFolder: null,
    subfolders: [],
    currentSubfolder: null,
    availableTimes: [],
    fileMapping: {},
    metadata: {},
    currentData: null,
    terrainData: null,
    windSpeed: null,
    windDirection: null,
    chart: null,

    async loadInitialData() {
        try {
            // 1. Seleziona la cartella principale (se non è già stata selezionata)
            if (!this.mainFolder) {
                await this.selectMainFolder();
            }
    
            // 2. Se ci sono sottocartelle, seleziona la prima (o una predefinita)
            if (this.subfolders.length > 0) {
                const defaultSubfolder = this.subfolders[0];
                await this.selectSubfolder(defaultSubfolder);
            } else {
                throw new Error("No subfolders found");
            }
    
            // 3. Se ci sono tempi disponibili, carica i dati per il primo tempo
            if (this.availableTimes.length > 0) {
                await this.loadData(this.availableTimes[0]);
            } else {
                throw new Error("No available times found");
            }
    
            // 4. Carica i dati del terreno (se necessario)
            this.terrainData = await loadTerrainData(this.mainFolder);
    
            // 5. Imposta i controlli dell'interfaccia utente
            this.updateControls();
    
            this.log('Initial data loaded successfully');
        } catch (error) {
            this.log('Error loading initial data: ' + error.message, 'error');
            throw error; // Rilancia l'errore per gestirlo nel chiamante
        }
    },
    
    forceChartResize() {
        if (this.chart && this.metadata) {
            const chartContainer = document.getElementById('chart');
            const containerWidth = chartContainer.offsetWidth;
            const containerHeight = chartContainer.offsetHeight;
            const aspectRatio = this.metadata.nr_xdata / this.metadata.nr_ydata;
    
            let chartWidth, chartHeight;
            if (containerWidth / containerHeight > aspectRatio) {
                chartHeight = containerHeight;
                chartWidth = chartHeight * aspectRatio;
            } else {
                chartWidth = containerWidth;
                chartHeight = chartWidth / aspectRatio;
            }
    
            chartWidth = Math.round(chartWidth);
            chartHeight = Math.round(chartHeight);
    
            this.chart.resize({width: chartWidth, height: chartHeight});
            this.log('Chart forcibly resized to: ' + chartWidth + 'x' + chartHeight);
        }
    },


    // Aggiorna anche il metodo init() per gestire eventuali errori
    init() {
        this.setupEventListeners();
        
        document.addEventListener('DOMContentLoaded', async () => {
            try {
                await this.loadInitialData();
                if (this.metadata && this.currentData) {
                    this.initChart();
                    // Aggiungi un breve ritardo prima di chiamare updatePlot
                    setTimeout(() => {
                        this.updatePlot(true);
                        handleResize();
                    }, 100);
                    this.log('Application initialized successfully');
                } else {
                    this.log('No data available after initialization', 'warn');
                }
            } catch (error) {
                this.log('Failed to initialize application: ' + error.message, 'error');
                // Qui puoi aggiungere del codice per mostrare un messaggio di errore all'utente
            }
        });
    },


    
    initChart() {
        const chartContainer = document.getElementById('chart');
        if (!chartContainer) {
            this.log('Chart container not found', 'error');
            return;
        }
        
        // Assicuriamoci che il contenitore abbia dimensioni definite
        chartContainer.style.width = '100%';
        chartContainer.style.height = '100%';
    
        // Forziamo un reflow del DOM per assicurarci che le dimensioni siano calcolate
        chartContainer.offsetHeight;
    
        const containerWidth = chartContainer.offsetWidth;
        const containerHeight = chartContainer.offsetHeight;
    
        if (containerWidth === 0 || containerHeight === 0) {
            this.log('Chart container has no dimensions. Retrying in 100ms.', 'warn');
            setTimeout(() => this.initChart(), 100);
            return;
        }
    
        // Calcola l'aspect ratio e le dimensioni ottimali
        const aspectRatio = this.metadata ? (this.metadata.nr_xdata / this.metadata.nr_ydata) : 1;
        let chartWidth, chartHeight;
    
        if (containerWidth / containerHeight > aspectRatio) {
            chartHeight = containerHeight;
            chartWidth = chartHeight * aspectRatio;
        } else {
            chartWidth = containerWidth;
            chartHeight = chartWidth / aspectRatio;
        }
    
        // Arrotonda le dimensioni
        chartWidth = Math.round(chartWidth);
        chartHeight = Math.round(chartHeight);
    
        // Inizializza il grafico con le dimensioni calcolate e le opzioni per gli eventi passivi
        this.chart = echarts.init(chartContainer, null, {
            width: chartWidth,
            height: chartHeight,
            renderer: 'canvas',
            useDirtyRect: true,
            devicePixelRatio: window.devicePixelRatio,
            useCoarsePointer: true // Questa opzione potrebbe aiutare con gli eventi del mouse
        });
    
        this.chart.setOption({
            backgroundColor: '#fff',
        });
    
        // Aggiungi un gestore di eventi passivo per il mousewheel
        chartContainer.addEventListener('mousewheel', () => {}, { passive: true });
        chartContainer.addEventListener('wheel', () => {}, { passive: true });
    
        this.log('Chart initialized with dimensions: ' + chartWidth + 'x' + chartHeight);
    },

    setupEventListeners() {
        document.getElementById('selectFolder').addEventListener('click', () => this.selectMainFolder());
        document.getElementById('subfolderSelect').addEventListener('change', (e) => this.selectSubfolder(e.target.value));
        
        const debouncedUpdatePlot = debounce(() => this.updatePlot(false), 100);
        
        document.getElementById('timeSlider').addEventListener('input', (e) => {
            updateTimeDisplay(this.availableTimes[e.target.value]);
            debouncedUpdatePlot();
        });
        document.getElementById('variableSelect').addEventListener('change', debouncedUpdatePlot);
        document.getElementById('zLevelSlider').addEventListener('input', (e) => {
            updateZLevelDisplay(e.target.value);
            debouncedUpdatePlot();
        });
        document.getElementById('followTerrain').addEventListener('change', debouncedUpdatePlot);
        document.getElementById('colormapSelect').addEventListener('change', debouncedUpdatePlot);

        

        document.getElementById('selectFolder').addEventListener('click', () => this.selectMainFolder());
        document.getElementById('subfolderSelect').addEventListener('change', (e) => this.selectSubfolder(e.target.value));
        document.getElementById('timeSlider').addEventListener('change', (e) => this.updateTime(e.target.value));
        document.getElementById('variableSelect').addEventListener('change', () => this.updatePlot());
        document.getElementById('zLevelSlider').addEventListener('change', () => this.updatePlot());
        document.getElementById('followTerrain').addEventListener('change', () => this.updatePlot());
        document.getElementById('colormapSelect').addEventListener('change', () => this.updatePlot());
        document.getElementById('exportCSV').addEventListener('click', () => this.exportCSV());
        document.getElementById('exportImage').addEventListener('click', () => this.exportImage());
        document.getElementById('rangeType').addEventListener('change', () => this.updatePlot());
        document.getElementById('minRange').addEventListener('change', () => this.updatePlot());
        document.getElementById('maxRange').addEventListener('change', () => this.updatePlot());
        document.getElementById('timeSlider').addEventListener('input', (e) => updateTimeDisplay(this.availableTimes[e.target.value]));
        document.getElementById('zLevelSlider').addEventListener('input', (e) => updateZLevelDisplay(e.target.value));
            
            document.getElementById('timeSliderPrev').addEventListener('click', () => this.adjustSlider('timeSlider', -1));
            document.getElementById('timeSliderNext').addEventListener('click', () => this.adjustSlider('timeSlider', 1));
            document.getElementById('zLevelSliderPrev').addEventListener('click', () => this.adjustSlider('zLevelSlider', -1));
            document.getElementById('zLevelSliderNext').addEventListener('click', () => this.adjustSlider('zLevelSlider', 1));
            document.getElementById('windOpacitySliderPrev').addEventListener('click', () => this.adjustSlider('windOpacitySlider', -0.1));
            document.getElementById('windOpacitySliderNext').addEventListener('click', () => this.adjustSlider('windOpacitySlider', 0.1));
            document.getElementById('windDensitySliderPrev').addEventListener('click', () => this.adjustSlider('windDensitySlider', -1));
            document.getElementById('windDensitySliderNext').addEventListener('click', () => this.adjustSlider('windDensitySlider', 1));
            document.getElementById('windSpeedSliderPrev').addEventListener('click', () => this.adjustSlider('windSpeedSlider', -0.1));
            document.getElementById('windSpeedSliderNext').addEventListener('click', () => this.adjustSlider('windSpeedSlider', 0.1));
            document.getElementById('windSizeSliderPrev').addEventListener('click', () => this.adjustSlider('windSizeSlider', -0.1));
            document.getElementById('windSizeSliderNext').addEventListener('click', () => this.adjustSlider('windSizeSlider', 0.1));
    
    },

    adjustSlider(sliderId, delta) {
        const slider = document.getElementById(sliderId);
        const newValue = parseFloat(slider.value) + delta;
        if (newValue >= parseFloat(slider.min) && newValue <= parseFloat(slider.max)) {
            slider.value = newValue;
            slider.dispatchEvent(new Event('change'));
            if (sliderId === 'timeSlider') {
                this.updateTime(newValue);
            } else if (sliderId === 'zLevelSlider') {
                updateZLevelDisplay(newValue);
                this.updatePlot();
            } else {
                // Per gli slider del vento
                this.resetFlowGL();
                this.updatePlot();
            }
        }
    },

    async updateTime(index) {
        if (this.availableTimes.length > 0) {
            const time = this.availableTimes[index];
            updateTimeDisplay(time);
            await this.loadData(time);
            this.updatePlot();
        } else {
            this.log('No available times to update', 'warn');
        }
    },

    async selectMainFolder() {
        if (this.isSelectingFolder) {
            this.log('Folder selection already in progress', 'warn');
            return;
        }
    
        this.isSelectingFolder = true;
    
        try {
            this.mainFolder = await window.showDirectoryPicker();
            this.log('Main folder selected: ' + this.mainFolder.name);
            this.subfolders = await this.getSubfolders(this.mainFolder);
            this.updateSubfolderSelect();
        } catch (error) {
            if (error.name === 'AbortError') {
                this.log('Folder selection was cancelled by the user', 'info');
            } else {
                this.log('Error selecting folder: ' + error.message, 'error');
            }
        } finally {
            this.isSelectingFolder = false;
        }
    },

    async getSubfolders(folder) {
        const subfolders = [];
        for await (const entry of folder.values()) {
            if (entry.kind === 'directory') {
                subfolders.push(entry.name);
            }
        }
        return subfolders.sort((a, b) => a.localeCompare(b));
    },

    updateSubfolderSelect() {
        const select = document.getElementById('subfolderSelect');
        select.innerHTML = '<option value="">Select a subfolder</option>';
        this.subfolders.forEach(subfolder => {
            const option = document.createElement('option');
            option.value = subfolder;
            option.textContent = subfolder;
            select.appendChild(option);
        });
        select.disabled = this.subfolders.length === 0;
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
        if (this.availableTimes.length > 0) {
            updateTimeDisplay(this.availableTimes[index]);
            await this.loadData(this.availableTimes[index]);
            this.checkChartStatus(); // Aggiungi questa riga
            this.updatePlot();
        } else {
            this.log('No available times to update', 'warn');
        }
    },

    async loadData(selectedTime) {
        if (!selectedTime) {
            this.log('No time selected for loading data', 'warn');
            return;
        }
        try {
            const files = this.fileMapping[selectedTime];
            if (files.EDT && files.EDX) {
                this.log('Loading data for time: ' + selectedTime);
                const edxContent = await readFileContent(await this.currentSubfolder.getFileHandle(files.EDX));
                const edtContent = await readFileContent(await this.currentSubfolder.getFileHandle(files.EDT));
                const { metadata, data } = processEDXEDT(edxContent, edtContent);
                this.metadata = metadata;
                this.currentData = data;
                
                this.windSpeed = data[4];
                this.windDirection = data[6];
                
                this.log('Data loaded successfully');
                console.log('Wind speed data:', this.windSpeed);
                console.log('Wind direction data:', this.windDirection);
            } else {
                this.log('Missing EDX or EDT file for time: ' + selectedTime, 'warn');
            }
        } catch (error) {
            this.log('Error loading data: ' + error.message, 'error');
        }
    },

    updatePlot(resizeChart = false) {
        console.log('Entering updatePlot');
        if (!this.currentData) {
            this.log('No data available for plotting', 'warn');
            return;
        }
    
        if (!this.chart) {
            this.log('Chart is not initialized. Attempting to reinitialize.', 'warn');
            this.initChart();
            if (!this.chart) {
                this.log('Failed to initialize chart. Cannot update plot.', 'error');
                return;
            }
        }
    
        try {
            const chartContainer = document.getElementById('chart');
            const containerWidth = chartContainer.offsetWidth;
            const containerHeight = chartContainer.offsetHeight;
    
            if (containerWidth === 0 || containerHeight === 0) {
                this.log('Chart container has no dimensions. Retrying in 100ms.', 'warn');
                setTimeout(() => this.updatePlot(resizeChart), 100);
                return;
            }
    
            const variableIndex = parseInt(document.getElementById('variableSelect').value);
            const zLevel = parseInt(document.getElementById('zLevelSlider').value);
            const followTerrain = document.getElementById('followTerrain').checked;
            const colormap = document.getElementById('colormapSelect').value;
    
            this.log('Updating plot. Variable: ' + variableIndex + ', Z-level: ' + zLevel + ', Follow Terrain: ' + followTerrain);
    
            const windData = processWindData(this.windSpeed, this.windDirection, zLevel, followTerrain, this.terrainData);
    
            const windOptions = {
                opacity: Math.max(0, Math.min(1, parseFloat(document.getElementById('windOpacitySlider').value))),
                density: Math.max(1, Math.min(256, parseInt(document.getElementById('windDensitySlider').value))),
                speed: Math.max(0.1, Math.min(10, parseFloat(document.getElementById('windSpeedSlider').value))),
                size: Math.max(0.1, Math.min(10, parseFloat(document.getElementById('windSizeSlider').value))),
                color: document.getElementById('windColorPicker').value
            };
    
            console.log('Wind data:', windData);
            console.log('Wind settings:', windOptions);
    
            if (resizeChart) {
                // Calcola l'aspect ratio della heatmap
                const aspectRatio = this.metadata.nr_xdata / this.metadata.nr_ydata;
    
                // Calcola le dimensioni ottimali per mantenere l'aspect ratio
                let chartWidth, chartHeight;
                if (containerWidth / containerHeight > aspectRatio) {
                    chartHeight = containerHeight;
                    chartWidth = chartHeight * aspectRatio;
                } else {
                    chartWidth = containerWidth;
                    chartHeight = chartWidth / aspectRatio;
                }
    
                // Arrotonda le dimensioni per evitare problemi di precisione
                chartWidth = Math.round(chartWidth);
                chartHeight = Math.round(chartHeight);
    
                // Ridimensiona il grafico
                this.chart.resize({width: chartWidth, height: chartHeight});
            }
    
            const option = this.createChartOption(this.currentData, this.terrainData, this.metadata, variableIndex, zLevel, followTerrain, colormap, windData, windOptions);
            
            // Aggiorniamo le opzioni del grafico
            this.chart.setOption(option, true);
            
            console.log('Chart options after update:', this.chart.getOption());
            this.log('Plot updated successfully');
        } catch (error) {
            console.error('Error in updatePlot:', error);
            this.log('Error updating plot: ' + error.message, 'error');
        }
    },

    checkChartStatus() {
        if (this.chart) {
            console.log('Chart status: Initialized');
            console.log('Chart instance:', this.chart);
        } else {
            console.log('Chart status: Not initialized');
        }
    },
    
    createChartOption(currentData, terrainData, metadata, variableIndex, zLevel, followTerrain, colormap, windData, windOptions) {
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
    
        return {
            title: {
                text: `${metadata.name_variables[variableIndex]} - Z-level: ${zLevel}`,
                left: 'center'
            },
            tooltip: {
                trigger: 'item',
                formatter: function(params) {
                    if (params.data[2] === null) {
                        return `X: ${params.data[0]}<br>Y: ${params.data[1]}<br>Value: N/A`;
                    }
                    return `X: ${params.data[0]}<br>Y: ${params.data[1]}<br>Value: ${params.data[2].toFixed(2)}`;
                }
            },
            visualMap: {
                min: visualMapMin,
                max: visualMapMax,
                calculable: true,
                realtime: false,
                inRange: {
                    color: getColormap(colormap)
                },
                precision: 2, // Imposta precisione a due cifre decimali
                textStyle: {
                    fontSize: 12
                },
                left: 'right', // Posiziona la legenda a destra
                top: 'center'  // Centra verticalmente la legenda
            },
            grid: {
                top: '10%',
                bottom: '10%',
                left: '10%',
                right: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: Array.from({length: metadata.nr_xdata}, (_, i) => i),
                name: 'X',
                splitArea: {
                    show: true
                },
                axisTick: {
                    alignWithLabel: true
                }
            },
            yAxis: {
                type: 'category',
                data: Array.from({length: metadata.nr_ydata}, (_, i) => i),
                name: 'Y',
                splitArea: {
                    show: true
                },
                inverse: true,
                axisTick: {
                    alignWithLabel: true
                }
            },
            series: [
                {
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
                },
                {
                    type: 'flowGL',
                    data: windData,
                    supersampling: 4,
                    particleType: 'line',
                    particleDensity: windOptions.density,
                    particleSpeed: windOptions.speed,
                    particleSize: windOptions.size,
                    itemStyle: {
                        opacity: windOptions.opacity,
                        color: windOptions.color
                    },
                    gridWidth: metadata.nr_xdata,
                    gridHeight: metadata.nr_ydata,
                    animation: false
                }
            ]
        };
    },
    resetFlowGL() {
    const option = this.chart.getOption();
    const flowGLIndex = option.series.findIndex(series => series.type === 'flowGL');
    if (flowGLIndex !== -1) {
        option.series[flowGLIndex] = {
            type: 'flowGL',
            data: [],
            supersampling: 4,
            particleType: 'line',
            particleDensity: 128,
            particleSpeed: 1,
            particleSize: 1,
            itemStyle: {
                opacity: 0.5,
                color: '#ffffff'
            },
            gridWidth: this.metadata.nr_xdata,
            gridHeight: this.metadata.nr_ydata,
            animation: false
        };
        this.chart.setOption(option, true);
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