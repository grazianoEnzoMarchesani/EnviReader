import re
import struct
import numpy as np

class EDXEDTReader:
    def __init__(self, edx_file, edt_file):
        self.edx_file = edx_file
        self.edt_file = edt_file
        self.metadata = {}
        self.data = None

    # Legge il file EDX e estrae i metadati
    def read_edx(self):
        with open(self.edx_file, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()

        self.metadata['data_type'] = int(re.search(r'<data_type>\s*(\d+)', content).group(1))
        self.metadata['data_content'] = int(re.search(r'<data_content>\s*(\d+)', content).group(1))
        self.metadata['nr_xdata'] = int(re.search(r'<nr_xdata>\s*(\d+)', content).group(1))
        self.metadata['nr_ydata'] = int(re.search(r'<nr_ydata>\s*(\d+)', content).group(1))
        self.metadata['nr_zdata'] = int(re.search(r'<nr_zdata>\s*(\d+)', content).group(1))
        
        # Estrae le variabili dal file EDX
        variables_match = re.search(r'<variables>(.*?)</variables>', content, re.DOTALL)
        if variables_match:
            variables_content = variables_match.group(1)
            self.metadata['nr_variables'] = int(re.search(r'<nr_variables>\s*(\d+)', variables_content).group(1))
            name_variables_match = re.search(r'<name_variables>(.*?)</name_variables>', variables_content, re.DOTALL)
            if name_variables_match:
                self.metadata['name_variables'] = [name.strip() for name in name_variables_match.group(1).split(',')]
            else:
                self.metadata['name_variables'] = []

    # Legge il file EDT e estrae i dati binari
    def read_edt(self):
        with open(self.edt_file, 'rb') as f:
            binary_data = f.read()

        total_floats = (
            self.metadata['nr_xdata'] *
            self.metadata['nr_ydata'] *
            self.metadata['nr_zdata'] *
            self.metadata['nr_variables']
        )

        float_data = struct.unpack(f'{total_floats}f', binary_data)

        # Riorganizza i dati in un array numpy
        self.data = np.array(float_data).reshape(
            self.metadata['nr_variables'],
            self.metadata['nr_zdata'],
            self.metadata['nr_ydata'],
            self.metadata['nr_xdata']
        )

    # Restituisce i dati di una variabile specifica
    def get_variable_data(self, variable_index):
        if variable_index < 0 or variable_index >= self.metadata['nr_variables']:
            raise ValueError("Invalid variable index")
        return self.data[variable_index]

    # Elabora i file EDX e EDT
    def process_files(self):
        self.read_edx()
        self.read_edt()
