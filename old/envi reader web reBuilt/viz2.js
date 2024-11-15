
import { state } from './enviropment.js';
import { chartInstances } from './enviropment.js';
import { chartInstancesLines } from './enviropment.js';
import { selectedPalette } from './fileMan.js';
import { selectedDifferencePalette } from './fileMan.js';


import { handleChartClick } from './events.js';


export function resizeChartContainers() {
    const filesetCount = state.filesetB ? 3 : 1; // Includiamo anche il container della differenza
    let maxWidth = 0;
    let maxHeight = 0;

    // Calcola le dimensioni massime per tutti i tipi di grafici
    ['level', 'section-x', 'section-y'].forEach(viewType => {
        const optimalSize = calculateOptimalChartSize([], state.dimensions, viewType, filesetCount);
        maxWidth = Math.max(maxWidth, optimalSize.width);
        maxHeight = Math.max(maxHeight, optimalSize.height);
    });

    // Applica le dimensioni massime a tutti i grafici
    Object.keys(chartInstances).forEach(chartKey => {
        const chart = chartInstances[chartKey];
        if (chart) {
            const container = chart.getDom();
            const scaledWidth = maxWidth;
            const scaledHeight = maxHeight;

            container.style.width = `${scaledWidth}px`;
            container.style.height = `${scaledHeight}px`;
            chart.resize({ width: scaledWidth, height: scaledHeight });

            // Aggiorna le opzioni del grafico per adattarsi alle nuove dimensioni
            const option = chart.getOption();
            option.grid = {
                left: '10%',
                right: '15%',
                top: '60',
                bottom: '10%',
                containLabel: true
            };
            chart.setOption(option);
        }
    });

    // Aggiorna il grafico delle serie temporali
    if (chartInstancesLines['timeSeries']) {
        const timeSeriesChart = chartInstancesLines['timeSeries'];
        const container = timeSeriesChart.getDom();
        const parentWidth = container.parentElement.clientWidth;
        const scaledWidth = parentWidth - 40; // 40px per il padding
        const scaledHeight = maxHeight;

        container.style.width = `${scaledWidth}px`;
        container.style.height = `${scaledHeight}px`;
        timeSeriesChart.resize({ width: scaledWidth, height: scaledHeight });
    }
}

function calculateOptimalChartSize(data, dimensions, viewType, filesetCount) {
    const minWidth = 200;
    const minHeight = 150;
    const legendWidth = 80;
    const titleHeight = 40;
    const padding = 20;

    let contentWidth, contentHeight;

    if (viewType === 'level') {
        contentWidth = dimensions.x;
        contentHeight = dimensions.y;
    } else if (viewType === 'section-x') {
        contentWidth = dimensions.y;
        contentHeight = dimensions.z;
    } else if (viewType === 'section-y') {
        contentWidth = dimensions.x;
        contentHeight = dimensions.z;
    } else {
        // Per il grafico delle serie temporali
        contentWidth = window.innerWidth * 0.9;
        contentHeight = window.innerHeight * 0.3;
    }

    const aspectRatio = contentWidth / contentHeight;

    let initialWidth = Math.max(minWidth, contentWidth * 2 + legendWidth + padding);
    let initialHeight = Math.max(minHeight, (initialWidth - legendWidth - padding) / aspectRatio + titleHeight + padding);

    const availableWidth = window.innerWidth * (1 / filesetCount) - padding;
    const availableHeight = window.innerHeight * 0.7;

    let optimalWidth = Math.min(initialWidth, availableWidth);
    let optimalHeight = Math.min(initialHeight, availableHeight);

    // Assicuriamoci che l'altezza sia proporzionale alla larghezza considerando la legenda
    optimalHeight = Math.max(optimalHeight, (optimalWidth - legendWidth - padding) / aspectRatio + titleHeight + padding);

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
        visualizationContainer.appendChild(chartContainer);

        const titleContainer = document.createElement('div');
        titleContainer.className = 'title-container';
        titleContainer.style.display = 'flex';
        titleContainer.style.alignItems = 'baseline';
        titleContainer.style.marginBottom = '10px';

        const titleElement = document.createElement('h3');
        titleElement.textContent = viewTitle;
        titleElement.style.marginRight = '10px';
        titleElement.setAttribute('data-original-font-size', '16');
        titleContainer.appendChild(titleElement);

        const subtitleElement = document.createElement('span');
        subtitleElement.className = 'chart-subtitle';
        subtitleElement.style.fontSize = '0.8em';
        subtitleElement.style.fontWeight = 'light';
        subtitleElement.setAttribute('data-original-font-size', '12.8');
        titleContainer.appendChild(subtitleElement);

        chartContainer.appendChild(titleContainer);

        const infoDiv = document.createElement('div');
        infoDiv.className = 'info-div';
        infoDiv.style.cssText = 'font-family: Helvetica, Arial, sans-serif; font-style: italic; font-size: 0.8em; margin-top: 1px; margin-bottom: 10px;';
        infoDiv.setAttribute('data-original-font-size', '12.8');
        chartContainer.appendChild(infoDiv);

        const chartDiv = document.createElement('div');
        chartDiv.className = 'echarts-container';
        chartContainer.appendChild(chartDiv);
    }

    const filesetCount = state.filesetB ? 3 : 1;
    const optimalSize = calculateOptimalChartSize(sliceData, dimensions, viewType, filesetCount);

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
        grid: {
            left: '10%',
            right: '15%',
            top: '60',
            bottom: '10%',
            containLabel: true
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
            orient: 'vertical',
            left: 0,
            top: 0,
            inRange: {
                color: palette
            },
            textStyle: {
                color: '#ffffff',
                fontSize: 11
            },
            itemWidth: 20,
            itemHeight: 140,
            formatter: function (value) {
                return value.toFixed(2);
            },
        },
        series: [{
            type: 'custom',
            renderItem: (params, api) => {
                const rowIndex = api.value(1);
                const colIndex = api.value(0);

                const startY = rowHeights.slice(0, rowIndex).reduce((a, b) => a + b, 0);
                const startX = columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0) + 90;

                const width = columnWidths[colIndex];
                const height = rowHeights[rowIndex];

                return {
                    type: 'rect',
                    shape: {
                        x: startX / 1.2,
                        y: (totalHeight - startY - rowHeights[rowIndex]) / 1.2,
                        width: width * 1.05,
                        height: height * 1.05,
                    },
                    style: {
                        fill: api.visual('color'),
                    }
                };
            },
            data: data
        }]
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
            const [xIndex, yIndex] = params.data;
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

    const infoDiv = chartContainer.querySelector('.info-div');
    infoDiv.textContent = `${variableName}, Min: ${minValue.toFixed(2)}, Max: ${maxValue.toFixed(2)}, Null values: ${sliceData.filter(v => v === null || isNaN(v)).length}`;
    if (filesetKey === 'filesetDiff') {
        infoDiv.textContent += `, Difference: ${differenceOrder}`;
    }
}

