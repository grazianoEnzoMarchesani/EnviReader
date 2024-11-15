import tkinter as tk
from tkinter import filedialog, ttk, messagebox
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg, NavigationToolbar2Tk
from matplotlib.figure import Figure
import matplotlib.pyplot as plt

class GUIComponents:
    def __init__(self, master, analyzer):
        self.master = master
        self.analyzer = analyzer
        self.main_folder_path = tk.StringVar()
        self.subfolder_path = tk.StringVar()
        self.current_variable = tk.StringVar()
        self.current_z = tk.IntVar(value=0)
        self.colormap = tk.StringVar(value="viridis")
        self.current_time_index = tk.IntVar(value=0)  # Nuovo: indice del tempo corrente
        self.create_widgets()

    def create_widgets(self):
        main_frame = ttk.Frame(self.master)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        left_panel = ttk.Frame(main_frame)
        left_panel.pack(side=tk.LEFT, fill=tk.Y, padx=(0, 10))

        ttk.Label(left_panel, text="Main Output Folder:").pack(anchor="w")
        ttk.Entry(left_panel, textvariable=self.main_folder_path, width=40).pack(fill=tk.X)
        ttk.Button(left_panel, text="Browse Main Folder", command=self.analyzer.browse_main_folder).pack(anchor="w")

        ttk.Label(left_panel, text="Select Subfolder:").pack(anchor="w", pady=(10, 0))
        self.subfolder_combo = ttk.Combobox(left_panel, textvariable=self.subfolder_path, state="readonly")
        self.subfolder_combo.pack(fill=tk.X)
        self.subfolder_combo.bind("<<ComboboxSelected>>", self.analyzer.scan_subfolder)

        # Nuovo: Slider per selezionare il tempo
        ttk.Label(left_panel, text="Select Time:").pack(anchor="w", pady=(10, 0))
        self.time_slider = ttk.Scale(left_panel, from_=0, to=0, variable=self.current_time_index, 
                                     command=self.analyzer.update_time)
        self.time_slider.pack(fill=tk.X)
        self.time_label = ttk.Label(left_panel, text="")
        self.time_label.pack(anchor="w")

        ttk.Label(left_panel, text="Select Variable:").pack(anchor="w", pady=(10, 0))
        self.var_combo = ttk.Combobox(left_panel, textvariable=self.current_variable, state="readonly")
        self.var_combo.pack(fill=tk.X)
        self.var_combo.bind("<<ComboboxSelected>>", self.analyzer.update_plot)

        ttk.Label(left_panel, text="Z-level:").pack(anchor="w", pady=(10, 0))
        self.z_scale = ttk.Scale(left_panel, from_=0, to=0, variable=self.current_z, command=self.analyzer.update_plot)
        self.z_scale.pack(fill=tk.X)

        ttk.Label(left_panel, text="Colormap:").pack(anchor="w", pady=(10, 0))
        colormap_combo = ttk.Combobox(left_panel, textvariable=self.colormap, values=plt.colormaps(), state="readonly")
        colormap_combo.pack(fill=tk.X)
        colormap_combo.bind("<<ComboboxSelected>>", self.analyzer.update_plot)

        ttk.Button(left_panel, text="Export as CSV", command=self.analyzer.export_csv).pack(fill=tk.X, pady=(10, 0))
        ttk.Button(left_panel, text="Export as Image", command=self.analyzer.export_image).pack(fill=tk.X, pady=(10, 0))

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
