import { state } from './enviropment.js';
import { chartInstances } from './enviropment.js';
import { chartInstancesLines } from './enviropment.js';
import { selectedPalette } from './fileMan.js';
import { selectedDifferencePalette } from './fileMan.js';
import { handleChartClick } from './events.js';
import { DOM } from './enviropment.js';


export function resizeChartContainers() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    const availableHeight = mainContent.clientHeight;
    const availableWidth = mainContent.clientWidth;



    // Gestisci separatamente il grafico delle serie temporali
    const timeSeriesChart = chartInstancesLines['timeSeries'];
    if (timeSeriesChart) {
        const container = timeSeriesChart.getDom();
        const containerWidth = container.parentElement.clientWidth - 40;
        const containerHeight = Math.max(availableHeight * 0.3, 300);

        container.style.width = `${containerWidth}px`;
        container.style.height = `${containerHeight}px`;

        timeSeriesChart.resize({
            width: containerWidth,
            height: containerHeight
        });
    }
}

function calculateOptimalChartSize(sumSpacing, viewType, scale = state.scaleFactor) {
    if (!sumSpacing) {
        console.warn('sumSpacing non valido, uso dimensioni di default');
        return { width: 400, height: 300 };
    }

    // Verifica che tutte le proprietà necessarie esistano
    if (!sumSpacing.x || !sumSpacing.y || !sumSpacing.z) {
        console.warn('sumSpacing incompleto, uso dimensioni di default');
        return { width: 400, height: 300 };
    }

    let contentWidth, contentHeight;

    switch (viewType) {
        case 'level':
            contentWidth = sumSpacing.x * scale;
            contentHeight = sumSpacing.y * scale;
            break;
        case 'section-x':
            contentWidth = sumSpacing.y * scale;
            contentHeight = sumSpacing.z * scale;
            break;
        case 'section-y':
            contentWidth = sumSpacing.x * scale;
            contentHeight = sumSpacing.z * scale;
            break;
    }

    const optimalWidth = contentWidth ;
    const optimalHeight = contentHeight;

    return { width: Math.round(optimalWidth), height: Math.round(optimalHeight) };
}