export function visualizeTimeSeries(data, variableName) {
    const chartDiv = document.getElementById('timeSeriesChart');
    if (!chartDiv) {
        console.error('Element timeSeriesChart not found');
        return;
    }

    showLoading('timeSeriesChart');

    if (chartInstancesLines['timeSeries']) {
        chartInstancesLines['timeSeries'].dispose();
    }

    const containerWidth = chartDiv.parentElement.clientWidth - 40; // 40px per il padding
    const containerHeight = 400; // o usa una percentuale dell'altezza della finestra

    const chart = echarts.init(chartDiv, 'light', {
        renderer: 'svg',
        width: containerWidth,
        height: containerHeight
    });
    chartInstancesLines['timeSeries'] = chart;
    // Funzione helper per formattare i numeri con massimo 2 decimali
    const formatNumber = (value) => {
        return value !== null ? Number(value).toFixed(2) : 'N/A';
    };

    const option = {
      
        title: {
            text: `Time Series Comparison: ${variableName}`,
            left: 'center',
            textStyle: {
                color: '#ffffff'
            }
        },
        tooltip: {
            trigger: 'axis',
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
                color: '#ffffff'
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
                borderColor: '#ffffff'
            }
        },
        xAxis: {
            type: 'time',
            boundaryGap: false,
            splitLine: {
                show: false
            },
            axisLine: {
                lineStyle: {
                    color: '#ffffff'
                }
            },
            axisLabel: {
                color: '#ffffff'
            }
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter: function (value) {
                    return `${formatNumber(value)}`;
                },
                color: '#ffffff'
            },
            splitLine: {
                show: true,
                lineStyle: {
                    color: 'rgba(255,255,255,0.1)'
                }
            },
            axisLine: {
                lineStyle: {
                    color: '#ffffff'
                }
            }
        },
        series: [
            {
                name: 'Fileset A',
                type: 'line',
                data: data.map(item => [item.date, item.valueA]),
                connectNulls: true,
                lineStyle: {
                    color: '#59cee5'
                },
                itemStyle: {
                    color: '#59cee5'
                },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(89, 206, 229, 0.5)' },
                        { offset: 1, color: 'rgba(89, 206, 229, 0.1)' }
                    ])
                },

                markLine: {
                    data: [{ type: 'average', name: 'Avg' }],
                    label: {
                        color: '#ffffff',
                        formatter: function (params) {
                            return `${params.name}: ${formatNumber(params.value)}`;
                        }
                    }
                }
            },
            {
                name: 'Fileset B',
                type: 'line',
                data: data.map(item => [item.date, item.valueB]),
                connectNulls: true,
                lineStyle: {
                    color: '#fac172'
                },
                itemStyle: {
                    color: '#fac172'
                },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(250, 193, 114, 0.5)' },
                        { offset: 1, color: 'rgba(250, 193, 114, 0.1)' }
                    ])
                },

                markLine: {
                    data: [
                        { type: 'average', name: 'Avg' }
                    ],
                    label: {
                        color: '#ffffff',
                        formatter: function (params) {
                            return `${params.name}: ${formatNumber(params.value)}`;
                        }
                    }
                }
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


