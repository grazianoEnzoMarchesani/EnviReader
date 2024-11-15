import os
import numpy as np
from edx_edt_reader import EDXEDTReader

def load_terrain_data(main_folder):
    try:
        ground_folder = os.path.join(main_folder, "solaraccess", "ground")
        if not os.path.exists(ground_folder):
            raise FileNotFoundError(f"Ground folder not found: {ground_folder}")
        
        terrain_files = [f for f in os.listdir(ground_folder) if f.endswith(".EDT")]
        if not terrain_files:
            raise FileNotFoundError(f"No EDT files found in: {ground_folder}")
        
        terrain_file = terrain_files[0]
        terrain_edt_path = os.path.join(ground_folder, terrain_file)
        terrain_edx_path = terrain_edt_path.replace('.EDT', '.EDX')
        
        if not os.path.exists(terrain_edx_path):
            raise FileNotFoundError(f"EDX file not found: {terrain_edx_path}")
        
        terrain_reader = EDXEDTReader(terrain_edx_path, terrain_edt_path)
        terrain_reader.process_files()
        
        num_variables = terrain_reader.metadata['nr_variables']
        
        if num_variables >= 4:
            terrain_data = terrain_reader.get_variable_data(3, z_level=0)  # Index z node Terrain is the 4th variable (index 3)
            if terrain_data is None:
                raise ValueError("Terrain data is None")
            return terrain_data
        else:
            raise ValueError("Not enough variables found in terrain file")
    except Exception as e:
        print(f"Error loading terrain data: {str(e)}")
        return None

def process_data(data, terrain_data=None, z_level=None):
    if terrain_data is not None and z_level is not None:
        processed_data = np.zeros_like(data)
        for y in range(data.shape[0]):
            for x in range(data.shape[1]):
                terrain_z = int(terrain_data[y, x])
                adjusted_z = min(max(z_level + terrain_z, 0), data.shape[2] - 1)
                processed_data[y, x] = data[y, x, adjusted_z]
        return processed_data
    elif z_level is not None:
        return data[:, :, z_level]
    else:
        raise ValueError("Either terrain_data and z_level, or z_level alone must be provided")
