# EnviReader: Advanced Environmental Data Analysis and Visualization

## About This Version (v2.0)

With version 1.5 (initially *ENVI-met webReader*), the goal was to enable the reading and visualization of EDX/EDT files directly in the browser, eliminating the need to install desktop software or transfer sensitive data to external servers.

However, as the project expanded, the pure JavaScript codebase became difficult to maintain. The addition of new features constantly risked compromising the program's stability. This structural limitation made a complete rewrite of the software necessary.

The transition to a component-based infrastructure has simplified maintenance. It is now possible to integrate new environmental analysis tools in isolation, without altering the functioning of the *core*.
The workspace has been redesigned to facilitate the prolonged analysis of maps and charts related to the urban climate. The integration of Dark Mode aims to reduce eye strain during working sessions.
The technical limitations that bound optimal use to Google Chrome have been removed, ensuring fluidity across all major browsers. Native multilingual support has also been introduced.
The "zero data transfer" principle remains unaltered: model processing occurs exclusively on the user's machine. The new computation engine optimizes memory management, reducing loading times for large files.

EnviReader v2.0 provides a stable and optimized environment for navigating complex 3D models and crossing 2D charts, significantly reducing CPU load. The new code structure guarantees the scalability necessary to facilitate the development and integration of future implementations.

The stability of the new architecture has allowed features to expand beyond simple data extraction, introducing tools for visual and spatial exploration.

The system now integrates an interactive 3D viewer for the analysis of urban geometry. The user can navigate the model to examine the development of architectural volumes and the arrangement of vegetation, evaluating the interaction between city morphology and climatic variables. This is paired with a module for the dynamic calculation of the solar position based on time and day, necessary for shading simulation.

For the study of microclimate and air currents, the static vector representation has been integrated with wind streamlines. These animated traces map flows, turbulence, and the canyon effect, allowing for the preliminary identification of critical issues related to ventilation and thermal comfort without having to query individual calculation cells.

In the realm of 2D analysis, contour visualization (isolines) has been introduced to represent the spatial distribution of temperature, humidity, and pollutants through continuous gradients, surpassing the previous discrete grid format. Temporal analysis is managed by an integrated player for the sequential playback of daily data. Finally, a dedicated editor allows the configuration of custom color palettes, useful for isolating specific thermal ranges or threshold values for research purposes.

### Upcoming Documentation
The complete documentation of the codebase will soon be uploaded to GitHub. The guide will be structured to facilitate the understanding of the new component-based architecture and to encourage development, the integration of new features, and contributions from the community.
