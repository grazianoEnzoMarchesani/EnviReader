import tkinter as tk
from tkinter import filedialog, messagebox
import os
import re
from datetime import datetime
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
        self.current_variable = None  # Aggiungiamo questa variabile per tenere traccia della variabile corrente

        self.gui = GUIComponents(master, self)

    def browse_main_folder(self):
        # Permette all'utente di selezionare la cartella principale
        folder_selected = filedialog.askdirectory()
        self.gui.main_folder_path.set(folder_selected)
        self.update_subfolder_list()

    def update_subfolder_list(self):
        # Aggiorna la lista delle sottocartelle e le ordina alfabeticamente
        main_folder = self.gui.main_folder_path.get()
        subfolders = [f for f in os.listdir(main_folder) if os.path.isdir(os.path.join(main_folder, f))]
        subfolders.sort()  # Ordina le sottocartelle alfabeticamente
        self.gui.subfolder_combo['values'] = subfolders
        if subfolders:
            self.gui.subfolder_combo.set(subfolders[0])
            self.scan_subfolder()
        else:
            messagebox.showwarning("No Subfolders", "No subfolders found in the selected main folder.")

    def scan_subfolder(self, event=None):
        # Scansiona la sottocartella selezionata per i file EDT e EDX
        subfolder = os.path.join(self.gui.main_folder_path.get(), self.gui.subfolder_path.get())
        self.available_times = []
        self.file_mapping = {}
        self.gui.debug_text.delete(1.0, tk.END)
        self.gui.debug_text.insert(tk.END, f"Scanning subfolder: {subfolder}\n")
        
        try:
            for file in os.listdir(subfolder):
                self.gui.debug_text.insert(tk.END, f"Found file: {file}\n")
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
                            self.gui.debug_text.insert(tk.END, f"Extracted time: {formatted_time}\n")
                    else:
                        self.gui.debug_text.insert(tk.END, f"Skipped file (no timestamp match): {file}\n")
                else:
                    self.gui.debug_text.insert(tk.END, f"Skipped file (not EDT/EDX): {file}\n")
            
            self.available_times.sort()
            
            # Aggiorna lo slider del tempo
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
        # Aggiorna il tempo selezionato e carica i dati corrispondenti
        if self.available_times:
            index = int(self.gui.current_time_index.get())
            selected_time = self.available_times[index]
            self.gui.time_label.config(text=selected_time)
            self.load_data(selected_time)

    def load_data(self, selected_time):
        # Carica i dati per il tempo selezionato
        self.gui.debug_text.insert(tk.END, f"Loading data for time: {selected_time}\n")
        
        if selected_time in self.file_mapping:
            edx_file = self.file_mapping[selected_time]['EDX']
            edt_file = self.file_mapping[selected_time]['EDT']
            
            if edx_file and edt_file:
                self.gui.debug_text.insert(tk.END, f"Found EDX file: {edx_file}\n")
                self.gui.debug_text.insert(tk.END, f"Found EDT file: {edt_file}\n")
                try:
                    self.reader = EDXEDTReader(edx_file, edt_file)
                    self.reader.process_files()
                    self.update_variable_list()
                    self.update_z_scale()
                    self.update_plot()
                except Exception as e:
                    self.gui.debug_text.insert(tk.END, f"Error processing files: {str(e)}\n")
                    messagebox.showerror("Error", f"An error occurred while processing the files: {str(e)}")
            else:
                missing = []
                if not edx_file:
                    missing.append("EDX")
                if not edt_file:
                    missing.append("EDT")
                self.gui.debug_text.insert(tk.END, f"Missing files: {', '.join(missing)}\n")
                messagebox.showwarning("Files Not Found", f"{', '.join(missing)} file(s) not found for the selected time.")
        else:
            self.gui.debug_text.insert(tk.END, "Selected time not found in file mapping\n")
            messagebox.showwarning("Time Not Found", "Selected time not found in file mapping.")

    def update_variable_list(self):
        # Aggiorna la lista delle variabili mantenendo la selezione corrente
        current_variables = self.reader.metadata['name_variables']
        self.gui.var_combo['values'] = current_variables
        
        if self.current_variable is None or self.current_variable not in current_variables:
            # Se non c'è una variabile selezionata o la variabile selezionata non è più disponibile,
            # seleziona la prima variabile
            self.current_variable = current_variables[0]
        
        self.gui.var_combo.set(self.current_variable)

    def update_z_scale(self):
        # Aggiorna la scala Z in base ai dati caricati
        max_z = self.reader.metadata['nr_zdata'] - 1
        self.gui.z_scale.configure(to=max_z)

    def update_plot(self, event=None):
        # Aggiorna il grafico con i dati selezionati
        if not self.reader:
            return

        self.current_variable = self.gui.var_combo.get()  # Aggiorna la variabile corrente
        var_index = self.gui.var_combo.current()
        z_level = self.gui.current_z.get()
        
        var_data = self.reader.get_variable_data(var_index)
        var_name = self.reader.metadata['name_variables'][var_index]

        self.gui.fig.clear()
        ax = self.gui.fig.add_subplot(111)
        im = ax.imshow(var_data[z_level], cmap=self.gui.colormap.get())
        ax.set_title(f"{var_name} - Z-level {z_level}")
        self.gui.fig.colorbar(im)
        
        ax.set_xlabel('X')
        ax.set_ylabel('Y')
        
        ax.grid(which='both', color='white', linestyle='-', linewidth=0.5, alpha=0.5)
        
        self.gui.canvas.draw()

    def export_csv(self):
        # Esporta i dati in formato CSV
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
        # Esporta il grafico come immagine
        if not self.reader:
            return
        
        file_path = filedialog.asksaveasfilename(defaultextension=".png")
        if file_path:
            self.gui.fig.savefig(file_path, dpi=300, bbox_inches='tight')

if __name__ == "__main__":
    root = tk.Tk()
    app = ENVImetAdvancedAnalyzer(root)
    root.mainloop()
