import tkinter as tk
from envimet_analyzer import ENVImetAdvancedAnalyzer

def main():
    root = tk.Tk()
    app = ENVImetAdvancedAnalyzer(root)
    root.mainloop()

if __name__ == "__main__":
    main()
