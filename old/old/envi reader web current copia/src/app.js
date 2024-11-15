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
        const uData = this.windData['Flow u (m/s)'][zLevel];
        const vData = this.windData['Flow v (m/s)'][zLevel];
        const wData = this.windData['Flow w (m/s)'][zLevel];

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