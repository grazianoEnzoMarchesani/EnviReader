import tkinter as tk
from tkinter import ttk
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg, NavigationToolbar2Tk
from matplotlib.figure import Figure
import matplotlib.pyplot as plt
from config import DEFAULT_COLORMAP

class GUIComponents:
    def __init__(self, root, analyzer):
        self.root = root
        self.analyzer = analyzer
        self.main_folder_path = tk.StringVar()
        self.follow_terrain = tk.BooleanVar()
        self.current_time_index = tk.IntVar()
        self.current_variable = tk.StringVar()
        self.current_z = tk.DoubleVar()
        self.colormap = tk.StringVar(value=DEFAULT_COLORMAP)
        self.create_widgets()

    def create_widgets(self):
        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True)

        left_panel = ttk.Frame(main_frame)
        left_panel.pack(side=tk.LEFT, fill=tk.Y)

        ttk.Label(left_panel, text="Main Folder:").pack(anchor="w", pady=(10, 0))
        self.main_folder_entry = ttk.Entry(left_panel, textvariable=self.main_folder_path, width=50)
        self.main_folder_entry.pack(fill=tk.X)
        ttk.Button(left_panel, text="Browse", command=self.analyzer.browse_main_folder).pack(anchor="w", pady=(5, 0))

        ttk.Label(left_panel, text="Subfolder:").pack(anchor="w", pady=(10, 0))
        self.subfolder_combo = ttk.Combobox(left_panel, state="readonly")
        self.subfolder_combo.pack(fill=tk.X)
        self.subfolder_combo.bind("<<ComboboxSelected>>", self.analyzer.scan_subfolder)

        ttk.Label(left_panel, text="Select Time Index:").pack(anchor="w", pady=(10, 0))
        self.time_slider = ttk.Scale(left_panel, from_=0, to=0, variable=self.current_time_index, command=self.analyzer.update_time)
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

        ttk.Checkbutton(left_panel, text="Follow Terrain", variable=self.follow_terrain, command=self.analyzer.update_plot).pack(anchor="w", pady=(10, 0))

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
