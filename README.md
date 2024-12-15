# ENVI-met webReader: Advanced Environmental Data Analysis and Visualization for EDX/EDT Files

## Abstract

The **ENVI-met webReader** is a cutting-edge web-based solution designed for advanced environmental data analysis and visualization of **EDX/EDT files** produced by [ENVI-met](https://envi-met.com). Built on a **modular ES6 framework**, it offers a robust and adaptable architecture for seamless integration of various components and future scalability.

The user interface focuses on **user experience**, offering **light and dark mode** options and a comprehensive feature set for efficient data management, representation, and comparative analysis. Key capabilities include:

- **Sophisticated data manipulation** tools (filtering, aggregation, statistical analysis).
- **Powerful visualization** components (charts, 3D renderings, interactive maps).
- **Comparative analysis** tools for juxtaposing datasets and deriving insights.
- **Local file handling**, enabling users to open **EDX/EDT files directly on their computer** without the need for uploading or transferring data, ensuring instant access and maintaining data privacy.

Integration with [**ECharts**](https://echarts.apache.org/en/index.html) elevates the user experience, providing dynamic, interactive visualizations such as line graphs, scatter plots, and heatmaps. The system is optimized through **data caching** and **performance techniques** for a smooth, responsive user experience.

Designed for **environmental scientists, urban planners, and decision-makers**, the ENVI-met webReader is a robust tool for handling complex environmental data.

---

## Project Objectives

1. Develop a web-based platform for efficient analysis and visualization of **EDX/EDT files** produced by [ENVI-met](https://envi-met.com).
2. Create a **modular ES6 framework** for a robust, adaptable architecture with seamless integration and scalability.
3. Design an intuitive **user interface** with light and dark modes, comprehensive data management, and comparative analysis tools.
4. Implement advanced **data manipulation** tools for filtering, aggregation, and statistical analysis.
5. Integrate **charting and visualization components** (charts, 3D renderings, interactive maps) for meaningful data representation.
6. Enable **instant local file handling**, allowing users to open and analyze files directly on their device without data upload or server interaction.
7. Leverage [**ECharts**](https://echarts.apache.org/en/index.html) for dynamic, interactive data visualizations, including customizable chart types.
8. Develop tools for **data comparison**, highlighting differences with customizable color schemes and palette inversion.
9. Optimize performance through **data caching** and efficient DOM manipulation for a responsive user experience.
10. Create an **adaptive, responsive layout** for various screen sizes and devices.
11. Add **terrain-following** and **wind integration** for enhanced environmental data analysis.
12. Develop a centralized **state management system** to maintain data integrity across the application.
13. Implement advanced **wind visualization features**, including opacity, density controls, and animations.
14. Optimize rendering with **lazy loading** and other techniques for improved performance.
15. Provide **data export capabilities** for interdisciplinary collaboration.

---

## Demo Video

Watch a short video demonstration of the ENVI-met webReader in action:  
[ENVI-met webReder - nov 2](https://youtu.be/ar0BFAbNEJo?si=NHZmQHQiElM4ShYy)

---

## Key Features

### 1. **Local File Handling**
- Open **EDX/EDT files instantly** without the need to upload them to a server.
- All data remains on the user’s device, ensuring **privacy** and **data security**.
- The direct file handling approach enables **fast access** and avoids delays associated with heavy file uploads.

### 2. **Advanced Data Manipulation**
- Tools for **filtering, aggregation, and statistical analysis**.
- Enables users to explore and refine datasets for deeper insights.

### 3. **Visualization Components**
- **Charts**, **3D renderings**, and **interactive maps**.
- Integration with [**ECharts**](https://echarts.apache.org/en/index.html) for dynamic visualizations (e.g., scatter plots, heatmaps).
- Customizable color schemes and palette inversion for enhanced representation.

### 4. **Comparative Analysis**
- Juxtapose datasets to identify trends, anomalies, and insights.
- Display differences with **customizable visualization tools**.

### 5. **Performance Optimization**
- **Data caching** for reduced computational load.
- **Lazy loading** and efficient rendering for a smooth user experience.

### 6. **User Interface**
- **Light and dark mode** options.
- Responsive layout for desktops, tablets, and mobile devices.
- Centralized **state management** for consistent data handling.

### 7. **Wind and Terrain Visualization**
- Realistic **wind animations** with density and opacity controls.
- **Terrain-following capabilities** for localized environmental insights.

### 8. **Data Export and Interdisciplinary Collaboration**
- Export datasets in formats compatible with external analysis tools.

---

## Changelog

### Version 1.5 (December 2023)

#### New Features
1. **Wind Field Visualisation**
   - Added the ability to visualise wind fields through a dedicated option
   - Controls for customising the visualisation:
     - Opacity adjustment
     - Arrow density control
     - Indicator size settings
   - Full integration with the main data view

2. **Preset System**
   - Implemented a comprehensive system for saving and loading presets
   - Ability to save customised configurations for:
     - Visualisation settings
     - Wind field parameters
     - Colour palette choices
     - Section configurations
   - Complete documentation available in the "Complete Guide to Creating JSON Presets" section

#### Improvements
- Optimised performance in wind field visualisation
- Enhanced user interface for preset management
- Improved stability in data processing

---

## Limitations

While the ENVI-met webReader provides robust tools for environmental data analysis, there are a few limitations to consider:

1. **Browser Compatibility**
   - Currently, the application is fully compatible only with **Chrome** and **Chromium-based browsers**. Compatibility with other browsers will be addressed in future updates.

2. **Technology Stack**
   - The project is built using **pure JavaScript**, avoiding frameworks like React, Angular, or Vue. While this ensures simplicity, it may limit scalability and ease of maintenance compared to modern framework-based approaches.

3. **Feature Availability**
   - Not all features described in this document are currently available. Many advanced functionalities, such as **wind integration**, **terrain following**, and certain comparative tools, are planned for **future development** and will be added in subsequent releases.

These limitations highlight the project's ongoing nature, with planned updates to address compatibility, feature expansion, and enhanced architecture.

---

## Target Audience

The ENVI-met webReader is an invaluable tool for:
- **Environmental scientists** conducting microclimate studies.
- **Urban planners** designing sustainable cities.
- **Decision-makers** analyzing complex environmental scenarios.

---

## Visit the Project

The ENVI-met webReader is accessible at [https://envireader.altervista.org](https://envireader.altervista.org).

---

## Related Resources

- Explore **ENVI-met** software for comprehensive environmental modeling: [https://envi-met.com](https://envi-met.com).
- Learn more about **ECharts** for interactive data visualization: [https://echarts.apache.org/en/index.html](https://echarts.apache.org/en/index.html).

---

# Complete Guide to Creating JSON Presets

## Basic Structure

```json
{
    "presetN": {  // where N is the preset number or a descriptive name
        // preset properties
    }
}
```

## Available Properties

### 1. Data and Group

```json
"Data group": "atmosphere",  // data group
"Data": "Potential Air Temperature (°C)"  // data type
```

### 2. Temporal and Spatial Parameters

```json
"time": 0,      // temporal index (0-n)
"level": 0,     // vertical level (0-n)
"sectionX": 9,  // X section (1-n)
"sectionY": 5   // Y section (1-n)
```

### 3. Display Parameters

```json
"followTerrain": true,    // true/false
"scaleFactor": 3.0,       // scale factor (1.0-10.0)
"Show Wind Field": true,  // display wind field (true/false)
"Legend bounds": "individual"  // legend bounds type
```

### 4. Wind Parameters

```json
"windOpacity": 60,   // opacity (0-100)
"windDensity": 30,   // density (1-100)
"windSize": 20       // size (1-100)
```

### 5. Colour Palettes

```json
"colorPalette": {
    "category": "Palette",
    "number": "1"
},
"colorDiffPalette": {
    "category": "Palette",
    "number": "2"
}
```

## Allowed Values and Details

### **Legend bounds**
- **"individual"**: Each display has an independent colour scale based on its own min/max values.
- **"syncedViews"**: Views belonging to the same fileset share the same colour scale.
- **"filesetGlobal"**: Colour scale is calculated across all data from a single fileset.
- **"allFilesets"**: Colour scale is shared between all loaded filesets (A and B).

### Other Parameters
- **`followTerrain`**: true/false
- **`Show Wind Field`**: true/false
- **`scaleFactor`**: decimal number between 1.0 and 10.0
- **`time`, `level`**: non-negative integers
- **`sectionX`, `sectionY`**: positive integers
- **`windOpacity`, `windDensity`, `windSize`**: integers between 1 and 100

## Example Presets

### Complete Preset

```json
{
    "preset1": {
        "Data group": "atmosphere",
        "Data": "Potential Air Temperature (°C)",
        "time": 0,
        "level": 0,
        "sectionX": 9,
        "sectionY": 5,
        "followTerrain": true,
        "scaleFactor": 3.0,
        "windOpacity": 60,
        "windDensity": 30,
        "windSize": 20,
        "Show Wind Field": true,
        "Legend bounds": "individual",
        "colorPalette": {
            "category": "Palette",
            "number": "1"
        },
        "colorDiffPalette": {
            "category": "Palette",
            "number": "2"
        }
    }
}
```

### Minimal Preset

```json
{
    "preset_minimal": {
        "Data group": "atmosphere",
        "Data": "Potential Air Temperature (°C)",
        "time": 0,
        "level": 0,
        "Legend bounds": "individual"
    }
}
```

## Important Notes

1. All property names are **case-sensitive**.
2. Numerical values must fall within the specified range.
3. `scaleFactor` cannot be lower than 1.0.
4. Colour palettes must exist in the system.
5. Presets can be saved and loaded at any time.
6. Any options not included in the preset will be ignored during loading, retaining the current application values.
7. Use appropriate values to ensure optimal data display.

## Practical Usage

- Presets can be saved via the "Save Preset" button in the interface.
- Saved presets can be loaded to quickly restore specific configurations.
- The choice of **Legend bounds** directly affects how data differences are displayed.
- Wind parameters are relevant only when `"Show Wind Field"` is **true**.
- Partial presets can be created by including only the options you wish to modify.
- Unspecified options will retain their current values in the application.

## Error Management

- Invalid values will be ignored, and the application will keep the previous settings.
- If a required property is missing or invalid, the preset may not load properly.
- If there are errors in the JSON format, the preset will not load.

## Best Practices

1. Test presets after creation.
2. Use descriptive names for presets.
3. Include only necessary properties.
4. Keep a backup copy of important presets.
5. Document the purpose of each preset you create.

---

## Why Choose ENVI-met webReader?

The ENVI-met webReader provides an unparalleled combination of **advanced analytical tools**, **intuitive interface design**, and **powerful visualization capabilities**, making it the go-to solution for working with **EDX/EDT files** and complex environmental data. Its modular architecture ensures adaptability and growth, while performance optimizations guarantee efficiency and responsiveness.

Experience the future of environmental data analysis and visualization with ENVI-met webReader.
