import numpy as np
import struct
import re

class EDXEDTReader:
    def __init__(self, edx_file, edt_file):
        self.edx_file = edx_file
        self.edt_file = edt_file
        self.metadata = {}
        self.data = None

    def read_edx(self):
        with open(self.edx_file, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()

        # Extract metadata using regular expressions
        self.metadata['data_type'] = int(re.search(r'<data_type>\s*(\d+)', content).group(1))
        self.metadata['data_content'] = int(re.search(r'<data_content>\s*(\d+)', content).group(1))
        self.metadata['nr_xdata'] = int(re.search(r'<nr_xdata>\s*(\d+)', content).group(1))
        self.metadata['nr_ydata'] = int(re.search(r'<nr_ydata>\s*(\d+)', content).group(1))
        self.metadata['nr_zdata'] = int(re.search(r'<nr_zdata>\s*(\d+)', content).group(1))
        
        # Extract spacing information
        spacing_x = re.search(r'<spacing_x>(.*?)</spacing_x>', content, re.DOTALL)
        spacing_y = re.search(r'<spacing_y>(.*?)</spacing_y>', content, re.DOTALL)
        spacing_z = re.search(r'<spacing_z>(.*?)</spacing_z>', content, re.DOTALL)
        
        if spacing_x:
            self.metadata['spacing_x'] = [float(x) for x in spacing_x.group(1).split(',')]
        if spacing_y:
            self.metadata['spacing_y'] = [float(y) for y in spacing_y.group(1).split(',')]
        if spacing_z:
            self.metadata['spacing_z'] = [float(z) for z in spacing_z.group(1).split(',')]

        # Extract variable information
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

    def get_variable_data(self, variable_index):
        if variable_index < 0 or variable_index >= self.metadata['nr_variables']:
            raise ValueError("Invalid variable index")
        return self.data[variable_index]

    def process_files(self):
        self.read_edx()
        self.read_edt()

# Usage
edx_file = '/Users/grazianoenzomarchesani/Desktop/jjjjjjj/ancoraSALADINI_AT_2017-08-04_11.00.00.EDX'
edt_file = '/Users/grazianoenzomarchesani/Desktop/jjjjjjj/ancoraSALADINI_AT_2017-08-04_11.00.00.EDT'

reader = EDXEDTReader(edx_file, edt_file)
reader.process_files()

# Access metadata
print("Metadata:")
for key, value in reader.metadata.items():
    if key in ['spacing_x', 'spacing_y', 'spacing_z']:
        print(f"{key}: [first few values] {value[:5]}")
    else:
        print(f"{key}: {value}")

# Access data for the first variable
first_variable_data = reader.get_variable_data(0)
print("\nShape of the first variable data:", first_variable_data.shape)

# Print the first few values of the first variable
print("\nFirst few values of the first variable:")
print(first_variable_data.flatten()[:10])  # Print first 10 values

# Print information about all variables
print("\nVariable Information:")
for i, name in enumerate(reader.metadata['name_variables']):
    var_data = reader.get_variable_data(i)
    print(f"Variable {i}: {name}")
    print(f"  Shape: {var_data.shape}")
    print(f"  Min: {np.min(var_data)}, Max: {np.max(var_data)}")
    print(f"  Mean: {np.mean(var_data)}, Median: {np.median(var_data)}")
    print()