function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-indicator';
        loadingDiv.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            z-index: 1000;
        `;
        loadingDiv.innerHTML = `
            <div class="spinner"></div>
            <p style="color: white; margin-top: 10px;">Loading...</p>
        `;
        element.style.position = 'relative';
        element.appendChild(loadingDiv);
    }
}


function hideLoading(elementId) {
    const element = document.getElementById(elementId);
    const loadingDiv = document.getElementById('loading-indicator');
    if (element && loadingDiv) {
        element.removeChild(loadingDiv);
    }
}


// Visualizza i dati sul canvas
export function visualizeData(sliceData, dimensions, sliceConfig, variableName, viewType, filesetKey, differenceOrder, scaleType, globalMinValue, globalMaxValue) {
    const scale = state.scaleFactor;

    const isPaletteData = filesetKey !== 'filesetDiff';
    const palette = isPaletteData ? selectedPalette : selectedDifferencePalette;

    const { level, sectionX, sectionY } = sliceConfig;
    let containerSelector;
    let viewTitle;
    let rowHeightsBase, columnWidthsBase;

    if (filesetKey === 'filesetDiff') {
        containerSelector = `#visualizationContainerDiff`;
    } else {
        containerSelector = `#visualizationContainer${filesetKey.slice(-1)}`;
    }

    switch (viewType) {
        case 'level':
            viewTitle = 'Plan View';
            rowHeightsBase = state.spacing.y;
            columnWidthsBase = state.spacing.x;
            break;
        case 'section-x':
            viewTitle = 'Longitudinal Section';
            rowHeightsBase = state.spacing.z;
            columnWidthsBase = state.spacing.y;
            break;
        case 'section-y':
            viewTitle = 'Transverse Section';
            rowHeightsBase = state.spacing.z;
            columnWidthsBase = state.spacing.x;
            break;
        default:
            viewTitle = 'Unknown View';
            rowHeightsBase = [];
            columnWidthsBase = [];
    }

    const visualizationContainer = document.querySelector(containerSelector);
    if (!visualizationContainer) {
        console.error(`Container not found for ${filesetKey}. Selector: ${containerSelector}`);
        return;
    }

    let chartContainer = visualizationContainer.querySelector(`.chart-container.${viewType}`);

    if (chartContainer) {
        updateInfoDivStyle(chartContainer);
    } else {
        chartContainer = document.createElement('div');
        chartContainer.className = `chart-container ${viewType}`;
        
        // Aggiungi il container per il titolo
        const titleContainer = document.createElement('div');
        titleContainer.className = 'chart-title-container';
        
        const title = document.createElement('div');
        title.className = 'chart-title';
        
        const stats = document.createElement('div');
        stats.className = 'chart-stats';
        
        titleContainer.appendChild(title);
        titleContainer.appendChild(stats);
        chartContainer.appendChild(titleContainer);

        const chartDiv = document.createElement('div');
        chartDiv.className = 'echarts-container';
        chartContainer.appendChild(chartDiv);
        
        visualizationContainer.appendChild(chartContainer);
    }

    // Aggiorna il titolo e le statistiche
    const titleContainer = chartContainer.querySelector('.chart-title-container');
    const title = titleContainer.querySelector('.chart-title');
    const stats = titleContainer.querySelector('.chart-stats');

    // Calcola le statistiche
    const validData = sliceData.filter(v => v !== null && !isNaN(v));
    const min = Math.min(...validData).toFixed(2);
    const max = Math.max(...validData).toFixed(2);
    const avg = (validData.reduce((a, b) => a + b, 0) / validData.length).toFixed(2);

    // Imposta i testi
    title.textContent = `${viewTitle} - ${variableName}`;
    stats.textContent = `Min: ${min} | Max: ${max} | Avg: ${avg}`;

    const optimalSize = calculateOptimalChartSize(
        filesetKey === 'filesetDiff' ? 
            state.filesetA.edxData.sumSpacing : 
            state[filesetKey].edxData.sumSpacing, 
        viewType
    );

    let chartDiv = chartContainer.querySelector('.echarts-container');

    const scaledWidth = optimalSize.width;
    const scaledHeight = optimalSize.height;

    chartDiv.style.width = `${scaledWidth}px`;
    chartDiv.style.height = `${scaledHeight}px`;

    if (!chartDiv.hasAttribute('data-original-width')) {
        chartDiv.setAttribute('data-original-width', scaledWidth);
        chartDiv.setAttribute('data-original-height', scaledHeight);
    }

    const chartKey = `${filesetKey}-${viewType}`;
    if (chartInstances[chartKey]) {
        chartInstances[chartKey].dispose();
    }

    const rowHeights = rowHeightsBase.map(height => height);
    const columnWidths = columnWidthsBase.map(width => width);
    const totalHeight = rowHeights.reduce((a, b) => a + b, 0);
    const totalWidth = columnWidths.reduce((a, b) => a + b, 0);

    let data = [];
    let xAxis, yAxis;

    if (viewType === 'level') {
        xAxis = Array.from({ length: dimensions.x }, (_, i) => i);
        yAxis = Array.from({ length: dimensions.y }, (_, i) => i);

        data = new Array(dimensions.x * dimensions.y);
        let dataIndex = 0;

        for (let y = 0; y < dimensions.y; y++) {
            for (let x = 0; x < dimensions.x; x++) {
                const value = sliceData[y * dimensions.x + x];
                if (value !== null && !isNaN(value)) {
                    data[dataIndex++] = [x, y, value];
                }
            }
        }
        data.length = dataIndex;
    } else if (viewType === 'section-x') {
        xAxis = Array.from({ length: dimensions.y }, (_, i) => i);
        yAxis = Array.from({ length: dimensions.z }, (_, i) => i);

        data = new Array(dimensions.y * dimensions.z);
        let dataIndex = 0;

        for (let z = 0; z < dimensions.z; z++) {
            for (let y = 0; y < dimensions.y; y++) {
                const value = sliceData[z * dimensions.y + y];
                if (value !== null && !isNaN(value)) {
                    data[dataIndex++] = [y, z, value];
                }
            }
        }
        data.length = dataIndex;
    } else if (viewType === 'section-y') {
        xAxis = Array.from({ length: dimensions.x }, (_, i) => i);
        yAxis = Array.from({ length: dimensions.z }, (_, i) => i);

        data = new Array(dimensions.x * dimensions.z);
        let dataIndex = 0;

        for (let z = 0; z < dimensions.z; z++) {
            for (let x = 0; x < dimensions.x; x++) {
                const value = sliceData[z * dimensions.x + x];
                if (value !== null && !isNaN(value)) {
                    data[dataIndex++] = [x, z, value];
                }
            }
        }
        data.length = dataIndex;
    }

    if (data.length === 0) {
        console.warn('No valid data to display for', filesetKey, viewType);
        return;
    }

    let minValue, maxValue;
    if (filesetKey === 'filesetDiff' || scaleType === 'individual') {
        minValue = Math.min(...data.map(d => d[2]));
        maxValue = Math.max(...data.map(d => d[2]));
    } else if (scaleType === 'syncedViews') {
        minValue = globalMinValue;
        maxValue = globalMaxValue;
    } else {
        minValue = globalMinValue;
        maxValue = globalMaxValue;
    }

    if (!isFinite(minValue) || !isFinite(maxValue)) {
        console.error('Invalid min/max values:', minValue, maxValue);
        return;
    }

    const option = {
        tooltip: {
            trigger: 'item',
            formatter: function (params) {
                const xValue = params.value[0].toFixed(0);
                const yValue = params.value[1].toFixed(0);
                const actualValue = params.value[2].toFixed(2);
                
                return `X: ${xValue}<br />Y: ${yValue}<br />Valore: ${actualValue}`;
            }
        },
        xAxis: {
            type: 'value',
            min: 0,
            max: totalWidth,
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false }
        },
        yAxis: {
            type: 'value',
            min: 0,
            max: totalHeight,
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false }
        },
        visualMap: {
            min: minValue,
            max: maxValue,
            calculable: true,
            orient: 'horizontal',
           
            top: 0,
            inRange: {
                color: palette
            },
            textStyle: {
                color: '#ffffff',
                fontSize: 11
            },
            itemWidth: 15,
            itemHeight: 150,
            formatter: function (value) {
                return value.toFixed(2);
            },
        },
        series: [
            {
                type: 'custom',
                renderItem: (params, api) => {
                    const value = api.value(2);
                    const [x, y] = api.coord([api.value(0), api.value(1)]);
                    
                    let rowIndex, colIndex;
                    if (viewType === 'level') {
                        rowIndex = Math.floor(api.value(1));
                        colIndex = Math.floor(api.value(0));
                    } else if (viewType === 'section-x') {
                        rowIndex = Math.floor(api.value(1));
                        colIndex = Math.floor(api.value(0));
                    } else {
                        rowIndex = Math.floor(api.value(1));
                        colIndex = Math.floor(api.value(0));
                    }

                    const startY = rowHeights.slice(0, rowIndex).reduce((a, b) => a + b, 0);
                    const startX = columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0); 

                    const width = columnWidths[colIndex];
                    const height = rowHeights[rowIndex];
              

                    return {
                        type: 'rect',
                        shape: {
                            x: startX * scale,
                            y: (totalHeight - startY - rowHeights[rowIndex]) * scale,
                            width: width * scale ,
                            height: height * scale
                        },
                        style: {
                            fill: api.visual('color'),
                            stroke: api.visual('color'), // Aggiunge un bordo dello stesso colore del fill
                            lineWidth: 2 // Imposta la larghezza del bordo
                        }
                    };
                },
                data: data
            },
            {
                name: 'cross',
                type: 'custom',
                renderItem: function (params, api) {
                    if (!state.crossPosition || state.crossPosition.viewType !== viewType) {
                        return null;
                    }
                    const startY = rowHeights.slice(0, state.crossPosition.yIndex).reduce((a, b) => a + b, 0);
                    const startX = columnWidths.slice(0, state.crossPosition.xIndex).reduce((a, b) => a + b, 0);
                    
                    const x = startX * scale;
                    const y = (totalHeight - startY - rowHeights[state.crossPosition.yIndex]) * scale;
                    const crossSize = 10 * scale;

                    return {
                        type: 'group',
                        children: [{
                            type: 'line',
                            shape: {
                                x1: x - crossSize,
                                y1: y,
                                x2: x + crossSize,
                                y2: y
                            },
                            style: {
                                stroke: '#ffffff',
                                lineWidth: 3
                            }
                        }, {
                            type: 'line',
                            shape: {
                                x1: x,
                                y1: y - crossSize,
                                x2: x,
                                y2: y + crossSize
                            },
                            style: {
                                stroke: '#ffffff',
                                lineWidth: 3
                            }
                        }, {
                            type: 'line',
                            shape: {
                                x1: x - crossSize,
                                y1: y,
                                x2: x + crossSize,
                                y2: y
                            },
                            style: {
                                stroke: '#000000',
                                lineWidth: 1
                            }
                        }, {
                            type: 'line',
                            shape: {
                                x1: x,
                                y1: y - crossSize,
                                x2: x,
                                y2: y + crossSize
                            },
                            style: {
                                stroke: '#000000',
                                lineWidth: 1
                            }
                        }]
                    };
                },
                data: state.crossPosition && state.crossPosition.viewType === viewType ? 
                    [[state.crossPosition.xIndex, state.crossPosition.yIndex, state.crossPosition.value]] : 
                    [],
                z: 10
            }
        ]
    };

    const myChart = echarts.init(chartDiv, null, {
        width: scaledWidth,
        height: scaledHeight,
        renderer: 'svg'
    });
    chartInstances[chartKey] = myChart;

    myChart.setOption(option);

    myChart.on('click', function (params) {
        if (params.componentType === 'series') {
            const xIndex = parseInt(params.value[0]);
            const yIndex = parseInt(params.value[1]);
            const value = params.value[2];

            state.crossPosition = {
                xIndex: xIndex,
                yIndex: yIndex,
                value: value,
                viewType: viewType
            };

            const currentOption = myChart.getOption();
            currentOption.series[1].data = [[xIndex, yIndex, value]];
            myChart.setOption(currentOption);
            
            handleChartClick(viewType, xIndex, yIndex);
        }
    });

    const resizeListener = () => {
        if (chartInstances[chartKey]) {
            const newScaledWidth = chartDiv.clientWidth;
            const newScaledHeight = chartDiv.clientHeight;
            chartInstances[chartKey].resize({ width: newScaledWidth, height: newScaledHeight });
        }
    };
    window.addEventListener('resize', resizeListener);

    const cleanup = () => {
        window.removeEventListener('resize', resizeListener);
    };

    if (!window.chartCleanupFunctions) {
        window.chartCleanupFunctions = {};
    }
    window.chartCleanupFunctions[chartKey] = cleanup;
}

