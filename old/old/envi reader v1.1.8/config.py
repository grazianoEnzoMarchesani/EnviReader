# Configurazione dell'applicazione
APP_TITLE = "ENVI-met Advanced Output Analyzer"
WINDOW_SIZE = "1200x800"

# Impostazioni di visualizzazione
DEFAULT_COLORMAP = "viridis"
INVALID_DATA_THRESHOLD = -999

# Percorsi di default
DEFAULT_MAIN_FOLDER = ""
DEFAULT_OUTPUT_FOLDER = "output"

# Configurazione dei file
VALID_EXTENSIONS = [".EDT", ".EDX"]

# Configurazione della griglia
DEFAULT_GRID_SIZE = (100, 100, 40)  # (x, y, z)

# Impostazioni di plot
PLOT_DPI = 100
PLOT_FIGSIZE = (8, 6)

# Impostazioni di esportazione
CSV_DELIMITER = ","
CSV_ENCODING = "utf-8"

# Messaggi di errore
ERROR_NO_DATA = "No data loaded. Please load data first."
ERROR_INVALID_FILE = "Invalid file format. Please select a valid EDT/EDX file."
ERROR_MISSING_FILES = "Missing EDX or EDT file."

# Impostazioni di debug
DEBUG_MODE = True
LOG_FILE = "app.log"

# Configurazione delle variabili
TERRAIN_VARIABLE_INDEX = 3  # Indice della variabile del terreno nel file EDT

# Impostazioni di performance
CHUNK_SIZE = 3024 * 3024  # 1 MB per la lettura dei file

# Configurazione della GUI
GUI_FONT = ("Arial", 10)
GUI_PADDING = 5
