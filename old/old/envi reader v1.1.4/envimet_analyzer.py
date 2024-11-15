import tkinter as tk
from tkinter import filedialog, messagebox
import os
import re
from datetime import datetime
import pandas as pd
import numpy as np
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
                    self.update_variable_list()
                    self.update_plot()
                except Exception as e:
                    self.gui.debug_text.insert(tk.END, f"Error: {str(e)}\n")
                    messagebox.showerror("Error", f"An error occurred while processing the files: {str(e)}")
            else:
                self.gui.debug_text.insert(tk.END, "Missing EDX or EDT file.\n")
                messagebox.showwarning("Missing File", "Missing EDX or EDT file for the selected time.")
        else:
            self.gui.debug_text.insert(tk.END, "Selected time not in file mapping.\n")
            messagebox.showwarning("Invalid Time", "Selected time not in file mapping.")

    def update_variable_list(self):
        if self.reader:
            variables = self.reader.metadata['name_variables']
            self.gui.var_combo['values'] = variables
            if variables:
                self.gui.var_combo.set(variables[0])
                self.current_variable = variables[0]
                self.gui.z_scale.configure(to=self.reader.metadata['nr_zdata'] - 1)

    def update_plot(self, event=None):
        if not self.reader:
            return

        try:
            self.current_variable = self.gui.var_combo.get()
            var_index = self.gui.var_combo.current()
            z_level = self.gui.current_z.get()
            
            var_data = self.reader.get_variable_data(var_index, z_level, self.gui.terrain_data if self.gui.follow_terrain.get() else None)
            var_name = self.reader.metadata['name_variables'][var_index]

            self.gui.fig.clear()
            ax = self.gui.fig.add_subplot(111)
            im = ax.imshow(var_data, cmap=self.gui.colormap.get())
            ax.set_title(f"{var_name} - Z-level {z_level}")
            self.gui.fig.colorbar(im)
            
            ax.set_xlabel('X')
            ax.set_ylabel('Y')
            
            self.gui.canvas.draw()
        except Exception as e:
            self.gui.debug_text.insert(tk.END, f"Error: {str(e)}\n")
            messagebox.showerror("Error", f"An error occurred while updating the plot: {str(e)}")

    def export_csv(self):
        if not self.reader:
            return

        var_index = self.gui.var_combo.current()
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
            self.gui.fig.savefig(file_path, dpi=300, bbox_inches='tight')

if __name__ == "__main__":
    root = tk.Tk()
    app = ENVImetAdvancedAnalyzer(root)
    root.mainloop()
