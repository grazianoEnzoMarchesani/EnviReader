#!/bin/bash

# Assicurati di essere nella directory corretta
cd "$(dirname "$0")"

# Rimuovi il file script.js se esiste
rm -f script.js

# Definisci l'ordine corretto dei file
files=(
    "utils.js"
    "fileHandlers.js"
    "dataProcessors.js"
    "chartHandlers.js"
    "uiHandlers.js"
    "app.js"
    "main.js"
)

# Combina i file nell'ordine specificato
for file in "${files[@]}"
do
    if [ -f "src/$file" ]; then
        cat "src/$file" >> script.js
        echo "" >> script.js
        echo "" >> script.js
    else
        echo "Warning: File $file not found in src directory"
    fi
done

echo "File JavaScript combinati in script.js"