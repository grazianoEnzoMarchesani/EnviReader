    DOM.levelIncrementBtn = safeQuerySelector('.slider-btn[aria-label="Increment plan level"]');
    DOM.levelDecrementBtn = safeQuerySelector('.slider-btn[aria-label="Decrement plan level"]');
    DOM.levelDecrementBtn = safeQuerySelector('.slider-btn[aria-label="Decrement plan level"]');
    DOM.sectionXIncrementBtn = safeQuerySelector('.slider-btn[aria-label="Increment section X"]');
    DOM.sectionYIncrementBtn = safeQuerySelector('.slider-btn[aria-label="Increment section Y"]');
    DOM.sectionYDecrementBtn = safeQuerySelector('.slider-btn[aria-label="Decrement section Y"]');

    DOM.selectDataGroup = safeQuerySelector(SELECTORS.dataGroupSelector);
    DOM.selectData = safeQuerySelector(SELECTORS.dataSelector);
    DOM.buttonFilesetA = safeQuerySelector(SELECTORS.openFilesetA);
    DOM.buttonFilesetB = safeQuerySelector(SELECTORS.openFilesetB);
    DOM.pathDisplayA = document.createElement('div');
    DOM.pathDisplayB = document.createElement('div');

    // Slider e relativi elementi
    DOM.timeSlider = safeQuerySelector(SELECTORS.timeSlider);
    DOM.timeLabel = safeQuerySelector(SELECTORS.sliderTitle);
    DOM.timeIncrementBtn = safeQuerySelector('.slider-btn[aria-label="Increment time"]');
    DOM.timeDecrementBtn = safeQuerySelector('.slider-btn[aria-label="Decrement time"]');
    DOM.levelSlider = safeQuerySelector(SELECTORS.levelSlider);
    DOM.levelLabel = safeQuerySelector('#levelLabel');
    DOM.sectionXSlider = safeQuerySelector(SELECTORS.sectionXSlider);
    DOM.sectionXLabel = safeQuerySelector('#sectionXLabel');
    DOM.sectionYSlider = safeQuerySelector(SELECTORS.sectionYSlider);
    DOM.sectionYLabel = safeQuerySelector('#sectionYLabel');

    // Contenitori di visualizzazione
    DOM.visualizationContainerA = safeQuerySelector(SELECTORS.visualizationContainerA);
    DOM.visualizationContainerB = safeQuerySelector(SELECTORS.visualizationContainerB);

    // Controlli aggiuntivi
    DOM.followTerrainCheckbox = safeQuerySelector(SELECTORS.followTerrain);
    DOM.windOpacitySlider = safeQuerySelector(SELECTORS.windOpacitySlider);
    DOM.windOpacityLabel = safeQuerySelector('#windOpacityLabel');
    DOM.windAnimationSlider = safeQuerySelector(SELECTORS.windAnimationSlider);
    DOM.windAnimationLabel = safeQuerySelector('#windAnimationLabel');
    DOM.windDensitySlider = safeQuerySelector(SELECTORS.windDensitySlider);
    DOM.windDensityLabel = safeQuerySelector('#windDensityLabel');
    DOM.savePresetButton = safeQuerySelector(SELECTORS.savePresetButton);

    // Log degli elementi trovati e non trovati
    const foundElements = Object.keys(DOM).filter(key => DOM[key] !== null);
    const notFoundElements = Object.keys(DOM).filter(key => DOM[key] === null);

    //console.log("Elementi DOM trovati:", foundElements);
    if (notFoundElements.length > 0) {
        //console.warn("Elementi DOM non trovati:", notFoundElements);
    }
    DOM.differenceOrderToggle = safeQuerySelector('#differenceOrderToggle');
    DOM.differenceOrderValue = safeQuerySelector('#differenceOrderValue');
    if (!DOM.followTerrainToggle) {
        //console.warn("Elemento 'followTerrainToggle' non trovato nel DOM. Alcune funzionalità potrebbero non funzionare correttamente.");
    }
}

function createPathDisplay() {
    // Crea e aggiunge i display dei percorsi
    DOM.pathDisplayA.className = 'path-display';
    DOM.pathDisplayB.className = 'path-display';
    DOM.buttonFilesetA.insertAdjacentElement('afterend', DOM.pathDisplayA);
    DOM.buttonFilesetB.insertAdjacentElement('afterend', DOM.pathDisplayB);
}

function initResizeListener() {
    window.addEventListener('resize', debounce(() => {
        updateChartContainers();
        resizeAllCharts();
    }, 250));
}