export function visualizeTimeSeries(data, variableName) {
    const timeSeriesContainer = document.querySelector('.time-series-container');
    const chartDiv = document.getElementById('timeSeriesChart');
    
    if (!chartDiv) {
        console.error('Element timeSeriesChart not found');
        return;
    }

    // Rendi visibile il container
    if (timeSeriesContainer) {
        timeSeriesContainer.classList.add('visible');
    }

    showLoading('timeSeriesChart');

    if (chartInstancesLines['timeSeries']) {
        chartInstancesLines['timeSeries'].dispose();
    }

    const containerWidth = chartDiv.parentElement.clientWidth - 40;
    const containerHeight = 400;

    const chart = echarts.init(chartDiv, 'light', {
        renderer: 'svg',
        width: containerWidth,
        height: containerHeight
    });
    chartInstancesLines['timeSeries'] = chart;

    const formatNumber = (value) => {
        return value !== null ? Number(value).toFixed(2) : 'N/A';
    };

    // Assicuriamoci che currentTimeValue sia una data valida
    const currentTimeIndex = parseInt(DOM.timeSlider.value);
    const currentTimeValue = new Date(data[currentTimeIndex].date).getTime();

    const isDarkTheme = document.body.classList.contains('dark-theme');
    const textColor = isDarkTheme ? '#ffffff' : '#333333';

    const option = {
        title: {
            text: `Time Series Comparison: ${variableName}`,
            left: 'center',
            textStyle: {
                color: textColor,
                fontWeight: 'bold',
                fontSize: 16
            }
        },
        tooltip: {
            trigger: 'axis',
            backgroundColor: isDarkTheme ? 'rgba(50,50,50,0.9)' : 'rgba(255,255,255,0.9)',
            borderColor: isDarkTheme ? '#666' : '#ddd',
            textStyle: {
                color: isDarkTheme ? '#fff' : '#333'
            },
            formatter: function (params) {
                const date = new Date(params[0].value[0]);
                let result = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}<br/>`;
                params.forEach(param => {
                    result += `${param.seriesName}: ${formatNumber(param.value[1])}<br/>`;
                });
                return result;
            }
        },
        legend: {
            data: ['Fileset A', 'Fileset B'],
            bottom: 10,
            textStyle: {
                color: textColor
            }
        },
        toolbox: {
            show: true,
            feature: {
                dataZoom: {
                    yAxisIndex: 'none'
                },
                dataView: { readOnly: false },
                magicType: { type: ['line', 'bar'] },
                restore: {},
            },
            iconStyle: {
                borderColor: textColor,
            },
            emphasis: {
                iconStyle: {
                    borderColor: textColor,
                }
            }
        },
        xAxis: {
            type: 'time',
            axisLine: {
                lineStyle: {
                    color: textColor
                }
            },
            axisLabel: {
                color: textColor,
                formatter: function (value) {
                    const date = new Date(value);
                    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                }
            }
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter: function (value) {
                    return `${formatNumber(value)}`;
                },
                color: textColor
            },
            splitLine: {
                show: true,
                lineStyle: {
                    color: isDarkTheme ? '#4B4B4B' : '#E0E0E0'
                }
            },
            min: 'dataMin', // Imposta il valore minimo automaticamente
            max: 'dataMax'  // Imposta il valore massimo automaticamente
        },
        series: [
            {
                name: 'Fileset A',
                type: 'line',
                data: data.map(item => [item.date, item.valueA]),
                connectNulls: true,
                lineStyle: {
                    color: '#E0786C'
                },
                itemStyle: {
                    color: '#E0786C'
                },


                markLine: {
                    symbol: ['circle', 'circle'],
                    silent: true,
                    data: [
                        {
                            xAxis: currentTimeValue,
                            label: {
                                formatter: function() {
                                    const date = new Date(currentTimeValue);
                                    const options = {  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false };
                                    const formattedDate = date.toLocaleString('it-IT', options).replace(',', '');
                                    const weekday = date.toLocaleString('en-US', { weekday: 'long' });
                                    return `${weekday}, ${formattedDate}`; // Modifica per il formato richiesto
                                },
                                position: 'insideEndTop',
                                color: textColor,
                                fontSize: 14,
                                fontWeight: 'bold',
                                padding: [4, 8]
                            },
                            lineStyle: {
                                color: textColor,
                                type: 'solid',
                                width: 2,
                            }
                        }
                    ]
                }
            },
            {
                name: 'Fileset B',
                type: 'line',
                data: data.map(item => [item.date, item.valueB]),
                connectNulls: true,
                lineStyle: {
                    color: '#4DA9B9'
                },
                itemStyle: {
                    color: '#4DA9B9'
                },
                
            }
        ]
    };

    // Utilizziamo setTimeout per simulare un breve ritardo e mostrare l'indicatore di caricamento
    setTimeout(() => {
        chart.setOption(option);
        hideLoading('timeSeriesChart');
    }, 100);
}



function updateInfoDivStyle(container) {
    const infoDiv = container.querySelector('.info-div');
    if (infoDiv) {
        infoDiv.style.cssText = 'font-family: Helvetica, Arial, sans-serif; font-style: italic; font-size: 0.8em; margin-top: 5px; margin-bottom: px;';
    }
}

export function removeCross() {
    state.crossPosition = null;
    
    Object.values(chartInstances).forEach(chart => {
        if (chart) {
            const option = chart.getOption();
            // Rimuove i dati dalla serie della croce
            option.series[1].data = [];
            chart.setOption(option);
        }
    });
}

function getThemeColors() {
    const isDarkTheme = document.body.classList.contains('dark-theme');
    return {
        textColor: isDarkTheme ? '#ffffff' : '#333333',
        gridLineColor: isDarkTheme ? '#4B4B4B' : '#E0E0E0',
        tooltipBackground: isDarkTheme ? 'rgba(50,50,50,0.9)' : 'rgba(255,255,255,0.9)',
        tooltipBorderColor: isDarkTheme ? '#666' : '#ddd',
        tooltipTextColor: isDarkTheme ? '#fff' : '#333'
    };
}

















