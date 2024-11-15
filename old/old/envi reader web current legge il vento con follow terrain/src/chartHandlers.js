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
                    windVectors.push([j, metadata.nr_ydata - 1 - i, u, v, mag]);
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
            }
        });
    }

    // Imposta le dimensioni del grafico per mantenere i pixel quadrati
    const chartDom = document.getElementById('chart');
    const width = chartDom.offsetWidth;
    const height = width * aspectRatio;
    chart.resize({width: width, height: height});

    chart.setOption(option);
}