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

        self.gui = GUIComponents(master, self)

    # Permette di selezionare la cartella principale
    def browse_main_folder(self):
        folder_selected = filedialog.askdirectory()
        self.gui.main_folder_path.set(folder_selected)
        self.update_subfolder_list()

    # Aggiorna la lista delle sottocartelle nella cartella principale selezionata
    def update_subfolder_list(self):
        # Ottiene il percorso della cartella principale selezionata
        main_folder = self.gui.main_folder_path.get()
        
        # Crea una lista di tutte le sottocartelle nella cartella principale
        subfolders = [f for f in os.listdir(main_folder) if os.path.isdir(os.path.join(main_folder, f))]
        
        # Ordina la lista delle sottocartelle in ordine alfabetico
        subfolders.sort()
        
        # Aggiorna i valori del menu a discesa con la lista ordinata delle sottocartelle
        self.gui.subfolder_combo['values'] = subfolders
        
        # Se ci sono sottocartelle, seleziona la prima come default
        if subfolders:
            self.gui.subfolder_combo.set(subfolders[0])
            # Avvia la scansione della sottocartella selezionata
            self.scan_subfolder()
        else:
            # Se non ci sono sottocartelle, mostra un messaggio di avviso
            messagebox.showwarning("No Subfolders", "No subfolders found in the selected main folder.")

    # Scansiona la sottocartella selezionata per trovare i file EDX e EDT
    def scan_subfolder(self, event=None):
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
            
            self.gui.time_combo['values'] = self.available_times
            if self.available_times:
                self.gui.time_combo.set(self.available_times[0])
                self.load_data()
            else:
                self.gui.debug_text.insert(tk.END, "No valid EDT files found.\n")
                messagebox.showwarning("No Data", "No valid EDT files found in the selected subfolder.")
        except Exception as e:
            self.gui.debug_text.insert(tk.END, f"Error: {str(e)}\n")
            messagebox.showerror("Error", f"An error occurred while scanning the subfolder: {str(e)}")

    # Carica i dati per il tempo selezionato
    def load_data(self, event=None):
        selected_time = self.gui.time_combo.get()
        
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

    # Aggiorna la lista delle variabili disponibili
    def update_variable_list(self):
        self.gui.var_combo['values'] = self.reader.metadata['name_variables']
        self.gui.var_combo.set(self.reader.metadata['name_variables'][0])

    # Aggiorna la scala Z in base ai dati caricati
    def update_z_scale(self):
        max_z = self.reader.metadata['nr_zdata'] - 1
        self.gui.z_scale.configure(to=max_z)

    # Aggiorna il grafico con i dati selezionati
    def update_plot(self, event=None):
        if not self.reader:
            return

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

    # Esporta i dati come file CSV
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

    # Esporta il grafico come immagine
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
