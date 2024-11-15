import tkinter as tk
from tkinter import filedialog, messagebox
import os
import re
import pandas as pd
from edx_edt_reader import EDXEDTReader
from gui_components import GUIComponents

class ENVImetAdvancedAnalyzer:
    def __init__(self, master):
        self.master = master
        self.master.title("ENVI-met Advanced Output Analyzer")
        self.master.geometry("1200x800")

        self.available_times = []
        self.file_mapping = {}
        self.reader = None
        self.current_variable = None
        self.terrain_data = None

        self.gui = GUIComponents(master, self)

    def browse_main_folder(self):
        folder_selected = filedialog.askdirectory()
        self.gui.main_folder_path.set(folder_selected)
        self.update_subfolder_list()

    def update_subfolder_list(self):
        main_folder = self.gui.main_folder_path.get()
        subfolders = [os.path.relpath(os.path.join(dp, f), main_folder) for dp, dn, filenames in os.walk(main_folder) for f in filenames if f.endswith(".EDT") or f.endswith(".EDX")]
        subfolders = list(set(os.path.dirname(f) for f in subfolders))
        subfolders.sort()
        self.gui.subfolder_combo['values'] = subfolders
        if subfolders:
            self.gui.subfolder_combo.set(subfolders[0])
            self.scan_subfolder()
        else:
            messagebox.showwarning("No Subfolders", "No subfolders found in the selected main folder.")

    def scan_subfolder(self, event=None):
        subfolder = os.path.join(self.gui.main_folder_path.get(), self.gui.subfolder_combo.get())
        self.available_times = []
        self.file_mapping = {}
        self.gui.debug_text.delete(1.0, tk.END)
        self.gui.debug_text.insert(tk.END, f"Scanning subfolder: {subfolder}\n")

        try:
            for file in os.listdir(subfolder):
                self.gui.debug_text.insert(tk.END, f"Found file: {file}\n")
                if file.endswith(".EDT") or file.endswith(".EDX"):
                    match = re.search(r'_(\d{4}-\d{2}-\d{2}(?:_\d{2}\.\d{2}\.\d{2})?)\.(EDT|EDX)$', file)
                    if match:
                        time_str = match.group(1)
                        file_type = match.group(2)

                        if time_str not in self.file_mapping:
                            self.file_mapping[time_str] = {'EDT': None, 'EDX': None}

                        self.file_mapping[time_str][file_type] = os.path.join(subfolder, file)

                        if file_type == 'EDT':
                            self.available_times.append(time_str)
                            self.gui.debug_text.insert(tk.END, f"Extracted time: {time_str}\n")
                    else:
                        self.gui.debug_text.insert(tk.END, f"Skipped file (no timestamp match): {file}\n")
                else:
                    self.gui.debug_text.insert(tk.END, f"Skipped file (not EDT/EDX): {file}\n")

            self.available_times.sort()

            self.gui.time_slider.configure(to=len(self.available_times) - 1)
            if self.available_times:
                self.gui.current_time_index.set(0)
                self.update_time()
            else:
                self.gui.debug_text.insert(tk.END, "No valid EDT files found.\n")
                messagebox.showwarning("No Data", "No valid EDT files found in the selected subfolder.")
        except Exception as e:
            self.gui.debug_text.insert(tk.END, f"Error: {str(e)}\n")
            messagebox.showerror("Error", f"An error occurred while scanning the subfolder: {str(e)}")

    def update_time(self, event=None):
        if self.available_times:
            index = int(self.gui.current_time_index.get())
            selected_time = self.available_times[index]
            self.gui.time_label.config(text=selected_time)
            self.load_data(selected_time)

    def load_data(self, selected_time):
        self.gui.debug_text.insert(tk.END, f"Loading data for time: {selected_time}\n")

        if selected_time in self.file_mapping:
            edx_file = self.file_mapping[selected_time]['EDX']
            edt_file = self.file_mapping[selected_time]['EDT']

            if edx_file and edt_file:
                self.reader = EDXEDTReader(edx_file, edt_file)
                try:
                    self.reader.process_files()
                    self.gui.var_combo['values'] = self.reader.metadata['name_variables']
                    if self.reader.metadata['name_variables']:
                        self.gui.current_variable.set(self.reader.metadata['name_variables'][0])
                    
                    # Update Z-level slider
                    max_z = self.reader.metadata['nr_zdata'] - 1
                    self.gui.z_scale.configure(to=max_z)
                    self.gui.current_z.set(0)  # Reset to 0
                    
                    self.update_plot()
                except Exception as e:
                    self.gui.debug_text.insert(tk.END, f"Error processing files: {str(e)}\n")
                    messagebox.showerror("Error", f"An error occurred while processing the files: {str(e)}")
            else:
                self.gui.debug_text.insert(tk.END, "Missing EDX or EDT file.\n")
                messagebox.showwarning("Missing Files", "The selected time does not have both EDX and EDT files.")
        else:
            self.gui.debug_text.insert(tk.END, "Selected time not in file mapping.\n")

    def load_terrain_data(self):
        try:
            main_folder = self.gui.main_folder_path.get()
            ground_folder = os.path.join(main_folder, "solaraccess", "ground")
            self.gui.debug_text.insert(tk.END, f"Looking for terrain data in: {ground_folder}\n")
            
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
            
            self.gui.debug_text.insert(tk.END, f"Found terrain file: {terrain_file}\n")
            
            terrain_reader = EDXEDTReader(terrain_edx_path, terrain_edt_path)
            terrain_reader.process_files()
            
            num_variables = terrain_reader.metadata['nr_variables']
            self.gui.debug_text.insert(tk.END, f"Number of variables in terrain file: {num_variables}\n")
            
            if num_variables >= 4:
                self.terrain_data = terrain_reader.get_variable_data(3, z_level=0)  # Index z node Terrain is the 4th variable (index 3)
                if self.terrain_data is None:
                    raise ValueError("Terrain data is None")
                self.gui.debug_text.insert(tk.END, f"Terrain data shape: {self.terrain_data.shape}\n")
                self.gui.debug_text.insert(tk.END, "Terrain data loaded successfully.\n")
            else:
                raise ValueError("Not enough variables found in terrain file")
        except Exception as e:
            self.gui.debug_text.insert(tk.END, f"Error loading terrain data: {str(e)}\n")
            messagebox.showerror("Error", f"An error occurred while loading the terrain data: {str(e)}")
            self.terrain_data = None

    def update_plot(self, event=None):
        try:
            if not self.reader:
                self.gui.debug_text.insert(tk.END, "No data loaded. Please load data first.\n")
                return

            variable_name = self.gui.current_variable.get()
            z_level = int(self.gui.current_z.get())
            variable_index = self.reader.metadata['name_variables'].index(variable_name)

            self.gui.debug_text.insert(tk.END, f"Updating plot for variable: {variable_name}, Z-level: {z_level}\n")

            if self.gui.follow_terrain.get():
                self.gui.debug_text.insert(tk.END, "Follow terrain option is selected.\n")
                if self.terrain_data is None:
                    self.gui.debug_text.insert(tk.END, "Terrain data not loaded. Attempting to load...\n")
                    self.load_terrain_data()
                if self.terrain_data is not None:
                    self.gui.debug_text.insert(tk.END, "Using terrain data for plotting.\n")
                    data = self.reader.get_variable_data(variable_index, z_level=z_level, terrain_data=self.terrain_data)
                else:
                    self.gui.debug_text.insert(tk.END, "Terrain data not available. Using regular Z-level.\n")
                    data = self.reader.get_variable_data(variable_index, z_level=z_level)
            else:
                self.gui.debug_text.insert(tk.END, "Using regular Z-level for plotting.\n")
                data = self.reader.get_variable_data(variable_index, z_level=z_level)

            self.plot_data(data, variable_name, z_level)
        except Exception as e:
            self.gui.debug_text.insert(tk.END, f"Error updating plot: {str(e)}\n")
            messagebox.showerror("Error", f"An error occurred while updating the plot: {str(e)}")

    def plot_data(self, data, variable_name, z_level):
        self.gui.fig.clf()
        ax = self.gui.fig.add_subplot(111)
        cmap = self.gui.colormap.get()
        cax = ax.imshow(data, cmap=cmap, origin='lower')
        self.gui.fig.colorbar(cax)
        ax.set_title(f"{variable_name} - Z-level: {z_level}")
        self.gui.canvas.draw()

    def export_csv(self):
        if self.reader and self.current_variable:
            data = self.reader.data[self.current_variable]
            df = pd.DataFrame(data)
            file_path = filedialog.asksaveasfilename(defaultextension='.csv', filetypes=[("CSV files", "*.csv")])
            if file_path:
                df.to_csv(file_path, index=False)
                messagebox.showinfo("Export Successful", f"Data exported successfully to {file_path}")

    def export_image(self):
        if self.gui.fig:
            file_path = filedialog.asksaveasfilename(defaultextension='.png', filetypes=[("PNG files", "*.png")])
            if file_path:
                self.gui.fig.savefig(file_path)
                messagebox.showinfo("Export Successful", f"Image exported successfully to {file_path}")

if __name__ == "__main__":
    root = tk.Tk()
    app = ENVImetAdvancedAnalyzer(root)
    root.mainloop()
