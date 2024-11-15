import tkinter as tk
from tkinter import filedialog, ttk, messagebox
import os
import numpy as np
import struct
import re
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg, NavigationToolbar2Tk
from matplotlib.figure import Figure
import pandas as pd
from datetime import datetime

class EDXEDTReader:
    def __init__(self, edx_file, edt_file):
        self.edx_file = edx_file
        self.edt_file = edt_file
        self.metadata = {}
        self.data = None

    def read_edx(self):
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

class ENVImetAdvancedAnalyzer:
    def __init__(self, master):
        self.master = master
        self.master.title("ENVI-met Advanced Output Analyzer")
        self.master.geometry("1200x800")

        self.main_folder_path = tk.StringVar()
        self.subfolder_path = tk.StringVar()
        self.available_times = []
        self.file_mapping = {}
        self.reader = None
        self.current_variable = tk.StringVar()
        self.current_z = tk.IntVar(value=0)
        self.colormap = tk.StringVar(value="viridis")

        self.create_widgets()

    def create_widgets(self):
        main_frame = ttk.Frame(self.master)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        left_panel = ttk.Frame(main_frame)
        left_panel.pack(side=tk.LEFT, fill=tk.Y, padx=(0, 10))

        ttk.Label(left_panel, text="Main Output Folder:").pack(anchor="w")
        ttk.Entry(left_panel, textvariable=self.main_folder_path, width=40).pack(fill=tk.X)
        ttk.Button(left_panel, text="Browse Main Folder", command=self.browse_main_folder).pack(anchor="w")

        ttk.Label(left_panel, text="Select Subfolder:").pack(anchor="w", pady=(10, 0))
        self.subfolder_combo = ttk.Combobox(left_panel, textvariable=self.subfolder_path, state="readonly")
        self.subfolder_combo.pack(fill=tk.X)
        self.subfolder_combo.bind("<<ComboboxSelected>>", self.scan_subfolder)

        ttk.Label(left_panel, text="Select Time:").pack(anchor="w", pady=(10, 0))
        self.time_combo = ttk.Combobox(left_panel, state="readonly")
        self.time_combo.pack(fill=tk.X)
        self.time_combo.bind("<<ComboboxSelected>>", self.load_data)

        ttk.Label(left_panel, text="Select Variable:").pack(anchor="w", pady=(10, 0))
        self.var_combo = ttk.Combobox(left_panel, textvariable=self.current_variable, state="readonly")
        self.var_combo.pack(fill=tk.X)
        self.var_combo.bind("<<ComboboxSelected>>", self.update_plot)

        ttk.Label(left_panel, text="Z-level:").pack(anchor="w", pady=(10, 0))
        self.z_scale = ttk.Scale(left_panel, from_=0, to=0, variable=self.current_z, command=self.update_plot)
        self.z_scale.pack(fill=tk.X)

        ttk.Label(left_panel, text="Colormap:").pack(anchor="w", pady=(10, 0))
        colormap_combo = ttk.Combobox(left_panel, textvariable=self.colormap, values=plt.colormaps(), state="readonly")
        colormap_combo.pack(fill=tk.X)
        colormap_combo.bind("<<ComboboxSelected>>", self.update_plot)

        ttk.Button(left_panel, text="Export as CSV", command=self.export_csv).pack(fill=tk.X, pady=(10, 0))
        ttk.Button(left_panel, text="Export as Image", command=self.export_image).pack(fill=tk.X, pady=(10, 0))

        self.debug_text = tk.Text(left_panel, height=10, width=40)
        self.debug_text.pack(fill=tk.X, pady=(10, 0))

        right_panel = ttk.Frame(main_frame)
        right_panel.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)

        self.fig = Figure(figsize=(8, 6), dpi=100)
        self.canvas = FigureCanvasTkAgg(self.fig, master=right_panel)
        self.canvas.draw()
        self.canvas.get_tk_widget().pack(side=tk.TOP, fill=tk.BOTH, expand=True)

        toolbar = NavigationToolbar2Tk(self.canvas, right_panel)
        toolbar.update()
        self.canvas.get_tk_widget().pack(side=tk.TOP, fill=tk.BOTH, expand=True)

    def browse_main_folder(self):
        folder_selected = filedialog.askdirectory()
        self.main_folder_path.set(folder_selected)
        self.update_subfolder_list()

    def update_subfolder_list(self):
        main_folder = self.main_folder_path.get()
        subfolders = [f for f in os.listdir(main_folder) if os.path.isdir(os.path.join(main_folder, f))]
        self.subfolder_combo['values'] = subfolders
        if subfolders:
            self.subfolder_combo.set(subfolders[0])
            self.scan_subfolder()

    def scan_subfolder(self, event=None):
        subfolder = os.path.join(self.main_folder_path.get(), self.subfolder_path.get())
        self.available_times = []
        self.file_mapping = {}
        self.debug_text.delete(1.0, tk.END)
        self.debug_text.insert(tk.END, f"Scanning subfolder: {subfolder}\n")
        
        try:
            for file in os.listdir(subfolder):
                self.debug_text.insert(tk.END, f"Found file: {file}\n")
                if file.endswith(".EDT") or file.endswith(".EDX"):
                    match = re.search(r'_(\d{4}-\d{2}-\d{2}_\d{2}\.\d{2}\.\d{2})\.(EDT|EDX)$', file)
                    if match:
                        time_str = match.group(1)
                        file_type = match.group(2)
                        date_obj = datetime.strptime(time_str, "%Y-%m-%d_%H.%M.%S")
                        formatted_time = date_obj.strftime("%Y-%m-%d_%H.%M.%S")
                        
                        if formatted_time not in self.file_mapping:
                            self.file_mapping[formatted_time] = {'EDT': None, 'EDX': None}
                        
                        self.file_mapping[formatted_time][file_type] = os.path.join(subfolder, file)
                        
                        if file_type == 'EDT':
                            self.available_times.append(formatted_time)
                            self.debug_text.insert(tk.END, f"Extracted time: {formatted_time}\n")
                    else:
                        self.debug_text.insert(tk.END, f"Skipped file (no timestamp match): {file}\n")
                else:
                    self.debug_text.insert(tk.END, f"Skipped file (not EDT/EDX): {file}\n")
            
            self.available_times.sort()
            
            self.time_combo['values'] = self.available_times
            if self.available_times:
                self.time_combo.set(self.available_times[0])
                self.load_data()
            else:
                self.debug_text.insert(tk.END, "No valid EDT files found.\n")
                messagebox.showwarning("No Data", "No valid EDT files found in the selected subfolder.")
        except Exception as e:
            self.debug_text.insert(tk.END, f"Error: {str(e)}\n")
            messagebox.showerror("Error", f"An error occurred while scanning the subfolder: {str(e)}")

    def load_data(self, event=None):
        selected_time = self.time_combo.get()
        
        self.debug_text.insert(tk.END, f"Loading data for time: {selected_time}\n")
        
        if selected_time in self.file_mapping:
            edx_file = self.file_mapping[selected_time]['EDX']
            edt_file = self.file_mapping[selected_time]['EDT']
            
            if edx_file and edt_file:
                self.debug_text.insert(tk.END, f"Found EDX file: {edx_file}\n")
                self.debug_text.insert(tk.END, f"Found EDT file: {edt_file}\n")
                try:
                    self.reader = EDXEDTReader(edx_file, edt_file)
                    self.reader.process_files()
                    self.update_variable_list()
                    self.update_z_scale()
                    self.update_plot()
                except Exception as e:
                    self.debug_text.insert(tk.END, f"Error processing files: {str(e)}\n")
                    messagebox.showerror("Error", f"An error occurred while processing the files: {str(e)}")
            else:
                missing = []
                if not edx_file:
                    missing.append("EDX")
                if not edt_file:
                    missing.append("EDT")
                self.debug_text.insert(tk.END, f"Missing files: {', '.join(missing)}\n")
                messagebox.showwarning("Files Not Found", f"{', '.join(missing)} file(s) not found for the selected time.")
        else:
            self.debug_text.insert(tk.END, "Selected time not found in file mapping\n")
            messagebox.showwarning("Time Not Found", "Selected time not found in file mapping.")

    def update_variable_list(self):
        self.var_combo['values'] = self.reader.metadata['name_variables']
        self.var_combo.set(self.reader.metadata['name_variables'][0])

    def update_z_scale(self):
        max_z = self.reader.metadata['nr_zdata'] - 1
        self.z_scale.configure(to=max_z)

    def update_plot(self, event=None):
        if not self.reader:
            return

        var_index = self.var_combo.current()
        z_level = self.current_z.get()
        
        var_data = self.reader.get_variable_data(var_index)
        var_name = self.reader.metadata['name_variables'][var_index]

        self.fig.clear()
        ax = self.fig.add_subplot(111)
        im = ax.imshow(var_data[z_level], cmap=self.colormap.get())
        ax.set_title(f"{var_name} - Z-level {z_level}")
        self.fig.colorbar(im)
        
        ax.set_xlabel('X')
        ax.set_ylabel('Y')
        
        ax.grid(which='both', color='white', linestyle='-', linewidth=0.5, alpha=0.5)
        
        self.canvas.draw()

    def export_csv(self):
        if not self.reader:
            return
        
        var_index = self.var_combo.current()
        var_data = self.reader.get_variable_data(var_index)
        var_name = self.reader.metadata['name_variables'][var_index]
        
        file_path = filedialog.asksaveasfilename(defaultextension=".csv")
        if file_path:
            df = pd.DataFrame(var_data.reshape(var_data.shape[0], -1))
            df.to_csv(file_path, index=False)

    def export_image(self):
        if not self.reader:
            return
        
file_path = filedialog.asksaveasfilename(defaultextension=".png")
if file_path:
    self.fig.savefig(file_path, dpi=300, bbox_inches='tight')

if __name__ == "__main__":
    root = tk.Tk()
    app = ENVImetAdvancedAnalyzer(root)
    root.mainloop()
