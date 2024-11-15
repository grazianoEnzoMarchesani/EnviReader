// Stato dell'applicazione
export let state = {
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
export const DOM = {};

export const chartInstances = {};
export const chartInstancesLines = {};

export const dataCache = new Map();

