const fs = require('fs');
const path = 'public/translations.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

if (data.en && data.en.shortcut_toggle_sidebar) data.en.shortcut_toggle_sidebar = "Toggle Toolbars";
if (data.it && data.it.shortcut_toggle_sidebar) data.it.shortcut_toggle_sidebar = "Mostra / nascondi barre strumenti";
if (data.de && data.de.shortcut_toggle_sidebar) data.de.shortcut_toggle_sidebar = "Symbolleisten ein- / ausblenden";
if (data.es && data.es.shortcut_toggle_sidebar) data.es.shortcut_toggle_sidebar = "Mostrar / ocultar barras de herramientas";
if (data.fr && data.fr.shortcut_toggle_sidebar) data.fr.shortcut_toggle_sidebar = "Afficher / masquer les barres d'outils";

fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
console.log("Success");
