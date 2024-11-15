
/************         Funzioni di gestione degli eventi         ************/


// Gestisce il cambio di gruppo dati
async function handleDataGroupChange() {
    const selectedPath = DOM.selectDataGroup.value;

    await reloadEDXFiles(selectedPath);
    await updateDataMenu(selectedPath);

    if (DOM.selectData.options.length > 0) {
        updateTimeSlider();
        updateTimeButtons();
        updatePathDisplays();
        updateSliderRanges();

        if (state.filesetA && state.filesetA.edxData) logExtractedValues('filesetA');
        if (state.filesetB && state.filesetB.edxData) logExtractedValues('filesetB');

        await updateVisualization('filesetA');
        await updateVisualization('filesetB');
    } else {
        //console.warn("Nessun dato disponibile per il percorso selezionato.");
    }
}

// Gestione del cambio dello slider del tempo
async function handleTimeSliderChange() {
    updateTimeLabel();
    updateTimeButtons();
    await updateVisualization('filesetA');
    await updateVisualization('filesetB');
}
// Gestione del cambio dello slider del livello
function handleLevelSliderChange() {
    updateLevelLabel();
    updateVisualization('filesetA');
    updateVisualization('filesetB');
}

// Gestisce il cambio dello slider della sezione X
async function handleSectionXSliderChange() {
    updateSectionXLabel();
    await updateVisualization('filesetA');
    await updateVisualization('filesetB');
}


// Gestione del cambio dello slider della sezione Y
async function handleSectionYSliderChange() {
    updateSectionYLabel();
    await updateVisualization('filesetA');
    await updateVisualization('filesetB');
}
function handleColorSchemeChange() {
    const [category, paletteNumber] = DOM.colorPaletteSelector.value.split('|');
    selectedPalette = COLOR_PALETTES[category][paletteNumber];
    //console.log("Color palette changed:", selectedPalette);
    updateVisualization('filesetA');
    updateVisualization('filesetB');
}
// Gestione del cambio dell'opacità del vento
function handleWindOpacityChange() {
    //console.log("Wind opacity:", DOM.windOpacitySlider.value);
    updateVisualization('filesetA');
    updateVisualization('filesetB');
}

// Gestione del cambio dell'animazione del vento
function handleWindAnimationChange() {
    //console.log("Wind animation:", DOM.windAnimationSlider.value);
    updateVisualization('filesetA');
    updateVisualization('filesetB');
}

// Gestione del cambio della densità del vento
function handleWindDensityChange() {
    //console.log("Wind density", DOM.windDensitySlider.value);
    updateVisualization('filesetA');
    updateVisualization('filesetB');
}

// Gestione del salvataggio dei preset
function handleSavePreset() {
    //console.log("Saving preset");
    // Implementare la logica per salvare il preset
}


// Gestione del toggle "Follow Terrain"
async function handleFollowTerrainToggle() {
    if (!DOM.followTerrainToggle) {
        //console.error("Elemento 'followTerrainToggle' non trovato. Impossibile gestire il toggle.");
        return;
    }

    handleToggleButton(DOM.followTerrainToggle, async (isEnabled) => {
        //console.log("Follow terrain:", isEnabled);
        if (isEnabled) {
            state.terrainDataA = await loadTerrainData('filesetA');
            state.terrainDataB = state.filesetB ? await loadTerrainData('filesetB') : null;

            if (!state.terrainDataA && (!state.filesetB || !state.terrainDataB)) {
                //console.warn("Impossibile caricare i dati del terreno. La funzione 'Follow terrain' potrebbe non funzionare correttamente.");
                DOM.followTerrainToggle.setAttribute('aria-checked', 'false');
                state.terrainDataA = null;
                state.terrainDataB = null;
            }
        } else {
            state.terrainDataA = null;
            state.terrainDataB = null;
        }

        await updateVisualization('filesetA');
        if (state.filesetB) await updateVisualization('filesetB');
    });
}

function handleDifferenceOrderToggle() {
    handleToggleButton(DOM.differenceOrderToggle, (isAMinusB) => {
        state.differenceOrder = isAMinusB ? 'A-B' : 'B-A';
        if (DOM.differenceOrderValue) {
            DOM.differenceOrderValue.textContent = state.differenceOrder;
        }
        updateVisualization('filesetA');
        updateVisualization('filesetB');
    });
}

// Gestione del cambio dei dati selezionati
function handleDataChange() {
    updateVisualization('filesetA');
    updateVisualization('filesetB');
}

// Gestione del resize della finestra
function handleResize() {
    const container = document.querySelector('.container');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const isMobile = window.innerWidth <= 768;
    const isSidebarVisible = !container.classList.contains('sidebar-hidden');

    if (isMobile) {
        sidebar.style.height = '350px';
        sidebar.style.width = '100%';
        mainContent.style.marginTop = isSidebarVisible ? '350px' : '0';
        mainContent.style.marginLeft = '0';
    } else {
        sidebar.style.height = '100%';
        sidebar.style.width = '350px';
        mainContent.style.marginTop = '0';
        mainContent.style.marginLeft = isSidebarVisible ? '350px' : '0'; // Aggiornato da 300px a 320px
    }

    updateButtonRotation();
}

function handleChartClick(viewType, xIndex, yIndex) {
    let updateNeeded = false;

    switch (viewType) {
        case 'level':
            if (DOM.sectionXSlider.value != xIndex || DOM.sectionYSlider.value != yIndex) {
                DOM.sectionXSlider.value = xIndex;
                DOM.sectionYSlider.value = yIndex;
                updateSectionXLabel();
                updateSectionYLabel();
                updateNeeded = true;
            }
            break;
        case 'section-x':
            if (DOM.sectionYSlider.value != xIndex || DOM.levelSlider.value != yIndex) {
                DOM.sectionYSlider.value = xIndex;
                DOM.levelSlider.value = yIndex;
                updateSectionYLabel();
                updateLevelLabel();
                updateNeeded = true;
            }
            break;
        case 'section-y':
            if (DOM.sectionXSlider.value != xIndex || DOM.levelSlider.value != yIndex) {
                DOM.sectionXSlider.value = xIndex;
                DOM.levelSlider.value = yIndex;
                updateSectionXLabel();
                updateLevelLabel();
                updateNeeded = true;
            }
            break;
    }

    if (updateNeeded) {
        // Aggiorniamo immediatamente tutte le visualizzazioni
        updateVisualization('filesetA');
        updateVisualization('filesetB');

        // Se c'è una differenza da calcolare, aggiorniamola
        if (state.filesetA && state.filesetB) {
            updateVisualization('filesetDiff');
        }
    }
}