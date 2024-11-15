// src/utils.js

function calculateAspectRatio(metadata) {
    const totalSpacingX = metadata.spacing_x * metadata.nr_xdata;
    const totalSpacingY = metadata.spacing_y * metadata.nr_ydata;
    const totalSpacingZ = metadata.spacing_z.reduce((a, b) => a + b, 0);

    const aspectRatioXY = totalSpacingY / totalSpacingX;
    const aspectRatioXZ = totalSpacingZ / totalSpacingX;
    const aspectRatioYZ = totalSpacingZ / totalSpacingY;

    return { aspectRatioXY, aspectRatioXZ, aspectRatioYZ };
}

function applyChartDimensions(chart, aspectRatio, maxWidth) {
    if (!chart) {
        console.warn('Chart not initialized');
        return;
    }
    const width = Math.min(maxWidth, window.innerWidth - 40);
    const height = Math.round(width * aspectRatio);
    chart.resize({ width, height });
}

function updateHeatmaps() {
    if (!app.metadata || !app.chart || !app.chartVerticalX || !app.chartVerticalY) {
        console.warn('Metadata or charts not available');
        return;
    }

    const { aspectRatioXY, aspectRatioXZ, aspectRatioYZ } = calculateAspectRatio(app.metadata);
    const chartWrappers = document.querySelectorAll('.chart-wrapper');

    chartWrappers.forEach((wrapper, index) => {
        const width = wrapper.offsetWidth;
        let height;

        let chart;
        switch(index) {
            case 0:
                height = width * aspectRatioXY;
                chart = app.chart;
                break;
            case 1:
                height = width * aspectRatioXZ;
                chart = app.chartVerticalX;
                break;
            case 2:
                height = width * aspectRatioYZ;
                chart = app.chartVerticalY;
                break;
        }

        wrapper.style.height = `${height}px`;

        if (chart) {
            chart.resize({width, height});
        }
    });

    app.chart.setOption({}, true);
    app.chartVerticalX.setOption({}, true);
    app.chartVerticalY.setOption({}, true);
}


function extractVerticalData(data, axis, index) {
    const variableIndex = parseInt(document.getElementById('variableSelect').value);
    const zData = data[variableIndex];
    let verticalData;
    if (axis === 'x') {
        verticalData = zData.map(zLayer => zLayer[index]);
    } else { // axis === 'y'
        verticalData = zData.map(zLayer => zLayer.map(row => row[index]));
    }
    return verticalData;
}

function createVerticalHeatmapOption(data, metadata, title, isYAxis) {
    const aspectRatio = isYAxis ? 
        metadata.nr_zdata / metadata.nr_ydata :
        metadata.nr_zdata / metadata.nr_xdata;

    return {
        title: {
            text: title,
            left: 'center'
        },
        tooltip: {
            position: 'top',
            formatter: function (params) {
                const axisName = isYAxis ? 'Y' : 'X';
                return `${axisName}: ${params.value[0]}<br>Z: ${params.value[1]}<br>Value: ${params.value[2].toFixed(2)}`;
            }
        },
        grid: {
            height: '70%',
            top: '10%'
        },
        xAxis: {
            type: 'category',
            data: isYAxis ? Array.from({length: metadata.nr_ydata}, (_, i) => i) : Array.from({length: metadata.nr_xdata}, (_, i) => i),
            splitArea: {
                show: true
            }
        },
        yAxis: {
            type: 'category',
            data: Array.from({length: metadata.nr_zdata}, (_, i) => i),
            splitArea: {
                show: true
            }
        },
        visualMap: {
            min: Math.min(...data.flat()),
            max: Math.max(...data.flat()),
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: '15%'
        },
        series: [{
            name: 'Vertical Heatmap',
            type: 'heatmap',
            data: data.flatMap((row, i) => 
                row.map((value, j) => [j, i, value])
            ),
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            }
        }]
    };
}


