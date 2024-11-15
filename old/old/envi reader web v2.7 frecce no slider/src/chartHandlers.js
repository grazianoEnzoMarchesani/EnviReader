// src/chartHandlers.js

function initializeChart() {
    return echarts.init(document.getElementById('chart'), null, {renderer: 'webgl'});
}


function updatePlot(chart, currentData, terrainData, metadata, variableIndex, zLevel, followTerrain, colormap, windData) {
    console.log('Updating plot with wind data:', windData, 'zLevel:', zLevel, 'followTerrain:', followTerrain);

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
                if (params.seriesType === 'heatmap') {
                    return `X: ${params.data[0]}<br>Y: ${params.data[1]}<br>Value: ${params.data[2] !== null ? params.data[2].toFixed(2) : 'N/A'}`;
                } else if (params.seriesType === 'custom') {
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

    if (windData && windData.processedData && windData.processedData.length > zLevel) {
        let windVectors = [];
        const skip = 5;

        for (let y = 0; y < metadata.nr_ydata; y += skip) {
            for (let x = 0; x < metadata.nr_xdata; x += skip) {
                let adjustedZ = zLevel;
                if (followTerrain && terrainData) {
                    adjustedZ += Math.floor(terrainData[y][x]);
                }
                if (adjustedZ >= 0 && adjustedZ < windData.processedData.length) {
                    const {u, v, mag} = windData.processedData[adjustedZ][y][x];
                    windVectors.push([x, metadata.nr_ydata - 1 - y, u, -v, mag]);
                }
            }
        }

        if (windVectors.length > 0) {
            let windValMin = Infinity;
            let windValMax = -Infinity;
            windVectors.forEach(vector => {
                windValMin = Math.min(windValMin, vector[4]);
                windValMax = Math.max(windValMax, vector[4]);
            });

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

            option.series.push({
                type: 'custom',
                renderItem: function (params, api) {
                    const point = api.coord([api.value(0), api.value(1)]);
                    const u = api.value(2);
                    const v = api.value(3);
                    const mag = api.value(4);
                    const scale = 10; // Adjust this value to change the length of the vectors
                    return {
                        type: 'line',
                        shape: {
                            x1: point[0],
                            y1: point[1],
                            x2: point[0] + u * scale,
                            y2: point[1] + v * scale
                        },
                        style: {
                            stroke: api.visual('color'),
                            lineWidth: 2
                        }
                    };
                },
                data: windVectors,
                z: 10
            });
        } else {
            console.log('No wind vectors to display for the current Z-level');
        }
    } else {
        console.log('No wind data available for plotting');
    }

    const chartDom = document.getElementById('chart');
    const width = chartDom.offsetWidth;
    const height = width * aspectRatio;
    chart.resize({width: width, height: height});

    chart.setOption(option);

    if (windData && windData.processedData && windData.processedData[zLevel]) {
        let sumU = 0, sumV = 0, sumW = 0, count = 0;
        const zData = windData.processedData[zLevel];
        for (let y = 0; y < zData.length; y++) {
            for (let x = 0; x < zData[y].length; x++) {
                const {u, v, w} = zData[y][x];
                sumU += u;
                sumV += v;
                sumW += w;
                count++;
            }
        }
        const avgU = sumU / count;
        const avgV = sumV / count;
        const avgW = sumW / count;
        console.log(`[INFO] Wind data at Z-level ${zLevel}:`);
        console.log(`[INFO] Average U component: ${avgU.toFixed(2)} m/s`);
        console.log(`[INFO] Average V component: ${avgV.toFixed(2)} m/s`);
        console.log(`[INFO] Average W component: ${avgW.toFixed(2)} m/s`);
    }
}