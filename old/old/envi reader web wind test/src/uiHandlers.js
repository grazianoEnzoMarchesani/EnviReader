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

function setupWindControls() {
    const showWindField = document.getElementById('showWindField');
    const windControls = document.querySelectorAll('#windControls input:not(#showWindField)');

    showWindField.addEventListener('change', function() {
        windControls.forEach(control => {
            control.disabled = !this.checked;
        });
        app.updatePlot();
    });

    windControls.forEach(control => {
        control.addEventListener('input', () => app.updatePlot());
        control.disabled = !showWindField.checked;
    });
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

function getWindSettings() {
    return {
        show: document.getElementById('showWindField').checked,
        density: parseInt(document.getElementById('windDensity').value),
        scale: parseInt(document.getElementById('windScale').value),
        opacity: parseInt(document.getElementById('windOpacity').value) / 100
    };
}