function getColormap(name) {
    const colormaps = {
        viridis: ['#440154', '#414487', '#2a788e', '#22a884', '#7ad151', '#fde725'],
        plasma: ['#0d0887', '#6a00a8', '#b12a90', '#e16462', '#fca636', '#f0f921'],
        inferno: ['#000004', '#420a68', '#932667', '#dd513a', '#fca50a', '#fcffa4'],
        magma: ['#000004', '#3b0f70', '#8c2981', '#de4968', '#fe9f6d', '#fcfdbf'],
        cividis: ['#00224e', '#123570', '#3b496c', '#575d6d', '#707880', '#919b91', '#b8b8aa', '#e1d4c0']
    };
    
    return colormaps[name] || colormaps.viridis; // Restituisce viridis come fallback
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
        spacing_x: parseFloat(content.match(/<spacing_x>\s*([\d.]+)/)[1]),
        spacing_y: parseFloat(content.match(/<spacing_y>\s*([\d.]+)/)[1]),
 };

 const spacingZMatch = content.match(/<spacing_z>([\s\S]*?)<\/spacing_z>/);
 if (spacingZMatch) {
     metadata.spacing_z = spacingZMatch[1].split(',').map(v => parseFloat(v.trim()));
 } else {
     metadata.spacing_z = [];
 }

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
    if (!data || !Array.isArray(data) || data.length === 0) {
        console.error('Invalid data in processData');
        return [];
    }

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
                processedData[v][y][x] = (value === -999 || isNaN(value)) ? null : value;
            }
        }
    }

    return processedData;
}