function initializeColorPaletteSelector() {
    const selectedPalette = document.querySelector('.selected-palette');
    const paletteOptions = document.querySelector('.palette-options');

    if (!selectedPalette || !paletteOptions) {
        //console.error("Elementi del selettore della palette di colori non trovati!");
        return;
    }

    selectedPalette.addEventListener('click', () => {
        paletteOptions.classList.toggle('show');
    });

    // Chiudi il selettore quando si clicca fuori
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.color-palette-selector')) {
            paletteOptions.classList.remove('show');
        }
    });

    populateColorPaletteSelector();
}

function populateColorPaletteSelector() {
    const paletteSelector = document.querySelector('.color-palette-selector');
    const paletteOptions = paletteSelector.querySelector('.palette-options');

    if (!paletteSelector || !paletteOptions) {
        //console.error("Elementi del selettore della palette di colori non trovati!");
        return;
    }

    for (const category in COLOR_PALETTES) {
        for (const paletteNumber in COLOR_PALETTES[category]) {
            const palette = COLOR_PALETTES[category][paletteNumber];
            const option = document.createElement('div');
            option.classList.add('palette-option');
            option.setAttribute('data-value', `${category}|${paletteNumber}`);

            const preview = document.createElement('div');
            preview.classList.add('palette-preview');
            palette.forEach(color => {
                const colorSample = document.createElement('div');
                colorSample.classList.add('color-sample');
                colorSample.style.backgroundColor = color;
                preview.appendChild(colorSample);
            });

            const name = document.createElement('span');
            name.classList.add('palette-name');
            name.textContent = `${category} - Palette ${paletteNumber}`;

            option.appendChild(preview);
            option.appendChild(name);
            paletteOptions.appendChild(option);
        }
    }

    // Aggiungi l'event listener per la selezione della palette
    paletteOptions.addEventListener('click', handlePaletteSelection);
}

function handlePaletteSelection(event) {
    const option = event.target.closest('.palette-option');
    if (!option) return;

    const value = option.getAttribute('data-value');
    const [category, paletteNumber] = value.split('|');
    selectedPalette = COLOR_PALETTES[category][paletteNumber];

    const selectedPaletteName = document.querySelector('.selected-palette-name');
    if (selectedPaletteName) {
        selectedPaletteName.textContent = `${category} - Palette ${paletteNumber}`;
    }

    document.querySelector('.palette-options').classList.remove('show');

    //console.log("Color palette changed:", selectedPalette);
    updateVisualization('filesetA');
    updateVisualization('filesetB');
}

// Aggiunge i listener agli eventi
function addEventListeners() {

    if (DOM.levelIncrementBtn) {
        DOM.levelIncrementBtn.addEventListener('click', () => changeSliderValue(DOM.levelSlider, true));
    }
    if (DOM.levelDecrementBtn) {
        DOM.levelDecrementBtn.addEventListener('click', () => changeSliderValue(DOM.levelSlider, false));
    }
    if (DOM.sectionXIncrementBtn) {
        DOM.sectionXIncrementBtn.addEventListener('click', () => changeSliderValue(DOM.sectionXSlider, true));
    }
    if (DOM.sectionXDecrementBtn) {
        DOM.sectionXDecrementBtn.addEventListener('click', () => changeSliderValue(DOM.sectionXSlider, false));
    }
    if (DOM.sectionYIncrementBtn) {
        DOM.sectionYIncrementBtn.addEventListener('click', () => changeSliderValue(DOM.sectionYSlider, true));
    }
    if (DOM.sectionYDecrementBtn) {
        DOM.sectionYDecrementBtn.addEventListener('click', () => changeSliderValue(DOM.sectionYSlider, false));
    }

    if (DOM.selectDataGroup) {
        DOM.selectDataGroup.addEventListener('change', handleDataGroupChange);
    }

    if (DOM.buttonFilesetA) {
        DOM.buttonFilesetA.addEventListener('click', () => {
            updateFileset('filesetA');
        });
    }

    if (DOM.buttonFilesetB) {
        DOM.buttonFilesetB.addEventListener('click', () => {
            updateFileset('filesetB');
        });
    }

    if (DOM.timeSlider) {
        DOM.timeSlider.addEventListener('change', handleTimeSliderChange);
    }

    if (DOM.timeIncrementBtn) {
        DOM.timeIncrementBtn.addEventListener('click', incrementTime);
    }

    if (DOM.timeDecrementBtn) {
        DOM.timeDecrementBtn.addEventListener('click', decrementTime);
    }

    if (DOM.selectData) {
        DOM.selectData.addEventListener('change', () => {
            //console.log("Variabile selezionata:", DOM.selectData.value);
            updateVisualization('filesetA');
            updateVisualization('filesetB');
        });
    }

    if (DOM.levelSlider) {
        DOM.levelSlider.addEventListener('change', handleLevelSliderChange);
    }

    if (DOM.sectionXSlider) {
        DOM.sectionXSlider.addEventListener('change', handleSectionXSliderChange);
    }

    if (DOM.sectionYSlider) {
        DOM.sectionYSlider.addEventListener('change', handleSectionYSliderChange);
    }

    if (DOM.followTerrainToggle) {
        DOM.followTerrainToggle.addEventListener('click', handleFollowTerrainToggle);
    } else {
        //console.warn("Impossibile aggiungere l'event listener per 'followTerrainToggle'. L'elemento non è stato trovato.");
    }

    if (DOM.windOpacitySlider) {
        DOM.windOpacitySlider.addEventListener('change', updateWindOpacityLabel);
    }

    if (DOM.windAnimationSlider) {
        DOM.windAnimationSlider.addEventListener('change', updateWindAnimationLabel);
    }

    if (DOM.windDensitySlider) {
        DOM.windDensitySlider.addEventListener('change', updateWindDensityLabel);
    }

    if (DOM.savePresetButton) {
        DOM.savePresetButton.addEventListener('click', handleSavePreset);
    }
    if (DOM.differenceOrderToggle) {
        DOM.differenceOrderToggle.addEventListener('click', handleDifferenceOrderToggle);
    }
    if (DOM.differenceOrderValue) {
        DOM.differenceOrderValue.textContent = state.differenceOrder;
    }
    const scaleSlider = document.getElementById('scaleSlider');
    if (scaleSlider) {
        scaleSlider.addEventListener('change', handleScaleChange);
    }
}

