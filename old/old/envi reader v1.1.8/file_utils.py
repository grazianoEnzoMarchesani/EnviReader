import os
import re

def scan_subfolder(subfolder):
    available_times = []
    file_mapping = {}

    try:
        for file in os.listdir(subfolder):
            if file.endswith(".EDT") or file.endswith(".EDX"):
                match = re.search(r'_(\d{4}-\d{2}-\d{2}(?:_\d{2}\.\d{2}\.\d{2})?)\.(EDT|EDX)$', file)
                if match:
                    time_str = match.group(1)
                    file_type = match.group(2)

                    if time_str not in file_mapping:
                        file_mapping[time_str] = {'EDT': None, 'EDX': None}

                    file_mapping[time_str][file_type] = os.path.join(subfolder, file)

                    if file_type == 'EDT':
                        available_times.append(time_str)

        available_times.sort()
        return available_times, file_mapping
    except Exception as e:
        print(f"Error scanning subfolder: {str(e)}")
        return [], {}

def update_subfolder_list(main_folder):
    subfolders = []
    try:
        for root, dirs, files in os.walk(main_folder):
            for file in files:
                if file.endswith(".EDT") or file.endswith(".EDX"):
                    relative_path = os.path.relpath(root, main_folder)
                    if relative_path not in subfolders:
                        subfolders.append(relative_path)
        subfolders.sort()
        return subfolders
    except Exception as e:
        print(f"Error updating subfolder list: {str(e)}")
        return []

def get_file_info(file_path):
    file_name = os.path.basename(file_path)
    file_size = os.path.getsize(file_path)
    modification_time = os.path.getmtime(file_path)
    return {
        'name': file_name,
        'size': file_size,
        'modified': modification_time
    }

def create_directory(directory):
    if not os.path.exists(directory):
        os.makedirs(directory)
        print(f"Created directory: {directory}")
    else:
        print(f"Directory already exists: {directory}")

def list_files_with_extension(directory, extension):
    return [f for f in os.listdir(directory) if f.endswith(extension)]
