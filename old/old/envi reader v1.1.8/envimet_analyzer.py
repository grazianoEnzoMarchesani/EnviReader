import tkinter as tk
from tkinter import filedialog, messagebox
import os
import pandas as pd
from gui_components import GUIComponents
from edx_edt_reader import EDXEDTReader
from data_processor import *
from plot_utils import plot_data
from file_utils import scan_subfolder, update_subfolder_list
from config import APP_TITLE, WINDOW_SIZE


class ENVImetAdvancedAnalyzer:
    def __init__(self, master):
        self.master = master
        self.master.title(APP_TITLE)
        self.master.geometry(WINDOW_SIZE)

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
        subfolders = update_subfolder_list(main_folder)
        self.gui.subfolder_combo['values'] = subfolders
        if subfolders:
            self.gui.subfolder_combo.set(subfolders[0])
            self.scan_subfolder()
        else:
            messagebox.showwarning("No Subfolders", "No subfolders found in the selected main folder.")

    def scan_subfolder(self, event=None):
        subfolder = os.path.join(self.gui.main_folder_path.get(), self.gui.subfolder_combo.get())
        self.available_times, self.file_mapping = scan_subfolder(subfolder)
        self.gui.time_slider.configure(to=len(self.available_times) - 1)
        if self.available_times:
            self.gui.current_time_index.set(0)
            self.update_time()
        else:
            messagebox.showwarning("No Data", "No valid EDT files found in the selected subfolder.")

    def update_time(self, event=None):
        if self.available_times:
            index = int(self.gui.current_time_index.get())
            selected_time = self.available_times[index]
            self.gui.time_label.config(text=selected_time)
            self.load_data(selected_time)

    def load_data(self, selected_time):
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
                    
                    max_z = self.reader.metadata['nr_zdata'] - 1
                    self.gui.z_scale.configure(to=max_z)
                    self.gui.current_z.set(0)
                    
                    self.update_plot()
                except Exception as e:
                    messagebox.showerror("Error", f"An error occurred while processing the files: {str(e)}")
            else:
                messagebox.showwarning("Missing Files", "The selected time does not have both EDX and EDT files.")
        else:
            messagebox.showwarning("Invalid Time", "Selected time not in file mapping.")

    def update_plot(self, event=None):
        try:
            if not self.reader:
                messagebox.showwarning("No Data", "No data loaded. Please load data first.")
                return

            variable_name = self.gui.current_variable.get()
            z_level = int(self.gui.current_z.get())
            variable_index = self.reader.metadata['name_variables'].index(variable_name)

            if self.gui.follow_terrain.get():
                if self.terrain_data is None:
                    self.terrain_data = load_terrain_data(self.gui.main_folder_path.get())
                if self.terrain_data is not None:
                    data = self.reader.get_variable_data(variable_index, z_level=z_level, terrain_data=self.terrain_data)
                else:
                    data = self.reader.get_variable_data(variable_index, z_level=z_level)
            else:
                data = self.reader.get_variable_data(variable_index, z_level=z_level)

            plot_data(self.gui.fig, data, variable_name, z_level, self.gui.colormap.get())
            self.gui.canvas.draw()
        except Exception as e:
            messagebox.showerror("Error", f"An error occurred while updating the plot: {str(e)}")

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
