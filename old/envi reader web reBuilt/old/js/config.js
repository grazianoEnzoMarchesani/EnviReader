const COLOR_PALETTES = {
    "Blue Dominant": {
        1: ['#2b82b8', '#2ab1d5', '#59cee5', '#abe7f2', '#ccf0f7'],
        2: ['#8e9ffa', '#b9d4fe', '#7d7eac', '#5b88b8', '#5ab5d7'],
        // ... (aggiungi tutte le altre palette blu)
    },
    "Green Dominant": {
        1: ['#aab195', '#65704c', '#717a62', '#fdfae4', '#e2b079'],
        2: ['#e3d5cc', '#f3ede9', '#7e9198', '#74afab', '#b3ccaa'],
        // ... (aggiungi tutte le altre palette verdi)
    },
    "Gray/Neutral Dominant": {
        1: ['#f7f7f5', '#eceae5', '#e8e2db', '#f8f1ea', '#ece2db'],
        2: ['#b6b6b5', '#8e8f93', '#a7a19b', '#fbd391', '#edeae8'],
        // ... (aggiungi tutte le altre palette grigie/neutre)
    },
    "Brown/Beige Dominant": {
        1: ['#ecefd0', '#faf8e0', '#fbf4db', '#eed8b9', '#e0be9d'],
        2: ['#f6efdd', '#e7d6b2', '#d3b99d', '#b5989a', '#9591a5'],
        // ... (aggiungi tutte le altre palette marroni/beige)
    },
    "Pink/Purple Dominant": {
        1: ['#f8f5e8', '#f5e0d5', '#f2d6e2', '#cbcce7', '#badfe9'],
        2: ['#dde0f3', '#d3dbf1', '#c4d2f2', '#e5eaf5', '#667ca2'],
        // ... (aggiungi tutte le altre palette rosa/viola)
    },
    "Red/Orange Dominant": {
        1: ['#f2d29c', '#f5be96', '#eda08c', '#ead0ce', '#a85959'],
        2: ['#d27375', '#f29862', '#fbbe6f', '#f8d898', '#f1ebd1'],
        // ... (aggiungi tutte le altre palette rosse/arancioni)
    },
    "Yellow/Gold Dominant": {
        1: ['#4e645c', '#fec22f', '#fc9a2a', '#eed5c0', '#2c4187'],
        2: ['#b7ea63', '#fed446', '#f88f86', '#e782dd', '#bd7dfd'],
        // ... (aggiungi tutte le altre palette gialle/oro)
    }
};
// Costanti per i selettori
const SELECTORS = {
    dataGroupSelector: '#dataGroupSelector',
    dataSelector: '#dataSelector',
    openFilesetA: '#openFilesetA',
    openFilesetB: '#openFilesetB',
    timeSlider: '#timeSlider',
    sliderTitle: '.slider-title',
    incrementTimeBtn: '.slider-btn[aria-label="Increment time"]',
    decrementTimeBtn: '.slider-btn[aria-label="Decrement time"]',
    levelSlider: '#levelSlider',
    sectionXSlider: '#sectionXSlider',
    sectionYSlider: '#sectionYSlider',
    followTerrain: '#followTerrainToggle',
    windOpacitySlider: '#windOpacitySlider',
    windAnimationSlider: '#windAnimationSlider',
    windDensitySlider: '#windDensitySlider',
    savePresetButton: '#savePreset',
    visualizationContainerA: '#visualizationContainerA',
    visualizationContainerB: '#visualizationContainerB'
};

// Struttura predefinita delle cartelle
const FILE_STRUCTURE = {
    atmosphere: {},
    biomet: {
        PET: {},
        PMV: {},
        SET: {},
        UTCI: {}
    },
    radiation: {},
    receptors: {},
    soil: {},
    solaraccess: {
        ground: {},
    },
    surface: {}
};
// Stato dell'applicazione
let state = {
    filesetA: null,
    filesetB: null,
    currentTimeIndex: 0,
    isCongruent: true,
    edxVariables: [],
    dimensions: { x: 0, y: 0, z: 0 },
    differenceOrder: 'A-B',
    scaleFactor: 1
};

// Selettori DOM
const DOM = {};

// Gestione del cambio dello schema di colori
let selectedPalette = ['#2b82b8', '#2ab1d5', '#59cee5', '#abe7f2', '#ccf0f7']; // Default palette

const chartInstances = {};

const dataCache = new Map();

const debouncedUpdateVisualization = debounce(updateVisualization, 250);

