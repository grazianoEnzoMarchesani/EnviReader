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
    let csvContent = "data:text/csv;charset=utf-8,";
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