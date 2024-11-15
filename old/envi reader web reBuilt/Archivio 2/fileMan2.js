
import { DOM } from './enviropment.js';
import { state } from './enviropment.js';
import { updateVisualization } from './viz.js';
import { updatePathDisplay } from './fileMan.js';
import { updateDataMenu } from './fileMan.js';




// Inizializza il menu dei dati
export async function initializeDataMenu() {
    if (!DOM.selectDataGroup || !DOM.selectData) {
        //console.error("Elementi select necessari non trovati!");
        return;
    }

    const selectedPath = DOM.selectDataGroup.value;
    await updateDataMenu(selectedPath);
    state.filesetA = null;
    state.filesetB = null;
}


export function handleColorSchemeChange() {
    const [category, paletteNumber] = DOM.colorPaletteSelector.value.split('|');

    //console.log("Color palette changed:", selectedPalette);
    updateVisualization('filesetA');
    updateVisualization('filesetB');
}

// Aggiorna i display dei percorsi per tutti i fileset
export function updatePathDisplays() {

    ['filesetA', 'filesetB'].forEach(filesetKey => {
        const fileset = state[filesetKey];
        if (fileset) {
            updatePathDisplay(filesetKey);
        }
    });
}
