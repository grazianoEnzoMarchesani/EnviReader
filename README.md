# EnviReader

Read, explore and compare [ENVI-met](https://www.envi-met.com) simulation results directly in the browser. Open an output folder, and EnviReader draws maps, sections, 3D models and time series from the `EDX`/`EDT` files.

**Live app: [envireader.altervista.org](https://envireader.altervista.org)**

> **Your data never leaves your computer.** Files are read and processed locally in the browser. Nothing is uploaded to any server.

## Features

- **2D analysis** — plan views and vertical sections of any output variable, continuous contours (isolines) or cell grid, wind vectors and animated streamlines, a time player for daily playback, and custom color palettes / threshold ranges.
- **3D model viewer** — buildings, vegetation, terrain and receptors from the `INX` model, with the data overlaid in 3D, a 3D wind volume and a sun-position / shadow module driven by date and time.
- **Compare** two simulations side by side, or as a difference.
- **Receptors and time series** — charts for single points, exportable as images.
- **Boundary conditions view** — inspect the forcing data of a simulation and export its charts.
- **Web GIS view** — place the model on a map.
- **Light and dark theme**, five languages (English, Italiano, Deutsch, Español, Français), keyboard shortcuts (see [docs/keyboard_shortcuts.txt](docs/keyboard_shortcuts.txt)).

Works in all major browsers; no installation needed.

## Run locally

```bash
npm install
npm run dev      # development server
npm run build    # production build in dist/
npm run lint
```

The `dist/` folder is fully static and can be served from any folder of any web server.

## Project layout

| Path | Contents |
|---|---|
| `src/components/` | UI: views, sidebar, charts, modals, controls |
| `src/lib/` | Parsers (`EDX`/`EDT`/`INX`/`FOX`), slicing, color maps, wind field, 3D scene, export |
| `src/state/` | Global application state |
| `src/data/` | Constants, palettes, presets |
| `src/i18n/`, `public/translations.json` | Translations |

Built with React, Vite, three.js and MapLibre GL.

## History

EnviReader started as *ENVI-met webReader* (v1.4 and v1.5, plain JavaScript, still available in the [releases](https://github.com/grazianoEnzoMarchesani/EnviReader/releases)). Version 2.0 is a full rewrite as a component-based React app.

## Disclaimer

EnviReader is an independent project. It is not affiliated with, endorsed by or supported by ENVI-met GmbH. ENVI-met is a trademark of its owner. The ENVI-met materials database is proprietary and is not included in this repository.
