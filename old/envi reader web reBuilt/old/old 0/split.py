import os
import re

def split_js_file(input_file, output_folder, max_size):
    # Crea la cartella di output se non esiste
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    # Legge il contenuto del file di input
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Divide il contenuto in blocchi di codice
    blocks = re.split(r'\n\s*\n', content)

    current_file = []
    current_size = 0
    file_count = 1

    for block in blocks:
        block_size = len(block.encode('utf-8'))
        
        if current_size + block_size > max_size and current_file:
            # Scrive il file corrente
            write_file(output_folder, file_count, current_file)
            file_count += 1
            current_file = []
            current_size = 0

        current_file.append(block)
        current_size += block_size

    # Scrive l'ultimo file se ci sono blocchi rimanenti
    if current_file:
        write_file(output_folder, file_count, current_file)

def write_file(output_folder, count, content):
    filename = os.path.join(output_folder, f"logic_part{count}.js")
    with open(filename, 'w', encoding='utf-8') as f:
        f.write('\n\n'.join(content))

# Imposta i parametri
input_file = 'logic.js'
output_folder = 'output'
max_size = 15 * 1024  # 20 KB in byte

# Esegue la funzione principale
split_js_file(input_file, output_folder, max_size)

print("Suddivisione completata!")