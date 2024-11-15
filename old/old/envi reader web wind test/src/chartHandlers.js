// src/chartHandlers.js

function initializeChart() {
    return echarts.init(document.getElementById('chart'));
}

function updatePlot(chart, currentData, terrainData, metadata, variableIndex, zLevel, followTerrain, colormap, windData, windSettings) {
    console.log('updatePlot called with:', {
        currentData, metadata, variableIndex, zLevel, followTerrain, colormap, windData, windSettings
    });

    if (!currentData || !metadata) {
        console.error('No data or metadata available for plotting');
        return;
    }

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
                if (params.seriesType === 'flowGL') {
                    return `X: ${params.data[0]}<br>Y: ${params.data[1]}<br>Wind Speed: ${params.data[2].toFixed(2)} m/s`;
                }
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
        xAxis: {
            type: 'value',
            name: 'X',
            nameLocation: 'middle',
            nameGap: 25,
            min: 0,
            max: metadata.nr_xdata - 1
        },
        yAxis: {
            type: 'value',
            name: 'Y',
            nameLocation: 'middle',
            nameGap: 25,
            min: 0,
            max: metadata.nr_ydata - 1
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

    if (windSettings.show && windData) {
        const windFieldData = generateWindFieldData(windData, zLevel, metadata.nr_xdata, metadata.nr_ydata, windSettings.density);
        
        option.series.push({
            type: 'flowGL',
            data: windFieldData,
            particleDensity: 128,
            particleSize: 3,
            particleSpeed: windSettings.scale / 10,
            gridWidth: metadata.nr_xdata,
            gridHeight: metadata.nr_ydata,
            itemStyle: {
                opacity: windSettings.opacity
            }
        });
    }

    chart.setOption(option, true);
}

function generateWindFieldData(windData, zLevel, width, height, density) {
    if (!windData || !windData['Flow u (m/s)'] || !windData['Flow v (m/s)'] || !windData['Flow w (m/s)']) {
        console.error('Invalid wind data');
        return [];
    }

    const data = [];
    const stepX = Math.max(1, Math.floor(width / density));
    const stepY = Math.max(1, Math.floor(height / density));

    for (let y = 0; y < height; y += stepY) {
        for (let x = 0; x < width; x += stepX) {
            const u = windData['Flow u (m/s)'][zLevel][y][x];
            const v = windData['Flow v (m/s)'][zLevel][y][x];
            const w = windData['Flow w (m/s)'][zLevel][y][x];
            
            if (u !== -999 && v !== -999 && w !== -999) {
                const speed = Math.sqrt(u*u + v*v + w*w);
                data.push([x, y, speed, u / speed, v / speed]);
            }
        }
    }

    return data;
}

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