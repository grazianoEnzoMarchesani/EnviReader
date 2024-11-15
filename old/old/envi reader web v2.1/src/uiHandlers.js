// src/uiHandlers.js

function updateControls(subfolders, availableTimes, metadata) {
    document.getElementById('controls').style.display = 'block';
    updateSubfolderSelect(subfolders);
    updateTimeSlider(availableTimes);
    updateVariableSelect(metadata);
    updateZLevelSlider(metadata);
    updateColormapSelect();
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