// Inizializza il toggle della sidebar
function initSidebarToggle() {
    const toggleButton = document.getElementById('toggle-sidebar');
    const container = document.querySelector('.container');

    toggleButton.addEventListener('click', () => {
        container.classList.toggle('sidebar-hidden');
        container.classList.toggle('sidebar-visible');
        updateButtonRotation();

        handleResize();

        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 300);
    });
}

// Inizializza il menu dei dati
async function initializeDataMenu() {
    if (!DOM.selectDataGroup || !DOM.selectData) {
        //console.error("Elementi select necessari non trovati!");
        return;
    }

    const selectedPath = DOM.selectDataGroup.value;
    await updateDataMenu(selectedPath);
    state.filesetA = null;
    state.filesetB = null;
}

// Funzione di inizializzazione
async function init() {
initResizeListener();
    debugChartUpdates();
    const cleanup = () => {
        window.removeEventListener('resize', handleResize);
        cleanupCharts();
    };
    window.addEventListener('beforeunload', cleanup);

    initializeDOMReferences();
    createPathDisplay();
    initializeColorPaletteSelector(); // Questa è la chiamata corretta

    if (DOM.selectDataGroup) {
        await populateDataGroupDropdown();
        DOM.selectDataGroup.value = DOM.selectDataGroup.options[0].value;
    } else {
        //console.error("Elemento select per il gruppo di dati non trovato durante l'inizializzazione!");
    }

    addEventListeners();
    initSidebarToggle();
    handleResize();

    window.addEventListener('resize', handleResize);

    const container = document.querySelector('.container');
    if (!container.classList.contains('sidebar-hidden')) {
        container.classList.add('sidebar-visible');
    }

    // Lazy load delle funzionalità non essenziali
    setTimeout(() => {
        updateSliderRanges();
        updateAllLabels();
        if (DOM.timeSlider && DOM.selectDataGroup) {
            updateTimeSlider();
        }
        initializeDataMenu();
    }, 0);
    window.addEventListener('resize', debounce(resizeAllCharts, 250));
}

// Event listener per il caricamento del DOM
document.addEventListener('DOMContentLoaded', init);

// Gestione del tema scuro/chiaro
document.addEventListener('DOMContentLoaded', () => {
    const themeSwitcher = document.getElementById('theme-icon');

    const currentTheme = localStorage.getItem('theme') || 'light';
    document.body.classList.add(`${currentTheme}-mode`);
    themeSwitcher.classList.add(currentTheme === 'light' ? 'icon-sun' : 'icon-moon');

    themeSwitcher.addEventListener('click', () => {
        const isLight = document.body.classList.contains('light-mode');
        document.body.classList.toggle('light-mode', !isLight);
        document.body.classList.toggle('dark-mode', isLight);
        themeSwitcher.classList.toggle('icon-sun', !isLight);
        themeSwitcher.classList.toggle('icon-moon', isLight);

        localStorage.setItem('theme', isLight ? 'dark' : 'light');
        updateChartsTextColor();
    });
});
