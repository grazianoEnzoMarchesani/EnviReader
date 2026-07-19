# EnviReader: Advanced Environmental Data Analysis and Visualization

## Abstract

**EnviReader** (formerly ENVI-met webReader) is a cutting-edge web-based application designed for the advanced analysis and visualization of **EDX/EDT files** produced by [ENVI-met](https://envi-met.com). Completely rebuilt from the ground up using **React and Vite**, this new iteration offers a highly robust, modular, and performant architecture.

The user interface has been entirely redesigned with a focus on **User Experience (UX)** and **modern design aesthetics**. It features fully responsive layouts, collapsible sidebars, dynamic widgets, and seamless **Light and Dark mode** transitions. 

Key capabilities include:
- **Instant Local File Handling**: Open and process large environmental datasets directly in your browser. No server uploads are required, ensuring ultra-fast access and 100% data privacy.
- **Advanced Data Visualization**: Integration with **ECharts** and **Three.js** provides dynamic, interactive charts (line graphs, scatter plots, heatmaps) and rich 3D renderings of models, including customizable 3D vegetation.
- **Sophisticated Data Manipulation & Export**: Advanced filtering, layer selection, data aggregation, and comprehensive export options (including SVG charts and raw data) for interdisciplinary collaboration.
- **Global Accessibility**: Built-in internationalization (i18n) supporting multiple languages out-of-the-box.

Designed for **environmental scientists, urban planners, and decision-makers**, EnviReader is the ultimate, lightweight tool for handling complex environmental simulations directly on your machine or statically hosted anywhere.

---

## Project Objectives & Key Features

1. **Modern React Architecture**: Built with React and Vite, the application relies on a modular component-based framework ensuring seamless integration, high scalability, and maintainability.
2. **Local & Secure Processing**: The app reads and parses complex EDX/EDT simulation files directly on the client side. Your data never leaves your device.
3. **Dynamic User Interface**: 
   - **Light/Dark Themes**: Instant toggling through a centralized CSS design token system.
   - **Collapsible Sidebars & Dynamic Widgets**: Optimized workspace layouts that adapt to your screen size and current focus.
   - **Multi-language Support (i18n)**: Seamless language switching (English, Italian, Spanish, French, German, Chinese) driven by a centralized `translations.json`.
4. **Three Specialized Views**:
   - **Analysis View**: For deep diving into 2D maps and layers.
   - **Model View**: 3D interactive rendering of the simulation domain, with customizable object styling (e.g., dynamic 3D vegetation coloring).
   - **Boundary View**: Specialized charting interfaces for boundary conditions, featuring native **SVG export** capabilities.
5. **Interactive Visualizations**: Leveraging **ECharts** for highly interactive and optimized 2D charts and data comparison.
6. **Performance Optimization**: Efficient state management via React Context, data caching, lazy loading, and optimized DOM rendering for large datasets.
7. **Static Hosting Ready**: Designed to be compiled into a fully static bundle, deployable on any standard web hosting, CDN, or GitHub Pages without needing a Node.js backend.
8. **Export Capabilities**: Dedicated export modals allowing users to independently export graphical views (PNG, SVG) and structured data.

---

## Installation & Local Development

EnviReader is built with Vite, making local setup incredibly fast.

### Prerequisites
- Node.js (v16+ recommended)
- npm or yarn

### Setup Instructions

1. **Clone the repository** (if not already done).
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Run the development server**:
   ```bash
   npm run dev
   ```
   *The application will be accessible at `http://localhost:5173` with Hot Module Replacement (HMR).*

### Building for Production (Static Hosting)

To build the application for deployment on any static hosting environment:

```bash
npm run build
```

This command generates a highly optimized `dist/` folder. The application uses relative paths (`base: './'` in Vite configuration), meaning the contents of the `dist` directory can be dropped directly into the root or any subfolder of a web server.

---

## Project Structure

```text
src/
├── main.jsx                  # Application entry point
├── App.jsx                   # Main layout and routing between the 3 views
├── styles/
│   ├── tokens.css            # Centralized design tokens (colors, themes, typography)
│   └── app.css               # Global component styles
├── data/
│   ├── constants.js          # App configurations, palettes, view definitions
│   └── parser/               # Handlers for reading/parsing SIMX/FOX/EDT formats
├── i18n/
│   └── I18nContext.jsx       # Internationalization provider (fetches public/translations.json)
├── state/
│   └── AppStateContext.jsx   # Global application state (theme, active view, layers)
└── components/               # React Components
    ├── TopBar.jsx, NavBar.jsx, CreditsModal.jsx
    ├── controls/             # Reusable UI elements (Sliders, Toggles, Selects, Color Pickers)
    ├── sidebar/              # Contextual sidebars (Analysis, Model, Boundary)
    └── views/                # Main visualization areas (AnalysisView, ModelView, BoundaryView)
```

---

## Adding a New Language

EnviReader uses a dynamic internationalization system. To add a new language:
1. Open `public/translations.json`.
2. Add a new top-level object with the language code (e.g., `"pt": { ... }`).
3. Translate all the keys present in the default `"it"` or `"en"` objects.
4. The application's language selector will automatically detect and populate the new option.

---

## Target Audience

EnviReader is an invaluable tool for:
- **Environmental scientists** conducting microclimate and heat island studies.
- **Urban planners** and architects designing sustainable, climate-resilient cities.
- **Decision-makers** analyzing complex environmental scenarios to improve urban comfort.

---

## Related Resources

- **ENVI-met**: Comprehensive environmental modeling software - [https://envi-met.com](https://envi-met.com)
- **ECharts**: Powerful, interactive data visualization - [https://echarts.apache.org](https://echarts.apache.org)
- **Three.js**: JavaScript 3D library - [https://threejs.org](https://threejs.org)

---

## Why Choose EnviReader?

The redesigned EnviReader provides an unparalleled combination of **advanced analytical tools**, an **intuitive modern interface**, and **powerful visualization capabilities**. Its React-based modular architecture ensures adaptability, maintainability, and rapid future growth. By keeping processing strictly local and browser-based, it guarantees high performance and absolute data privacy.

Experience the future of environmental data analysis and visualization directly in your browser.
