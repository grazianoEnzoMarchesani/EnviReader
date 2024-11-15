// src/chartHandlers.js

function initializeChart() {
    return echarts.init(document.getElementById('chart'));
}

function updatePlot(chart, currentData, terrainData, metadata, variableIndex, zLevel, followTerrain, colormap) {
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
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: Array.from({length: metadata.nr_xdata}, (_, i) => i),
            name: 'X'
        },
        yAxis: {
            type: 'category',
            data: Array.from({length: metadata.nr_ydata}, (_, i) => i),
            name: 'Y'
        },
        series: [{
            type: 'heatmap',
            data: plotData.flatMap((row, i) => 
                row.map((value, j) => [j, i, value])
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

    chart.setOption(option);
}