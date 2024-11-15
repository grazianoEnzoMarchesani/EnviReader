import re
import struct
import numpy as np

class EDXEDTReader:
    def __init__(self, edx_file, edt_file):
        self.edx_file = edx_file
        self.edt_file = edt_file
        self.metadata = {}
        self.data = None

    def read_edx(self):
        if self.edx_file is None:
            self.metadata['nr_variables'] = 4
            self.metadata['nr_xdata'] = 96
            self.metadata['nr_ydata'] = 95
            self.metadata['nr_zdata'] = 53
            return

        with open(self.edx_file, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()

        self.metadata['data_type'] = int(re.search(r'<data_type>\s*(\d+)', content).group(1))
        self.metadata['data_content'] = int(re.search(r'<data_content>\s*(\d+)', content).group(1))
        self.metadata['nr_xdata'] = int(re.search(r'<nr_xdata>\s*(\d+)', content).group(1))
        self.metadata['nr_ydata'] = int(re.search(r'<nr_ydata>\s*(\d+)', content).group(1))
        self.metadata['nr_zdata'] = int(re.search(r'<nr_zdata>\s*(\d+)', content).group(1))

        variables_match = re.search(r'<variables>(.*?)</variables>', content, re.DOTALL)
        if variables_match:
            variables_content = variables_match.group(1)
            self.metadata['nr_variables'] = int(re.search(r'<nr_variables>\s*(\d+)', variables_content).group(1))
            name_variables_match = re.search(r'<name_variables>(.*?)</name_variables>', variables_content, re.DOTALL)
            if name_variables_match:
                self.metadata['name_variables'] = [name.strip() for name in name_variables_match.group(1).split(',')]
            else:
                self.metadata['name_variables'] = []

    def read_edt(self):
        with open(self.edt_file, 'rb') as f:
            binary_data = f.read()

        if self.metadata['nr_xdata'] is None or self.metadata['nr_ydata'] is None or self.metadata['nr_zdata'] is None:
            raise ValueError("Missing metadata information")

        total_floats = (
            self.metadata['nr_xdata'] *
            self.metadata['nr_ydata'] *
            self.metadata['nr_zdata'] *
            self.metadata['nr_variables']
        )

        float_data = struct.unpack(f'{total_floats}f', binary_data)

        self.data = np.array(float_data).reshape(
            self.metadata['nr_variables'],
            self.metadata['nr_zdata'],
            self.metadata['nr_ydata'],
            self.metadata['nr_xdata']
        )
        print(f'Data shape: {self.data.shape}')

    def get_variable_data(self, variable_index, z_level=None, terrain_data=None):
        if variable_index < 0 or variable_index >= self.metadata['nr_variables']:
            raise ValueError("Invalid variable index")

        if z_level is None:
            raise ValueError("Z-level must be specified")

        if terrain_data is not None:
            data = np.zeros((self.metadata['nr_ydata'], self.metadata['nr_xdata']))
            for y in range(self.metadata['nr_ydata']):
                for x in range(self.metadata['nr_xdata']):
                    terrain_z = int(terrain_data[y, x])
                    adjusted_z = min(max(z_level + terrain_z, 0), self.metadata['nr_zdata'] - 1)
                    data[y, x] = self.data[variable_index, adjusted_z, y, x]
            return data

        return self.data[variable_index, z_level]

    def process_files(self):
        self.read_edx()
        self.read_edt()
