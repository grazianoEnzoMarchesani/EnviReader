// build.js
const fs = require('fs');
const path = require('path');

const files = [
    'utils.js',
    'fileHandlers.js',
    'dataProcessors.js',
    'chartHandlers.js',
    'uiHandlers.js',
    'app.js',
    'main.js'
];

let combined = '';

files.forEach(file => {
    const content = fs.readFileSync(path.join(__dirname, 'src', file), 'windows-1252');
    combined += content + '\n\n';
});

fs.writeFileSync(path.join(__dirname, 'script.js'), combined);

console.log('Files combined successfully into script.js');