function processWindData(windSpeed, windDirection, zLevel, followTerrain, terrainData) {
    const [nrZdata, nrYdata, nrXdata] = [
        windSpeed.length,
        windSpeed[0].length,
        windSpeed[0][0].length
    ];

    const windData = [];

    for (let y = 0; y < nrYdata; y++) {
        for (let x = 0; x < nrXdata; x++) {
            let z = zLevel;
            if (followTerrain && terrainData) {
                const terrainZ = Math.floor(terrainData[y][x]);
                z = Math.min(Math.max(zLevel + terrainZ, 0), nrZdata - 1);
            }

            const speed = windSpeed[z][y][x];
            const direction = windDirection[z][y][x];

            // Verifica che speed e direction siano numeri finiti e validi
            if (isFinite(speed) && isFinite(direction) && speed !== -999 && direction !== -999) {
                const dirRad = (direction * Math.PI) / 180;
                const u = -speed * Math.sin(dirRad);
                const v = -speed * Math.cos(dirRad);

                // Verifica che u e v siano numeri finiti
                if (isFinite(u) && isFinite(v)) {
                    windData.push([x, nrYdata - 1 - y, u, v, speed]);
                }
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
    updateHeatmaps();
}


window.addEventListener('resize', debounce(() => {
    handleResize();
    app.updatePlot(false);
}, 250));

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
    if (!isFinite(visualMapMin) || !isFinite(visualMapMax)) {
        visualMapMin = 0;
        visualMapMax = 1;
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
    chartVerticalX: null,
    chartVerticalY: null,

    async loadInitialData() {
        try {
            if (!this.mainFolder) {
                await this.selectMainFolder();
            }
    
            if (this.subfolders.length > 0) {
                const defaultSubfolder = this.subfolders[0];
                await this.selectSubfolder(defaultSubfolder);
            } else {
                throw new Error("No subfolders found");
            }
    
            if (this.availableTimes.length > 0) {
                await this.loadData(this.availableTimes[0]);
            } else {
                throw new Error("No available times found");
            }
    
            this.terrainData = await loadTerrainData(this.mainFolder);
    
            this.updateControls();
    
            this.log('Initial data loaded successfully');
        } catch (error) {
            this.log('Error loading initial data: ' + error.message, 'error');
            throw error;
        }
    },
    
    forceChartResize() {
        if (this.chart && this.chartVerticalX && this.chartVerticalY && this.metadata) {
            const chartContainer = document.getElementById('chart');
            const containerVerticalX = document.getElementById('chart-vertical-x');
            const containerVerticalY = document.getElementById('chart-vertical-y');
            
            const aspectRatio = this.metadata.nr_xdata / this.metadata.nr_ydata;
    
            let chartWidth = Math.round(chartContainer.offsetWidth);
            let chartHeight = Math.round(chartWidth / aspectRatio);
    
            this.chart.resize({width: chartWidth, height: chartHeight});
            this.chartVerticalX.resize({width: containerVerticalX.offsetWidth, height: containerVerticalX.offsetHeight});
            this.chartVerticalY.resize({width: containerVerticalY.offsetWidth, height: containerVerticalY.offsetHeight});
            
            this.log('Charts forcibly resized');
        }
    },

    init() {
        this.setupEventListeners();
        
        document.addEventListener('DOMContentLoaded', async () => {
            try {
                await this.loadInitialData();
                if (this.metadata && this.currentData) {
                    this.initCharts();
                    updateHeatmaps(); // Aggiunto questa chiamata per impostare le dimensioni corrette dei grafici
                    this.updatePlot();
                    this.log('Application initialized successfully');
                } else {
                    this.log('No data available after initialization', 'warn');
                }
            } catch (error) {
                this.log('Failed to initialize application: ' + error.message, 'error');
                console.error('Initialization error:', error);
            }
        });
    
        window.addEventListener('resize', debounce(() => {
            if (this.chart && this.chartVerticalX && this.chartVerticalY) {
                updateHeatmaps();
                this.updatePlot(false);
            }
        }, 250));
    
        // Aggiunta di event listener per i controlli dell'interfaccia utente
        document.getElementById('selectFolder').addEventListener('click', () => this.selectMainFolder());
        document.getElementById('subfolderSelect').addEventListener('change', (e) => this.selectSubfolder(e.target.value));
        document.getElementById('timeSlider').addEventListener('input', (e) => {
            updateTimeDisplay(this.availableTimes[e.target.value]);
            this.updatePlot();
        });
        document.getElementById('variableSelect').addEventListener('change', () => this.updatePlot());
        document.getElementById('zLevelSlider').addEventListener('input', (e) => {
            updateZLevelDisplay(e.target.value);
            this.updatePlot();
        });
        document.getElementById('followTerrain').addEventListener('change', () => this.updatePlot());
        document.getElementById('colormapSelect').addEventListener('change', () => this.updatePlot());
        document.getElementById('exportCSV').addEventListener('click', () => this.exportCSV());
        document.getElementById('exportImage').addEventListener('click', () => this.exportImage());
        
        // Controlli per il vento
        const windControls = ['windOpacitySlider', 'windDensitySlider', 'windSpeedSlider', 'windSizeSlider', 'windColorPicker'];
        windControls.forEach(controlId => {
            const control = document.getElementById(controlId);
            control.addEventListener('input', () => {
                this.resetFlowGL();
                this.updatePlot(false);
            });
            control.addEventListener('change', () => {
                this.resetFlowGL();
                this.updatePlot(false);
            });
        });
    
        // Controlli per il range manuale
        document.getElementById('rangeType').addEventListener('change', () => this.updatePlot());
        document.getElementById('minRange').addEventListener('change', () => this.updatePlot());
        document.getElementById('maxRange').addEventListener('change', () => this.updatePlot());
    
        // Pulsanti per i slider
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
    
        this.log('Event listeners set up successfully');
    },

    initCharts() {
        const initOptions = {
            renderer: 'canvas',
            useDirtyRect: true,
            devicePixelRatio: window.devicePixelRatio,
            useCoarsePointer: true,
        };
    
        // Verifica se gli elementi DOM esistono prima di inizializzare i grafici
        const chartElement = document.getElementById('chart');
        const verticalChartXElement = document.getElementById('verticalChartX');
        const verticalChartYElement = document.getElementById('verticalChartY');
    
        if (chartElement && !this.chart) {
            this.chart = echarts.init(chartElement, null, initOptions);
        }
        if (verticalChartXElement && !this.chartVerticalX) {
            this.chartVerticalX = echarts.init(verticalChartXElement, null, initOptions);
        }
        if (verticalChartYElement && !this.chartVerticalY) {
            this.chartVerticalY = echarts.init(verticalChartYElement, null, initOptions);
        }
    
        if (this.chart && this.chartVerticalX && this.chartVerticalY) {
            this.log('All charts initialized successfully');
        } else {
            this.log('Failed to initialize one or more charts', 'error');
        }
    },

    initChart() {
        const chartContainer = document.getElementById('chart');
        const verticalChartXContainer = document.getElementById('verticalChartX');
        const verticalChartYContainer = document.getElementById('verticalChartY');
    
        if (!chartContainer || !verticalChartXContainer || !verticalChartYContainer) {
            this.log('Chart containers not found', 'error');
            return;
        }
    
        const initOptions = {
            renderer: 'canvas',
            useDirtyRect: true,
            devicePixelRatio: window.devicePixelRatio,
            useCoarsePointer: true,
            throttle: 70,
        };
    
        // Inizializza i grafici solo se non sono già stati inizializzati
        if (!this.chart) {
            this.chart = echarts.init(chartContainer, null, initOptions);
        }
        if (!this.verticalChartX) {
            this.verticalChartX = echarts.init(verticalChartXContainer, null, initOptions);
        }
        if (!this.verticalChartY) {
            this.verticalChartY = echarts.init(verticalChartYContainer, null, initOptions);
        }
    
        // Aggiungi listener passivi per gli eventi di scrolling
        [this.chart, this.verticalChartX, this.verticalChartY].forEach(chart => {
            chart.getZr().dom.addEventListener('mousewheel', () => {}, { passive: true });
            chart.getZr().dom.addEventListener('wheel', () => {}, { passive: true });
        });
    
        this.log('Charts initialized successfully');
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

        document.getElementById('timeSlider').addEventListener('change', (e) => this.updateTime(e.target.value));
        document.getElementById('exportCSV').addEventListener('click', () => this.exportCSV());
        document.getElementById('exportImage').addEventListener('click', () => this.exportImage());
        document.getElementById('rangeType').addEventListener('change', () => this.updatePlot());
        document.getElementById('minRange').addEventListener('change', () => this.updatePlot());
        document.getElementById('maxRange').addEventListener('change', () => this.updatePlot());
        
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

    updatePlot(resize = true) {
        if (!this.currentData || !this.metadata) {
            this.log('No data available for plotting', 'warn');
            return;
        }
    
        if (!this.chart || !this.chartVerticalX || !this.chartVerticalY) {
            this.log('Charts not initialized. Initializing now.', 'warn');
            this.initCharts();
        }
    
        try {
            const variableIndex = parseInt(document.getElementById('variableSelect').value);
            const zLevel = parseInt(document.getElementById('zLevelSlider').value);
            const followTerrain = document.getElementById('followTerrain').checked;
            const colormap = document.getElementById('colormapSelect').value;
    
            // Aggiornamento della heatmap principale
            const plotData = processData(this.currentData, this.terrainData, zLevel, followTerrain)[variableIndex];
            if (!plotData || plotData.length === 0) {
                this.log('No valid data to plot', 'warn');
                return;
            }
    
            const windData = processWindData(this.windSpeed, this.windDirection, zLevel, followTerrain, this.terrainData);
    
            const windOptions = {
                opacity: parseFloat(document.getElementById('windOpacitySlider').value),
                density: parseInt(document.getElementById('windDensitySlider').value),
                speed: parseFloat(document.getElementById('windSpeedSlider').value),
                size: parseFloat(document.getElementById('windSizeSlider').value),
                color: document.getElementById('windColorPicker').value
            };
    
            const option = this.createChartOption(plotData, this.metadata, variableIndex, zLevel, followTerrain, colormap, windData, windOptions);
            
            if (this.chart) {
                this.chart.setOption(option);
            } else {
                this.log('Main chart not available', 'error');
            }
    
            // Creazione e aggiornamento delle heatmap verticali
            const xIndex = Math.floor(this.metadata.nr_xdata / 2);
            const yIndex = Math.floor(this.metadata.nr_ydata / 2);
            
            const verticalDataX = extractVerticalData(this.currentData, 'x', xIndex);
            const verticalDataY = extractVerticalData(this.currentData, 'y', yIndex);
    
            if (verticalDataX && verticalDataY) {
                const optionX = createVerticalHeatmapOption(verticalDataX, this.metadata, `Vertical Section X=${xIndex}`, false);
                const optionY = createVerticalHeatmapOption(verticalDataY, this.metadata, `Vertical Section Y=${yIndex}`, true);
    
                if (this.chartVerticalX) {
                    this.chartVerticalX.setOption(optionX);
                } else {
                    this.log('Vertical chart X not available', 'error');
                }
    
                if (this.chartVerticalY) {
                    this.chartVerticalY.setOption(optionY);
                } else {
                    this.log('Vertical chart Y not available', 'error');
                }
            } else {
                this.log('Failed to extract vertical data', 'error');
            }
    
            if (resize && this.chart && this.chartVerticalX && this.chartVerticalY) {
                updateHeatmaps();
            }
    
            this.log('Plot updated successfully');
        } catch (error) {
            this.log('Error updating plot: ' + error.message, 'error');
            console.error('Error in updatePlot:', error);
        }
    },

    resizeCharts() {
        const mainContent = document.querySelector('.main-content');
        const containerTop = document.getElementById('chart');
        const containerVerticalX = document.getElementById('chart-vertical-x');
        const containerVerticalY = document.getElementById('chart-vertical-y');

        if (!mainContent || !containerTop || !containerVerticalX || !containerVerticalY) {
            console.warn('One or more chart containers not found');
            return;
        }

        const totalHeight = mainContent.offsetHeight;
        const chartHeight = totalHeight / 3; // Dividiamo l'altezza equamente tra i tre grafici

        if (this.chart) this.chart.resize({width: containerTop.offsetWidth, height: chartHeight});
        if (this.chartVerticalX) this.chartVerticalX.resize({width: containerVerticalX.offsetWidth, height: chartHeight});
        if (this.chartVerticalY) this.chartVerticalY.resize({width: containerVerticalY.offsetWidth, height: chartHeight});
    },

    createChartOption(plotData, metadata, variableIndex, zLevel, followTerrain, colormap) {
        // Verifica che i dati e i metadata siano validi
        if (!plotData || !metadata) {
            console.error('Invalid data or metadata in createChartOption');
            return {};
        }
    
        // Filtra i dati validi (non null e numeri)
        const validData = plotData.flat().filter(value => value !== null && !isNaN(value));
        
        if (validData.length === 0) {
            console.warn('No valid data in createChartOption');
            return {};
        }
    
        // Calcola il range dei dati
        const minValue = Math.min(...validData);
        const maxValue = Math.max(...validData);
    
        // Crea l'opzione per il grafico
        return {
            title: {
                text: `${metadata.name_variables[variableIndex]} - Z-level: ${zLevel}`,
                left: 'center'
            },
            tooltip: {
                position: 'top',
                formatter: function(params) {
                    return `X: ${params.data[0]}<br>Y: ${params.data[1]}<br>Value: ${params.data[2].toFixed(2)}`;
                }
            },
            grid: {
                height: '70%',
                top: '10%'
            },
            xAxis: {
                type: 'category',
                data: Array.from({length: metadata.nr_xdata}, (_, i) => i),
                splitArea: {
                    show: true
                }
            },
            yAxis: {
                type: 'category',
                data: Array.from({length: metadata.nr_ydata}, (_, i) => i),
                splitArea: {
                    show: true
                }
            },
            visualMap: {
                min: minValue,
                max: maxValue,
                calculable: true,
                orient: 'horizontal',
                left: 'center',
                bottom: '15%',
                inRange: {
                    color: getColormap(colormap)
                }
            },
            series: [{
                name: 'Heatmap',
                type: 'heatmap',
                data: plotData.flatMap((row, i) => 
                    row.map((value, j) => [j, i, value])
                ),
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        };
    },

    processVerticalXData(currentData, variableIndex) {
        const zData = currentData[variableIndex];
        const result = [];
    
        for (let z = 0; z < zData.length; z++) {
            const row = [];
            for (let x = 0; x < zData[z][0].length; x++) {
                // Prendiamo il valore dal centro della sezione Y
                const y = Math.floor(zData[z].length / 2);
                const value = zData[z][y][x];
                row.push(value === -999 ? null : value);
            }
            result.push(row);
        }
    
        return result;
    },
    
    processVerticalYData(currentData, variableIndex) {
        const zData = currentData[variableIndex];
        const result = [];
    
        for (let z = 0; z < zData.length; z++) {
            const row = [];
            for (let y = 0; y < zData[z].length; y++) {
                // Prendiamo il valore dal centro della sezione X
                const x = Math.floor(zData[z][y].length / 2);
                const value = zData[z][y][x];
                row.push(value === -999 ? null : value);
            }
            result.push(row);
        }
    
        return result;
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