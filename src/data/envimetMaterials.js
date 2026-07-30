// Dati reali estratti dal database materiali ENVI-met (database.edb, versione
// V.4.4 Winter1819), decrittato localmente. Sostituisce le palette hardcoded
// di fallback usate finora in inxScene.js/colormap.js quando il database non
// era leggibile.
//
// Chiavi: ID esatto ENVI-met (com'è scritto nei file INX, es.
// BuildingWallMaterial/BuildingRoofMaterial per WALL/SINGLEWALL, matrice
// terreno per PROFILE). Colore decodificato da TColor Delphi (0x00BBGGRR,
// non RGB diretto) in "#rrggbb".
//
// legacy:true = voce storica (ID "LEGACY:"/gruppo "~ Legacy|..."), tenuta per
// compatibilità con progetti INX vecchi che la referenziano ancora.

export const WALL_DB = {
  "0100F1": {
    "description": "LEGACY: Passive wall - good insulation",
    "color": "#f8d6a3",
    "group": "~ Legacy|Misc",
    "legacy": true,
    "materials": [
      "0100F1",
      "0100F1",
      "0100F1"
    ],
    "thicknessLayers": [
      0.01,
      0.3,
      0.18
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0100F2": {
    "description": "LEGACY: Wall - no insulation",
    "color": "#800000",
    "group": "~ Legacy|Misc",
    "legacy": true,
    "materials": [
      "0100F2",
      "0100F2",
      "0100F2"
    ],
    "thicknessLayers": [
      0.02,
      0.38,
      0.01
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0100F3": {
    "description": "LEGACY: Wall - moderate insulation",
    "color": "#808080",
    "group": "~ Legacy|Misc",
    "legacy": true,
    "materials": [
      "0100F3",
      "0100F3",
      "0100F3"
    ],
    "thicknessLayers": [
      0.01,
      0.12,
      0.18
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0100MI": {
    "description": "LEGACY: Default Wall - moderate insulation",
    "color": "#808080",
    "group": "~ Legacy|Default",
    "legacy": true,
    "materials": [
      "0100PL",
      "0100IN",
      "0100CO"
    ],
    "thicknessLayers": [
      0.01,
      0.12,
      0.18
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0200MI": {
    "description": "Default Wall - moderate insulation",
    "color": "#808080",
    "group": "Default",
    "legacy": false,
    "materials": [
      "0200PL",
      "0200IN",
      "0200CO"
    ],
    "thicknessLayers": [
      0.01,
      0.12,
      0.18
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "010000": {
    "description": "LEGACY: Default Wall - moderate insulation",
    "color": "#808080",
    "group": "~ Legacy|Default",
    "legacy": true,
    "materials": [
      "0100PL",
      "0100IN",
      "0100CO"
    ],
    "thicknessLayers": [
      0.01,
      0.12,
      0.18
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0100SU": {
    "description": "LEGACY: PVC Sun Sail",
    "color": "#008000",
    "group": "~ Legacy|Misc Materials",
    "legacy": true,
    "materials": [
      "0000PV",
      "0000PV",
      "0000PV"
    ],
    "thicknessLayers": [
      0.02,
      0.02,
      0.02
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0200SU": {
    "description": "PVC Sun Sail",
    "color": "#008000",
    "group": "Misc Materials",
    "legacy": false,
    "materials": [
      "0200PV",
      "0200PV",
      "0200PV"
    ],
    "thicknessLayers": [
      0.02,
      0.02,
      0.02
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0100PC": {
    "description": "LEGACY: Concrete Wall, Photoactive",
    "color": "#ea3c37",
    "group": "~ Legacy|Misc Materials",
    "legacy": true,
    "materials": [
      "0000PC",
      "0000C2",
      "0000C2"
    ],
    "thicknessLayers": [
      0.1,
      0.1,
      0.1
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0100C1": {
    "description": "LEGACY: Concrete Wall (heavy)",
    "color": "#968d78",
    "group": "~ Legacy|Cement and Concrete",
    "legacy": true,
    "materials": [
      "0000C1",
      "0000C1",
      "0000C1"
    ],
    "thicknessLayers": [
      0.1,
      0.1,
      0.1
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0200C1": {
    "description": "Concrete Wall (heavy)",
    "color": "#968d78",
    "group": "Cement and Concrete",
    "legacy": false,
    "materials": [
      "0200C1",
      "0200C1",
      "0200C1"
    ],
    "thicknessLayers": [
      0.1,
      0.1,
      0.1
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0100C2": {
    "description": "LEGACY: Concrete wall (light weight)",
    "color": "#89828c",
    "group": "~ Legacy|Cement and Concrete",
    "legacy": true,
    "materials": [
      "0000C2",
      "0000C2",
      "0000C2"
    ],
    "thicknessLayers": [
      0.1,
      0.1,
      0.1
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0200C2": {
    "description": "Concrete wall (light weight)",
    "color": "#89828c",
    "group": "Cement and Concrete",
    "legacy": false,
    "materials": [
      "0200C2",
      "0200C2",
      "0200C2"
    ],
    "thicknessLayers": [
      0.1,
      0.1,
      0.1
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0100C3": {
    "description": "LEGACY: Concrete wall (hollow block)",
    "color": "#ac9ba4",
    "group": "~ Legacy|Cement and Concrete",
    "legacy": true,
    "materials": [
      "0000C3",
      "0000C3",
      "0000C3"
    ],
    "thicknessLayers": [
      0.1,
      0.1,
      0.1
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0200C3": {
    "description": "Concrete wall (hollow block)",
    "color": "#ac9ba4",
    "group": "Cement and Concrete",
    "legacy": false,
    "materials": [
      "0200C3",
      "0200C3",
      "0200C3"
    ],
    "thicknessLayers": [
      0.1,
      0.1,
      0.1
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0100C4": {
    "description": "LEGACY: Concrete wall (Filled block)",
    "color": "#6d746b",
    "group": "~ Legacy|Cement and Concrete",
    "legacy": true,
    "materials": [
      "0000C4",
      "0000C4",
      "0000C4"
    ],
    "thicknessLayers": [
      0.1,
      0.1,
      0.1
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0200C4": {
    "description": "Concrete wall (Filled block)",
    "color": "#6d746b",
    "group": "Cement and Concrete",
    "legacy": false,
    "materials": [
      "0200C4",
      "0200C4",
      "0200C4"
    ],
    "thicknessLayers": [
      0.1,
      0.1,
      0.1
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0100C5": {
    "description": "LEGACY: Concrete Wall (cast dense)",
    "color": "#535852",
    "group": "~ Legacy|Cement and Concrete",
    "legacy": true,
    "materials": [
      "0000C5",
      "0000C5",
      "0000C5"
    ],
    "thicknessLayers": [
      0.1,
      0.1,
      0.1
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0200C5": {
    "description": "Concrete Wall (cast dense)",
    "color": "#535852",
    "group": "Cement and Concrete",
    "legacy": false,
    "materials": [
      "0200C5",
      "0200C5",
      "0200C5"
    ],
    "thicknessLayers": [
      0.1,
      0.1,
      0.1
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0100G1": {
    "description": "LEGACY: Heat Protection Glass (one layered)",
    "color": "#fafafa",
    "group": "~ Legacy|Glass",
    "legacy": true,
    "materials": [
      "0000G1",
      "0000G1",
      "0000G1"
    ],
    "thicknessLayers": [
      0.01,
      0.01,
      0.01
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0200G1": {
    "description": "Heat Protection Glass (one layered)",
    "color": "#fafafa",
    "group": "Glass",
    "legacy": false,
    "materials": [
      "0200G1",
      "0200G1",
      "0200G1"
    ],
    "thicknessLayers": [
      0.01,
      0.01,
      0.01
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0100G2": {
    "description": "LEGACY: Plexiglass (one layered)",
    "color": "#a6f9ff",
    "group": "~ Legacy|Glass",
    "legacy": true,
    "materials": [
      "0000G2",
      "0000G2",
      "0000G2"
    ],
    "thicknessLayers": [
      0.01,
      0.01,
      0.01
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0200G2": {
    "description": "Plexiglass (one layered)",
    "color": "#a6f9ff",
    "group": "Glass",
    "legacy": false,
    "materials": [
      "0200G2",
      "0200G2",
      "0200G2"
    ],
    "thicknessLayers": [
      0.01,
      0.01,
      0.01
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0100G3": {
    "description": "LEGACY: Foamed Glass (one layered)",
    "color": "#70ccfe",
    "group": "~ Legacy|Glass",
    "legacy": true,
    "materials": [
      "0000G3",
      "0000G3",
      "0000G3"
    ],
    "thicknessLayers": [
      0.01,
      0.01,
      0.01
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0200G3": {
    "description": "Foamed Glass (one layered)",
    "color": "#70ccfe",
    "group": "Glass",
    "legacy": false,
    "materials": [
      "0200G3",
      "0200G3",
      "0200G3"
    ],
    "thicknessLayers": [
      0.01,
      0.01,
      0.01
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0100G4": {
    "description": "LEGACY: Clear Float glass (one layered)",
    "color": "#3cc5f9",
    "group": "~ Legacy|Glass",
    "legacy": true,
    "materials": [
      "0000G4",
      "0000G4",
      "0000G4"
    ],
    "thicknessLayers": [
      0.01,
      0.01,
      0.01
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0200G4": {
    "description": "Clear Float glass (one layered)",
    "color": "#3cc5f9",
    "group": "Glass",
    "legacy": false,
    "materials": [
      "0200G4",
      "0200G4",
      "0200G4"
    ],
    "thicknessLayers": [
      0.01,
      0.01,
      0.01
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0100G5": {
    "description": "LEGACY: Glass Bricks (one layered)",
    "color": "#1b4bf5",
    "group": "~ Legacy|Glass",
    "legacy": true,
    "materials": [
      "0000G5",
      "0000O2",
      "0000G5"
    ],
    "thicknessLayers": [
      0.02,
      0.02,
      0.02
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0200G5": {
    "description": "Glass Bricks (one layered)",
    "color": "#1b4bf5",
    "group": "Glass",
    "legacy": false,
    "materials": [
      "0200G5",
      "0200O2",
      "0200G5"
    ],
    "thicknessLayers": [
      0.02,
      0.02,
      0.02
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0100AL": {
    "description": "LEGACY: Aluminium (single layer)",
    "color": "#c0c0c0",
    "group": "~ Legacy|Simple Metal",
    "legacy": true,
    "materials": [
      "0000Al",
      "0000Al",
      "0000Al"
    ],
    "thicknessLayers": [
      0.01,
      0.01,
      0.01
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0200AL": {
    "description": "Aluminium (single layer)",
    "color": "#c0c0c0",
    "group": "Simple Metal",
    "legacy": false,
    "materials": [
      "0200Al",
      "0200Al",
      "0200Al"
    ],
    "thicknessLayers": [
      0.01,
      0.01,
      0.01
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0100CU": {
    "description": "LEGACY: Copper (single layer)",
    "color": "#aa5500",
    "group": "~ Legacy|Simple Metal",
    "legacy": true,
    "materials": [
      "0000Cu",
      "0000Cu",
      "0000Cu"
    ],
    "thicknessLayers": [
      0.01,
      0.01,
      0.01
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0200CU": {
    "description": "Copper (single layer)",
    "color": "#aa5500",
    "group": "Simple Metal",
    "legacy": false,
    "materials": [
      "0200Cu",
      "0200Cu",
      "0200Cu"
    ],
    "thicknessLayers": [
      0.01,
      0.01,
      0.01
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0100IR": {
    "description": "LEGACY: Iron (single layer)",
    "color": "#a2a2a2",
    "group": "~ Legacy|Simple Metal",
    "legacy": true,
    "materials": [
      "0000IR",
      "0000IR",
      "0000IR"
    ],
    "thicknessLayers": [
      0.01,
      0.01,
      0.01
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0200IR": {
    "description": "Iron (single layer)",
    "color": "#a2a2a2",
    "group": "Simple Metal",
    "legacy": false,
    "materials": [
      "0200IR",
      "0200IR",
      "0200IR"
    ],
    "thicknessLayers": [
      0.01,
      0.01,
      0.01
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0100ST": {
    "description": "LEGACY: Steel (one layer)",
    "color": "#c0c0c0",
    "group": "~ Legacy|Simple Metal",
    "legacy": true,
    "materials": [
      "0000ST",
      "0000ST",
      "0000ST"
    ],
    "thicknessLayers": [
      0.02,
      0.02,
      0.02
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0200ST": {
    "description": "Steel (one layer)",
    "color": "#c0c0c0",
    "group": "Simple Metal",
    "legacy": false,
    "materials": [
      "0200ST",
      "0200ST",
      "0200ST"
    ],
    "thicknessLayers": [
      0.02,
      0.02,
      0.02
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0100B1": {
    "description": "LEGACY: Brick wall (aerated)",
    "color": "#e07541",
    "group": "~ Legacy|Stones",
    "legacy": true,
    "materials": [
      "0000B1",
      "0000B1",
      "0000B1"
    ],
    "thicknessLayers": [
      0.15,
      0.15,
      0.15
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0200B1": {
    "description": "Brick wall (aerated)",
    "color": "#e07541",
    "group": "Stones",
    "legacy": false,
    "materials": [
      "0200B1",
      "0200B1",
      "0200B1"
    ],
    "thicknessLayers": [
      0.15,
      0.15,
      0.15
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0100B2": {
    "description": "LEGACY: Brick wall (burned)",
    "color": "#ea3c37",
    "group": "~ Legacy|Stones",
    "legacy": true,
    "materials": [
      "0000B2",
      "0000B2",
      "0000B2"
    ],
    "thicknessLayers": [
      0.15,
      0.15,
      0.15
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0200B2": {
    "description": "Brick wall (burned)",
    "color": "#ea3c37",
    "group": "Stones",
    "legacy": false,
    "materials": [
      "0200B2",
      "0200B2",
      "0200B2"
    ],
    "thicknessLayers": [
      0.15,
      0.15,
      0.15
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0100B3": {
    "description": "LEGACY: Brick wall (reinforced)",
    "color": "#c62009",
    "group": "~ Legacy|Stones",
    "legacy": true,
    "materials": [
      "0000B3",
      "0000B3",
      "0000B3"
    ],
    "thicknessLayers": [
      0.15,
      0.15,
      0.15
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0200B3": {
    "description": "Brick wall (reinforced)",
    "color": "#c62009",
    "group": "Stones",
    "legacy": false,
    "materials": [
      "0200B3",
      "0200B3",
      "0200B3"
    ],
    "thicknessLayers": [
      0.15,
      0.15,
      0.15
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0100R1": {
    "description": "LEGACY: Roofing: Tile",
    "color": "#98833a",
    "group": "~ Legacy|Roofing",
    "legacy": true,
    "materials": [
      "0000R1",
      "0000R1",
      "0000R1"
    ],
    "thicknessLayers": [
      0.1,
      0.1,
      0.1
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0200R1": {
    "description": "Roofing: Tile",
    "color": "#98833a",
    "group": "Roofing",
    "legacy": false,
    "materials": [
      "0200R1",
      "0200R1",
      "0200R1"
    ],
    "thicknessLayers": [
      0.1,
      0.1,
      0.1
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0100R2": {
    "description": "LEGACY: Roofing: Terracotta",
    "color": "#c18533",
    "group": "~ Legacy|Roofing",
    "legacy": true,
    "materials": [
      "0000R2",
      "0000R2",
      "0000R2"
    ],
    "thicknessLayers": [
      0.1,
      0.1,
      0.1
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0100GH": {
    "description": "LEGACY: Heat protection glass (one air layer)",
    "color": "#fafafa",
    "group": "~ Legacy|Glass",
    "legacy": true,
    "materials": [
      "0000G1",
      "0000O2",
      "0000G1"
    ],
    "thicknessLayers": [
      0.5,
      0.5,
      0.5
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0200GH": {
    "description": "Heat protection glass (one air layer)",
    "color": "#fafafa",
    "group": "Glass",
    "legacy": false,
    "materials": [
      "0200G1",
      "0200O2",
      "0200G1"
    ],
    "thicknessLayers": [
      0.01,
      0.01,
      0.05
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0100WR": {
    "description": "LEGACY: WetRoof",
    "color": "#8080ff",
    "group": "~ Legacy|Cement and Concrete",
    "legacy": true,
    "materials": [
      "0000WC",
      "0000C2",
      "0000C2"
    ],
    "thicknessLayers": [
      0.3,
      0.3,
      0.3
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0200WR": {
    "description": "WetRoof",
    "color": "#8080ff",
    "group": "Cement and Concrete",
    "legacy": false,
    "materials": [
      "0200WC",
      "0200C2",
      "0200C2"
    ],
    "thicknessLayers": [
      0.3,
      0.3,
      0.3
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0100SG": {
    "description": "LEGACY: Shading Plexiglass",
    "color": "#8080c0",
    "group": "~ Legacy|Glass",
    "legacy": true,
    "materials": [
      "0000SG",
      "0000SG",
      "0000O2"
    ],
    "thicknessLayers": [
      0.01,
      0.01,
      0.01
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0200SG": {
    "description": "Shading Plexiglass",
    "color": "#8080c0",
    "group": "Glass",
    "legacy": false,
    "materials": [
      "0200SG",
      "0200SG",
      "0200SG"
    ],
    "thicknessLayers": [
      0.01,
      0.01,
      0.01
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0000CS": {
    "description": "LEGACY: Concrete slab (hollow block, default)",
    "color": "#ac9ba4",
    "group": "~ Legacy|Cement and Concrete",
    "legacy": true,
    "materials": [
      "0000C3",
      "0000C3",
      "0000C3"
    ],
    "thicknessLayers": [
      0.1,
      0.1,
      0.1
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0000F1": {
    "description": "LEGACY: Passive wall - good insulation",
    "color": "#f8d6a3",
    "group": "~ Legacy|Misc",
    "legacy": true,
    "materials": [
      "0000F1",
      "0000F1",
      "0000F1"
    ],
    "thicknessLayers": [
      0.01,
      0.3,
      0.18
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0000F2": {
    "description": "LEGACY: Wall - no insulation",
    "color": "#800000",
    "group": "~ Legacy|Misc",
    "legacy": true,
    "materials": [
      "0000F2",
      "0000F2",
      "0000F2"
    ],
    "thicknessLayers": [
      0.02,
      0.38,
      0.01
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0000F3": {
    "description": "LEGACY: Wall - moderate insulation",
    "color": "#808080",
    "group": "~ Legacy|Misc",
    "legacy": true,
    "materials": [
      "0000F3",
      "0000F3",
      "0000F3"
    ],
    "thicknessLayers": [
      0.01,
      0.12,
      0.18
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "000000": {
    "description": "Default Wall - moderate insulation",
    "color": "#808080",
    "group": "Default",
    "legacy": false,
    "materials": [
      "0200PL",
      "0200IN",
      "0200CO"
    ],
    "thicknessLayers": [
      0.01,
      0.12,
      0.18
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0000MI": {
    "description": "LEGACY: Default Wall - moderate insulation",
    "color": "#808080",
    "group": "~ Legacy|Default",
    "legacy": true,
    "materials": [
      "0100PL",
      "0100IN",
      "0100CO"
    ],
    "thicknessLayers": [
      0.01,
      0.12,
      0.18
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0000SU": {
    "description": "LEGACY: PVC Sun Sail",
    "color": "#008000",
    "group": "~ Legacy|Misc Materials",
    "legacy": true,
    "materials": [
      "0000PV",
      "0000PV",
      "0000PV"
    ],
    "thicknessLayers": [
      0.02,
      0.02,
      0.02
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0000PC": {
    "description": "LEGACY: Concrete Wall, Photoactive",
    "color": "#ea3c37",
    "group": "~ Legacy|Misc Materials",
    "legacy": true,
    "materials": [
      "0000PC",
      "0000C2",
      "0000C2"
    ],
    "thicknessLayers": [
      0.1,
      0.1,
      0.1
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0000C1": {
    "description": "LEGACY: Concrete Wall (heavy)",
    "color": "#968d78",
    "group": "~ Legacy|Cement and Concrete",
    "legacy": true,
    "materials": [
      "0000C1",
      "0000C1",
      "0000C1"
    ],
    "thicknessLayers": [
      0.1,
      0.1,
      0.1
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0000C2": {
    "description": "LEGACY: Concrete wall (light weight)",
    "color": "#89828c",
    "group": "~ Legacy|Cement and Concrete",
    "legacy": true,
    "materials": [
      "0000C2",
      "0000C2",
      "0000C2"
    ],
    "thicknessLayers": [
      0.1,
      0.1,
      0.1
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0000C3": {
    "description": "LEGACY: Concrete wall (hollow block)",
    "color": "#ac9ba4",
    "group": "~ Legacy|Cement and Concrete",
    "legacy": true,
    "materials": [
      "0000C3",
      "0000C3",
      "0000C3"
    ],
    "thicknessLayers": [
      0.1,
      0.1,
      0.1
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0000C4": {
    "description": "LEGACY: Concrete wall (Filled block)",
    "color": "#6d746b",
    "group": "~ Legacy|Cement and Concrete",
    "legacy": true,
    "materials": [
      "0000C4",
      "0000C4",
      "0000C4"
    ],
    "thicknessLayers": [
      0.1,
      0.1,
      0.1
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0000C5": {
    "description": "LEGACY: Concrete Wall (cast dense)",
    "color": "#535852",
    "group": "~ Legacy|Cement and Concrete",
    "legacy": true,
    "materials": [
      "0000C5",
      "0000C5",
      "0000C5"
    ],
    "thicknessLayers": [
      0.1,
      0.1,
      0.1
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0000G1": {
    "description": "LEGACY: Heat Protection Glass (one layered)",
    "color": "#fafafa",
    "group": "~ Legacy|Glass",
    "legacy": true,
    "materials": [
      "0000G1",
      "0000G1",
      "0000G1"
    ],
    "thicknessLayers": [
      0.01,
      0.01,
      0.01
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0000G2": {
    "description": "LEGACY: Plexiglass (one layered)",
    "color": "#a6f9ff",
    "group": "~ Legacy|Glass",
    "legacy": true,
    "materials": [
      "0000G2",
      "0000G2",
      "0000G2"
    ],
    "thicknessLayers": [
      0.01,
      0.01,
      0.01
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0000G3": {
    "description": "LEGACY: Foamed Glass (one layered)",
    "color": "#70ccfe",
    "group": "~ Legacy|Glass",
    "legacy": true,
    "materials": [
      "0000G3",
      "0000G3",
      "0000G3"
    ],
    "thicknessLayers": [
      0.01,
      0.01,
      0.01
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0000G4": {
    "description": "LEGACY: Clear Float glass (one layered)",
    "color": "#3cc5f9",
    "group": "~ Legacy|Glass",
    "legacy": true,
    "materials": [
      "0000G4",
      "0000G4",
      "0000G4"
    ],
    "thicknessLayers": [
      0.01,
      0.01,
      0.01
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0000G5": {
    "description": "LEGACY: Glass Bricks (one layered)",
    "color": "#1b4bf5",
    "group": "~ Legacy|Glass",
    "legacy": true,
    "materials": [
      "0000G5",
      "0000O2",
      "0000G5"
    ],
    "thicknessLayers": [
      0.02,
      0.02,
      0.02
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0000AL": {
    "description": "LEGACY: Aluminium (single layer)",
    "color": "#c0c0c0",
    "group": "~ Legacy|Simple Metal",
    "legacy": true,
    "materials": [
      "0000Al",
      "0000Al",
      "0000Al"
    ],
    "thicknessLayers": [
      0.01,
      0.01,
      0.01
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0000CU": {
    "description": "LEGACY: Copper (single layer)",
    "color": "#aa5500",
    "group": "~ Legacy|Simple Metal",
    "legacy": true,
    "materials": [
      "0000Cu",
      "0000Cu",
      "0000Cu"
    ],
    "thicknessLayers": [
      0.01,
      0.01,
      0.01
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0000IR": {
    "description": "LEGACY: Iron (single layer)",
    "color": "#a2a2a2",
    "group": "~ Legacy|Simple Metal",
    "legacy": true,
    "materials": [
      "0000IR",
      "0000IR",
      "0000IR"
    ],
    "thicknessLayers": [
      0.01,
      0.01,
      0.01
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0000ST": {
    "description": "LEGACY: Steel (one layer)",
    "color": "#c0c0c0",
    "group": "~ Legacy|Simple Metal",
    "legacy": true,
    "materials": [
      "0000ST",
      "0000ST",
      "0000ST"
    ],
    "thicknessLayers": [
      0.02,
      0.02,
      0.02
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0000B1": {
    "description": "LEGACY: Brick wall (aerated)",
    "color": "#e07541",
    "group": "~ Legacy|Stones",
    "legacy": true,
    "materials": [
      "0000B1",
      "0000B1",
      "0000B1"
    ],
    "thicknessLayers": [
      0.15,
      0.15,
      0.15
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0000B2": {
    "description": "LEGACY: Brick wall (burned)",
    "color": "#ea3c37",
    "group": "~ Legacy|Stones",
    "legacy": true,
    "materials": [
      "0000B2",
      "0000B2",
      "0000B2"
    ],
    "thicknessLayers": [
      0.15,
      0.15,
      0.15
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0000B3": {
    "description": "LEGACY: Brick wall (reinforced)",
    "color": "#c62009",
    "group": "~ Legacy|Stones",
    "legacy": true,
    "materials": [
      "0000B3",
      "0000B3",
      "0000B3"
    ],
    "thicknessLayers": [
      0.15,
      0.15,
      0.15
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0000R1": {
    "description": "LEGACY: Roofing: Tile",
    "color": "#98833a",
    "group": "~ Legacy|Roofing",
    "legacy": true,
    "materials": [
      "0000R1",
      "0000R1",
      "0000R1"
    ],
    "thicknessLayers": [
      0.1,
      0.1,
      0.1
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0000R2": {
    "description": "LEGACY: Roofing: Terracotta",
    "color": "#c18533",
    "group": "~ Legacy|Roofing",
    "legacy": true,
    "materials": [
      "0000R2",
      "0000R2",
      "0000R2"
    ],
    "thicknessLayers": [
      0.1,
      0.1,
      0.1
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0000GH": {
    "description": "LEGACY: Heat protection glass (one air layer)",
    "color": "#fafafa",
    "group": "~ Legacy|Glass",
    "legacy": true,
    "materials": [
      "0000G1",
      "0000O2",
      "0000G1"
    ],
    "thicknessLayers": [
      0.5,
      0.5,
      0.5
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0000WR": {
    "description": "LEGACY: WetRoof",
    "color": "#8080ff",
    "group": "~ Legacy|Cement and Concrete",
    "legacy": true,
    "materials": [
      "0000WC",
      "0000C2",
      "0000C2"
    ],
    "thicknessLayers": [
      0.3,
      0.3,
      0.3
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0000SG": {
    "description": "LEGACY: Shading Plexiglass",
    "color": "#8080c0",
    "group": "~ Legacy|Glass",
    "legacy": true,
    "materials": [
      "0000SG",
      "0000SG",
      "0000O2"
    ],
    "thicknessLayers": [
      0.01,
      0.01,
      0.01
    ],
    "roughnessLength": 0.02,
    "canBeGreened": true
  },
  "0200PW": {
    "description": "Photovoltaic Concrete Insulation Wall",
    "color": "#8080ff",
    "group": "Glass",
    "legacy": false,
    "materials": [
      "0PHOTO",
      "0200IN",
      "0200CO"
    ],
    "thicknessLayers": [
      0.05,
      0.12,
      0.18
    ],
    "roughnessLength": 0.02,
    "canBeGreened": false
  }
};

export const SINGLEWALL_DB = {
  "000001": {
    "name": "LEGACY: SunSail",
    "color": "#008040",
    "group": "~ Legacy",
    "legacy": true,
    "material": "0000PV",
    "thickness": 0.2,
    "roughnessLength": 0.02
  },
  "02000S": {
    "name": "SunSail",
    "color": "#008040",
    "group": null,
    "legacy": false,
    "material": "0200PV",
    "thickness": 0.2,
    "roughnessLength": 0.02
  },
  "0000BW": {
    "name": "LEGACY: BrickWall",
    "color": "#ea3c37",
    "group": "~ Legacy",
    "legacy": true,
    "material": "0000B2",
    "thickness": 0.5,
    "roughnessLength": 0.02
  },
  "0200BW": {
    "name": "BrickWall",
    "color": "#ea3c37",
    "group": null,
    "legacy": false,
    "material": "0200B2",
    "thickness": 0.5,
    "roughnessLength": 0.02
  },
  "0200PV": {
    "name": "Photovoltaic Panel",
    "color": "#0b1e08",
    "group": null,
    "legacy": false,
    "material": "0PHOTO",
    "thickness": 0.01,
    "roughnessLength": 0.02
  }
};

export const PROFILE_DB = {
  "CELLAR": {
    "description": "Default soil profile underneath a building",
    "color": "#808080",
    "group": "Special Surfaces",
    "legacy": false,
    "soilProfile": [
      "0200ZB",
      "0200ZB",
      "0200ZB",
      "0200ZB",
      "0200ZB",
      "0200ZB",
      "0200ZB",
      "0200ZB",
      "0200ZB",
      "0200ZB",
      "0200ZB",
      "0200ZB",
      "0200ZB",
      "0200ZB",
      "0200ZB",
      "0200ZB",
      "0200ZB",
      "0200ZB",
      "0200ZB"
    ],
    "albedo": 0.2
  },
  "010000": {
    "description": "LEGACY: Default Unsealed Soil (Sandy Loam)",
    "color": "#58582c",
    "group": "~ Legacy|Natural surfaces",
    "legacy": true,
    "soilProfile": [
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL"
    ],
    "albedo": 0.2
  },
  "0100SL": {
    "description": "LEGACY: Default Unsealed Soil (Sandy Loam)",
    "color": "#58582c",
    "group": "~ Legacy|Natural surfaces",
    "legacy": true,
    "soilProfile": [
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL"
    ],
    "albedo": 0.2
  },
  "0200SL": {
    "description": "Default Unsealed Soil (Sandy Loam)",
    "color": "#58582c",
    "group": "Natural surfaces",
    "legacy": false,
    "soilProfile": [
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL"
    ],
    "albedo": 0.2
  },
  "0000LS": {
    "description": "LEGACY: Unsealed Soil (Loamy Soil)",
    "color": "#6a3535",
    "group": "~ Legacy|Natural surfaces",
    "legacy": true,
    "soilProfile": [
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE"
    ],
    "albedo": 0.2
  },
  "0000ST": {
    "description": "LEGACY: Asphalt Road",
    "color": "#171717",
    "group": "~ Legacy|Roads&Pavements",
    "legacy": true,
    "soilProfile": [
      "0000AB",
      "0000AB",
      "0000AB",
      "0000AB",
      "0000AB",
      "0000AB",
      "0000AB",
      "0000AB",
      "0000AB",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE"
    ],
    "albedo": 0.2
  },
  "0100ST": {
    "description": "LEGACY: Asphalt Road",
    "color": "#171717",
    "group": "~ Legacy|Roads&Pavements",
    "legacy": true,
    "soilProfile": [
      "0000AB",
      "0000AB",
      "0000AB",
      "0000AB",
      "0000AB",
      "0000AB",
      "0000AB",
      "0000AB",
      "0000AB",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL"
    ],
    "albedo": 0.2
  },
  "0200ST": {
    "description": "Asphalt Road",
    "color": "#171717",
    "group": "Roads&Pavements",
    "legacy": false,
    "soilProfile": [
      "0200AB",
      "0200AB",
      "0200AB",
      "0200AB",
      "0200AB",
      "0200AB",
      "0200AB",
      "0200AB",
      "0200AB",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL"
    ],
    "albedo": 0.12
  },
  "0100PP": {
    "description": "LEGACY: Pavement (Concrete), used/ dirty",
    "color": "#8f8e9d",
    "group": "~ Legacy|Roads&Pavements",
    "legacy": true,
    "soilProfile": [
      "0200ZB",
      "0200ZB",
      "0200ZB",
      "0200ZB",
      "0200SD",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL"
    ],
    "albedo": 0.25
  },
  "0200PP": {
    "description": "Pavement (Concrete), used/ dirty",
    "color": "#8f8e9d",
    "group": "Roads&Pavements",
    "legacy": false,
    "soilProfile": [
      "0200ZB",
      "0200ZB",
      "0200ZB",
      "0200ZB",
      "0200SD",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL"
    ],
    "albedo": 0.25
  },
  "0000PP": {
    "description": "LEGACY: Pavement (Concrete), used/ dirty",
    "color": "#8f8e9d",
    "group": "~ Legacy|Roads&Pavements",
    "legacy": true,
    "soilProfile": [
      "0200ZB",
      "0200ZB",
      "0200ZB",
      "0200ZB",
      "0200SD",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL"
    ],
    "albedo": 0.3
  },
  "000000": {
    "description": "Default Sandy Loam",
    "color": "#58582c",
    "group": "Natural surfaces",
    "legacy": false,
    "soilProfile": [
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL"
    ],
    "albedo": 0.2
  },
  "0000LO": {
    "description": "LEGACY: Loamy Soil",
    "color": "#b76204",
    "group": "~ Legacy|Natural surfaces",
    "legacy": true,
    "soilProfile": [
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE"
    ],
    "albedo": 0.0
  },
  "0100LO": {
    "description": "LEGACY: Loamy Soil",
    "color": "#b76204",
    "group": "~ Legacy|Natural surfaces",
    "legacy": true,
    "soilProfile": [
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE"
    ],
    "albedo": 0.0
  },
  "0200LO": {
    "description": "Loamy Soil",
    "color": "#b76204",
    "group": "Natural surfaces",
    "legacy": false,
    "soilProfile": [
      "0200LE",
      "0200LE",
      "0200LE",
      "0200LE",
      "0200LE",
      "0200LE",
      "0200LE",
      "0200LE",
      "0200LE",
      "0200LE",
      "0200LE",
      "0200LE",
      "0200LE",
      "0200LE",
      "0200LE",
      "0200LE",
      "0200LE",
      "0200LE",
      "0200LE"
    ],
    "albedo": 0.0
  },
  "0000SD": {
    "description": "LEGACY: Sandy Soil",
    "color": "#edd165",
    "group": "~ Legacy|Natural surfaces",
    "legacy": true,
    "soilProfile": [
      "0000SD",
      "0000SD",
      "0000SD",
      "0000SD",
      "0000SD",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE"
    ],
    "albedo": 0.0
  },
  "0100SD": {
    "description": "LEGACY: Sandy Soil",
    "color": "#edd165",
    "group": "~ Legacy|Natural surfaces",
    "legacy": true,
    "soilProfile": [
      "0000SD",
      "0000SD",
      "0000SD",
      "0000SD",
      "0000SD",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL"
    ],
    "albedo": 0.0
  },
  "0200SD": {
    "description": "Sandy Soil",
    "color": "#edd165",
    "group": "Natural surfaces",
    "legacy": false,
    "soilProfile": [
      "0200SD",
      "0200SD",
      "0200SD",
      "0200SD",
      "0200SD",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL"
    ],
    "albedo": 0.0
  },
  "0000WW": {
    "description": "LEGACY: Deep Water",
    "color": "#070de0",
    "group": "~ Legacy|other",
    "legacy": true,
    "soilProfile": [
      "0000WW",
      "0000WW",
      "0000WW",
      "0000WW",
      "0000WW",
      "0000WW",
      "0000WW",
      "0000WW",
      "0000WW",
      "0000WW",
      "0000WW",
      "0000WW",
      "0000WW",
      "0000WW",
      "0000WW",
      "0000WW",
      "0000WW",
      "0000WW",
      "0000WW"
    ],
    "albedo": 0.0
  },
  "0100WW": {
    "description": "LEGACY: Deep Water",
    "color": "#070de0",
    "group": "~ Legacy|other",
    "legacy": true,
    "soilProfile": [
      "0000WW",
      "0000WW",
      "0000WW",
      "0000WW",
      "0000WW",
      "0000WW",
      "0000WW",
      "0000WW",
      "0000WW",
      "0000WW",
      "0000WW",
      "0000WW",
      "0000WW",
      "0000WW",
      "0000WW",
      "0000WW",
      "0000WW",
      "0000WW",
      "0000WW"
    ],
    "albedo": 0.0
  },
  "0200WW": {
    "description": "Deep Water",
    "color": "#070de0",
    "group": "other",
    "legacy": false,
    "soilProfile": [
      "0200WW",
      "0200WW",
      "0200WW",
      "0200WW",
      "0200WW",
      "0200WW",
      "0200WW",
      "0200WW",
      "0200WW",
      "0200WW",
      "0200WW",
      "0200WW",
      "0200WW",
      "0200WW",
      "0200WW",
      "0200WW",
      "0200WW",
      "0200WW",
      "0200WW"
    ],
    "albedo": 0.0
  },
  "0000KK": {
    "description": "LEGACY: Brick road (red stones)",
    "color": "#e85733",
    "group": "~ Legacy|Decorative",
    "legacy": true,
    "soilProfile": [
      "0000BR",
      "0000BR",
      "0000BR",
      "0000SD",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE"
    ],
    "albedo": 0.3
  },
  "0100KK": {
    "description": "LEGACY: Brick road (red stones)",
    "color": "#e85733",
    "group": "~ Legacy|Decorative",
    "legacy": true,
    "soilProfile": [
      "0000BR",
      "0000BR",
      "0000BR",
      "0000SD",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL"
    ],
    "albedo": 0.3
  },
  "0200KK": {
    "description": "Brick road (red stones)",
    "color": "#e85733",
    "group": "Decorative",
    "legacy": false,
    "soilProfile": [
      "0200BR",
      "0200BR",
      "0200BR",
      "0200SD",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL"
    ],
    "albedo": 0.3
  },
  "0000KG": {
    "description": "LEGACY: Brick road (yellow stones)",
    "color": "#cfcc5a",
    "group": "~ Legacy|Decorative",
    "legacy": true,
    "soilProfile": [
      "0000BR",
      "0000BR",
      "0000BR",
      "0000SD",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE"
    ],
    "albedo": 0.5
  },
  "0100KG": {
    "description": "LEGACY: Brick road (yellow stones)",
    "color": "#cfcc5a",
    "group": "~ Legacy|Decorative",
    "legacy": true,
    "soilProfile": [
      "0000BR",
      "0000BR",
      "0000BR",
      "0000SD",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL"
    ],
    "albedo": 0.5
  },
  "0200KG": {
    "description": "Brick road (yellow stones)",
    "color": "#cfcc5a",
    "group": "Decorative",
    "legacy": false,
    "soilProfile": [
      "0200BR",
      "0200BR",
      "0200BR",
      "0200SD",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL"
    ],
    "albedo": 0.4
  },
  "0000GG": {
    "description": "LEGACY: Dark Granit Pavement",
    "color": "#808080",
    "group": "~ Legacy|Roads&Pavements",
    "legacy": true,
    "soilProfile": [
      "0000GR",
      "0000GR",
      "0000SD",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE"
    ],
    "albedo": 0.3
  },
  "0100GG": {
    "description": "LEGACY: Dark Granit Pavement",
    "color": "#808080",
    "group": "~ Legacy|Roads&Pavements",
    "legacy": true,
    "soilProfile": [
      "0000GR",
      "0000GR",
      "0000SD",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL"
    ],
    "albedo": 0.3
  },
  "0200GG": {
    "description": "Dark Granit Pavement",
    "color": "#808080",
    "group": "Roads&Pavements",
    "legacy": false,
    "soilProfile": [
      "0200GR",
      "0200GR",
      "0200SD",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL"
    ],
    "albedo": 0.25
  },
  "0000GS": {
    "description": "LEGACY: Granit Pavement (single stones)",
    "color": "#707070",
    "group": "~ Legacy|Roads&Pavements",
    "legacy": true,
    "soilProfile": [
      "0000GR",
      "0000GR",
      "0000GR",
      "0000GR",
      "0000GR",
      "0000MB",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE"
    ],
    "albedo": 0.4
  },
  "0100GS": {
    "description": "LEGACY: Granit Pavement (single stones)",
    "color": "#707070",
    "group": "~ Legacy|Roads&Pavements",
    "legacy": true,
    "soilProfile": [
      "0000GR",
      "0000GR",
      "0000GR",
      "0000GR",
      "0000GR",
      "0000MB",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL"
    ],
    "albedo": 0.4
  },
  "0200GS": {
    "description": "Granit Pavement (single stones)",
    "color": "#707070",
    "group": "Roads&Pavements",
    "legacy": false,
    "soilProfile": [
      "0200GR",
      "0200GR",
      "0200GR",
      "0200GR",
      "0200GR",
      "0200MB",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL"
    ],
    "albedo": 0.35
  },
  "0000G2": {
    "description": "LEGACY: Granit shining",
    "color": "#c0c0c0",
    "group": "~ Legacy|Roads&Pavements",
    "legacy": true,
    "soilProfile": [
      "0000GR",
      "0000GR",
      "0000GR",
      "0000GR",
      "0000GR",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE"
    ],
    "albedo": 0.8
  },
  "0100G2": {
    "description": "LEGACY: Granit shining",
    "color": "#c0c0c0",
    "group": "~ Legacy|Roads&Pavements",
    "legacy": true,
    "soilProfile": [
      "0000GR",
      "0000GR",
      "0000GR",
      "0000GR",
      "0000GR",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL"
    ],
    "albedo": 0.8
  },
  "0200G2": {
    "description": "Granit shining",
    "color": "#c0c0c0",
    "group": "Roads&Pavements",
    "legacy": false,
    "soilProfile": [
      "0200GR",
      "0200GR",
      "0200GR",
      "0200GR",
      "0200GR",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL"
    ],
    "albedo": 0.6
  },
  "0000WC": {
    "description": "LEGACY: Wet Concrete TEST",
    "color": "#8f8e9d",
    "group": "~ Legacy|Special Surfaces",
    "legacy": true,
    "soilProfile": [
      "0000CC",
      "0000CC",
      "0000CC",
      "0000CC",
      "0000SD",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE"
    ],
    "albedo": 0.4
  },
  "0100WC": {
    "description": "LEGACY: Wet Concrete TEST",
    "color": "#8f8e9d",
    "group": "~ Legacy|Special Surfaces",
    "legacy": true,
    "soilProfile": [
      "0000CC",
      "0000CC",
      "0000CC",
      "0000CC",
      "0000SD",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL"
    ],
    "albedo": 0.4
  },
  "0000PC": {
    "description": "LEGACY: PhotocatTest",
    "color": "#e85733",
    "group": "~ Legacy|Special Surfaces",
    "legacy": true,
    "soilProfile": [
      "0000ZB",
      "0000ZB",
      "0000ZB",
      "0000ZB",
      "0000SD",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE"
    ],
    "albedo": 0.4
  },
  "0100PC": {
    "description": "LEGACY: PhotocatTest",
    "color": "#e85733",
    "group": "~ Legacy|Special Surfaces",
    "legacy": true,
    "soilProfile": [
      "0000ZB",
      "0000ZB",
      "0000ZB",
      "0000ZB",
      "0000SD",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL"
    ],
    "albedo": 0.4
  },
  "0000PG": {
    "description": "LEGACY: Concrete Pavement Gray",
    "color": "#c0c0c0",
    "group": "~ Legacy|Roads&Pavements",
    "legacy": true,
    "soilProfile": [
      "0000ZB",
      "0000ZB",
      "0000ZB",
      "0000ZB",
      "0000SD",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE"
    ],
    "albedo": 0.5
  },
  "0100PG": {
    "description": "LEGACY: Concrete Pavement Gray",
    "color": "#c0c0c0",
    "group": "~ Legacy|Roads&Pavements",
    "legacy": true,
    "soilProfile": [
      "0000ZB",
      "0000ZB",
      "0000ZB",
      "0000ZB",
      "0000SD",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL"
    ],
    "albedo": 0.5
  },
  "0200PG": {
    "description": "Concrete Pavement Gray",
    "color": "#c0c0c0",
    "group": "Roads&Pavements",
    "legacy": false,
    "soilProfile": [
      "0200ZB",
      "0200ZB",
      "0200ZB",
      "0200ZB",
      "0200SD",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0000SL"
    ],
    "albedo": 0.3
  },
  "0000PL": {
    "description": "LEGACY: Concrete Pavement Light",
    "color": "#e4e4e4",
    "group": "~ Legacy|Roads&Pavements",
    "legacy": true,
    "soilProfile": [
      "0000ZB",
      "0000ZB",
      "0000ZB",
      "0000ZB",
      "0000SD",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE"
    ],
    "albedo": 0.8
  },
  "0100PL": {
    "description": "LEGACY: Concrete Pavement Light",
    "color": "#e4e4e4",
    "group": "~ Legacy|Roads&Pavements",
    "legacy": true,
    "soilProfile": [
      "0000ZB",
      "0000ZB",
      "0000ZB",
      "0000ZB",
      "0000SD",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL"
    ],
    "albedo": 0.8
  },
  "0200PL": {
    "description": "Concrete Pavement Light",
    "color": "#e4e4e4",
    "group": "Roads&Pavements",
    "legacy": false,
    "soilProfile": [
      "0200ZB",
      "0200ZB",
      "0200ZB",
      "0200ZB",
      "0200SD",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL"
    ],
    "albedo": 0.5
  },
  "0000PD": {
    "description": "LEGACY: Concrete Pavement Dark",
    "color": "#707070",
    "group": "~ Legacy|Roads&Pavements",
    "legacy": true,
    "soilProfile": [
      "0000ZB",
      "0000ZB",
      "0000ZB",
      "0000ZB",
      "0000SD",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE"
    ],
    "albedo": 0.2
  },
  "0100PD": {
    "description": "LEGACY: Concrete Pavement Dark",
    "color": "#707070",
    "group": "~ Legacy|Roads&Pavements",
    "legacy": true,
    "soilProfile": [
      "0000ZB",
      "0000ZB",
      "0000ZB",
      "0000ZB",
      "0000SD",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL"
    ],
    "albedo": 0.2
  },
  "0200PD": {
    "description": "Concrete Pavement Dark",
    "color": "#707070",
    "group": "Roads&Pavements",
    "legacy": false,
    "soilProfile": [
      "0200ZB",
      "0200ZB",
      "0200ZB",
      "0200ZB",
      "0200SD",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL"
    ],
    "albedo": 0.2
  },
  "0000TB": {
    "description": "LEGACY: Terre battue (Smashed brick)",
    "color": "#ff8040",
    "group": "~ Legacy|Roads&Pavements",
    "legacy": true,
    "soilProfile": [
      "0000BS",
      "0000BS",
      "0000BS",
      "0000SD",
      "0000LS",
      "0000LS",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE"
    ],
    "albedo": 0.4
  },
  "0100TB": {
    "description": "LEGACY: Terre battue (Smashed brick)",
    "color": "#ff8040",
    "group": "~ Legacy|Roads&Pavements",
    "legacy": true,
    "soilProfile": [
      "0000BS",
      "0000BS",
      "0000BS",
      "0000SD",
      "0000LS",
      "0000LS",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL"
    ],
    "albedo": 0.4
  },
  "0000AR": {
    "description": "LEGACY: Asphalt road with red coating",
    "color": "#ff0080",
    "group": "~ Legacy|Roads&Pavements",
    "legacy": true,
    "soilProfile": [
      "0000AB",
      "0000AB",
      "0000AB",
      "0000AB",
      "0000AB",
      "0000AK",
      "0000AB",
      "0000AB",
      "0000AB",
      "0000AB",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE"
    ],
    "albedo": 0.5
  },
  "0100AR": {
    "description": "LEGACY: Asphalt road with red coating",
    "color": "#ff0080",
    "group": "~ Legacy|Roads&Pavements",
    "legacy": true,
    "soilProfile": [
      "0000AB",
      "0000AB",
      "0000AB",
      "0000AB",
      "0000AB",
      "0000AK",
      "0000AB",
      "0000AB",
      "0000AB",
      "0000AB",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL"
    ],
    "albedo": 0.5
  },
  "0200AR": {
    "description": "Asphalt road with red coating",
    "color": "#ff0080",
    "group": "Roads&Pavements",
    "legacy": false,
    "soilProfile": [
      "0200AB",
      "0200AB",
      "0200AB",
      "0200AB",
      "0200AB",
      "0200AB",
      "0200AB",
      "0200AB",
      "0200AB",
      "0200AB",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL"
    ],
    "albedo": 0.4
  },
  "0000BA": {
    "description": "LEGACY: Basalt Brick Road",
    "color": "#da68dc",
    "group": "~ Legacy|Roads&Pavements",
    "legacy": true,
    "soilProfile": [
      "0000BA",
      "0000BA",
      "0000BA",
      "0000BA",
      "0000BA",
      "0000SD",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE"
    ],
    "albedo": 0.2
  },
  "0100BA": {
    "description": "LEGACY: Basalt Brick Road",
    "color": "#da68dc",
    "group": "~ Legacy|Roads&Pavements",
    "legacy": true,
    "soilProfile": [
      "0000BA",
      "0000BA",
      "0000BA",
      "0000BA",
      "0000BA",
      "0000SD",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL"
    ],
    "albedo": 0.2
  },
  "0200BA": {
    "description": "Basalt Brick Road",
    "color": "#da68dc",
    "group": "Roads&Pavements",
    "legacy": false,
    "soilProfile": [
      "0200BA",
      "0200BA",
      "0200BA",
      "0200BA",
      "0200BA",
      "0200SD",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL"
    ],
    "albedo": 0.2
  },
  "0000WD": {
    "description": "LEGACY: Wood Planks",
    "color": "#804000",
    "group": "~ Legacy|Roads&Pavements",
    "legacy": true,
    "soilProfile": [
      "0000WD",
      "0000WD",
      "0000WD",
      "0000WD",
      "0000WD",
      "0000WD",
      "0000WD",
      "0000SD",
      "0000LS",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE",
      "0000LE"
    ],
    "albedo": 0.35
  },
  "0100WD": {
    "description": "LEGACY: Wood Planks",
    "color": "#804000",
    "group": "~ Legacy|Roads&Pavements",
    "legacy": true,
    "soilProfile": [
      "0000WD",
      "0000WD",
      "0000WD",
      "0000WD",
      "0000WD",
      "0000WD",
      "0000WD",
      "0000SD",
      "0000LS",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL"
    ],
    "albedo": 0.35
  },
  "0200WD": {
    "description": "Wood Planks",
    "color": "#804000",
    "group": "Roads&Pavements",
    "legacy": false,
    "soilProfile": [
      "0200WD",
      "0200WD",
      "0200WD",
      "0200WD",
      "0200WD",
      "0200WD",
      "0200WD",
      "0200SD",
      "0200LS",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL"
    ],
    "albedo": 0.35
  },
  "0100DW": {
    "description": "LEGACY: Darker Wood Planks",
    "color": "#804000",
    "group": "~ Legacy|Roads&Pavements",
    "legacy": true,
    "soilProfile": [
      "0000WD",
      "0000WD",
      "0000WD",
      "0000WD",
      "0000WD",
      "0000WD",
      "0000WD",
      "0000SD",
      "0000LS",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL",
      "0000SL"
    ],
    "albedo": 0.25
  },
  "0200DW": {
    "description": "Darker Wood Planks",
    "color": "#804000",
    "group": "Roads&Pavements",
    "legacy": false,
    "soilProfile": [
      "0200WD",
      "0200WD",
      "0200WD",
      "0200WD",
      "0200WD",
      "0200WD",
      "0200WD",
      "0200SD",
      "0200LS",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL",
      "0200SL"
    ],
    "albedo": 0.25
  }
};

export const GREENING_DB = {
  "01NAFG": {
    "name": "LEGACY: only green",
    "color": "#008000",
    "group": "~ Legacy|Default Greenings without air gap",
    "legacy": true,
    "soilId": [
      "0000SL",
      "0000SL",
      "0000SL"
    ],
    "simplePlantId": "0100IV",
    "hasSubstrate": false
  },
  "02NAFG": {
    "name": "only green",
    "color": "#008000",
    "group": "Default Greenings without air gap",
    "legacy": false,
    "soilId": [
      "0000SL",
      "0000SL",
      "0000SL"
    ],
    "simplePlantId": "0100IV",
    "hasSubstrate": false
  },
  "01NASS": {
    "name": "LEGACY: green + sandy loam substrate",
    "color": "#648e0d",
    "group": "~ Legacy|Default Greenings without air gap",
    "legacy": true,
    "soilId": [
      "0000SL",
      "0000SL",
      "0000SL"
    ],
    "simplePlantId": "0100FU",
    "hasSubstrate": true
  },
  "01NADS": {
    "name": "LEGACY: green + mixed substrate",
    "color": "#028000",
    "group": "~ Legacy|Default Greenings without air gap",
    "legacy": true,
    "soilId": [
      "0000SL",
      "0000SL",
      "0000SY"
    ],
    "simplePlantId": "0100FU",
    "hasSubstrate": true
  },
  "01AGSS": {
    "name": "LEGACY: green + sandy loam substrate",
    "color": "#61941b",
    "group": "~ Legacy|Default Greenings with air gap",
    "legacy": true,
    "soilId": [
      "0000SL",
      "0000SL",
      "0000SL"
    ],
    "simplePlantId": "0100FU",
    "hasSubstrate": true
  },
  "02AGSS": {
    "name": "green + sandy loam substrate",
    "color": "#61941b",
    "group": "Default Greenings with air gap",
    "legacy": false,
    "soilId": [
      "0200SL",
      "0200SL",
      "0200SY"
    ],
    "simplePlantId": "0100FU",
    "hasSubstrate": true
  },
  "01AGDS": {
    "name": "LEGACY: green + mixed substrate",
    "color": "#5c9e74",
    "group": "~ Legacy|Default Greenings with air gap",
    "legacy": true,
    "soilId": [
      "0000SL",
      "0000SL",
      "0000SY"
    ],
    "simplePlantId": "0100FU",
    "hasSubstrate": true
  },
  "02AGDS": {
    "name": "green + sandy substrate",
    "color": "#5c9e74",
    "group": "Default Greenings with air gap",
    "legacy": false,
    "soilId": [
      "0200SD",
      "0200SD",
      "0200SY"
    ],
    "simplePlantId": "0100FU",
    "hasSubstrate": true
  }
};

export const PLANT_DB = {
  "0000XX": {
    "description": "LEGACY: Grass 50 cm aver. dense",
    "color": "#00dd00",
    "group": "~ Legacy|Grass",
    "legacy": true,
    "height": 0.5,
    "planttype": 0
  },
  "000000": {
    "description": "LEGACY: Grass 50 cm aver. dense",
    "color": "#00dd00",
    "group": "~ Legacy|Grass",
    "legacy": true,
    "height": 0.5,
    "planttype": 0
  },
  "0000SO": {
    "description": "LEGACY: soja 90. soja 63cm",
    "color": "#00dd00",
    "group": "~ Legacy|Agriculture",
    "legacy": true,
    "height": 0.63,
    "planttype": 0
  },
  "0000LG": {
    "description": "LEGACY: luzerne 18cm",
    "color": "#00dd00",
    "group": "~ Legacy|Agriculture",
    "legacy": true,
    "height": 0.18,
    "planttype": 0
  },
  "0000SM": {
    "description": "LEGACY: Tree 20 m very dense, distinct crown layer",
    "color": "#00dd00",
    "group": "~ Legacy|Hedges and others",
    "legacy": true,
    "height": 20.0,
    "planttype": 0
  },
  "0000SK": {
    "description": "LEGACY: Tree 15 m very dense, distinct crown layer",
    "color": "#00dd00",
    "group": "~ Legacy|Hedges and others",
    "legacy": true,
    "height": 15.0,
    "planttype": 0
  },
  "0000S1": {
    "description": "LEGACY: Tree 15 m medium dense, distinct crown layer",
    "color": "#00dd00",
    "group": "~ Legacy|Hedges and others",
    "legacy": true,
    "height": 15.0,
    "planttype": 0
  },
  "0000H2": {
    "description": "LEGACY: Hedge dense, 2m",
    "color": "#00dd00",
    "group": "~ Legacy|Hedges and others",
    "legacy": true,
    "height": 6.0,
    "planttype": 0
  },
  "0000T1": {
    "description": "LEGACY: Tree 10 m very dense, leafless base",
    "color": "#00dd00",
    "group": "~ Legacy|Hedges and others",
    "legacy": true,
    "height": 10.0,
    "planttype": 0
  },
  "0000T0": {
    "description": "LEGACY: Tree 10 m medium dense, leafless base",
    "color": "#00dd00",
    "group": "~ Legacy|Hedges and others",
    "legacy": true,
    "height": 10.0,
    "planttype": 0
  },
  "0000GG": {
    "description": "LEGACY: Grass 50 cm aver. dense",
    "color": "#00dd00",
    "group": "~ Legacy|Grass",
    "legacy": true,
    "height": 0.5,
    "planttype": 0
  },
  "0000BS": {
    "description": "LEGACY: Tree 20 m medium dense.,distinct crown layer",
    "color": "#00dd00",
    "group": "~ Legacy|Hedges and others",
    "legacy": true,
    "height": 20.0,
    "planttype": 0
  },
  "0000SC": {
    "description": "LEGACY: Tree 20 m very dense, free stem crown layer",
    "color": "#00dd00",
    "group": "~ Legacy|Hedges and others",
    "legacy": true,
    "height": 20.0,
    "planttype": 0
  },
  "010000": {
    "description": "LEGACY: Funkia (Hosta)",
    "color": "#393000",
    "group": "~ Legacy|Facade Greening plants",
    "legacy": true,
    "height": 0.4,
    "planttype": 0
  },
  "0100XY": {
    "description": "LEGACY: Grass 50 cm aver. dense",
    "color": "#00dd00",
    "group": "~ Legacy|Grass",
    "legacy": true,
    "height": 0.5,
    "planttype": 0
  },
  "0200XY": {
    "description": "Grass 50 cm aver. dense",
    "color": "#00dd00",
    "group": "Grass",
    "legacy": false,
    "height": 0.5,
    "planttype": 0
  },
  "0100XX": {
    "description": "LEGACY: Grass 25 cm aver. dense",
    "color": "#00dd00",
    "group": "~ Legacy|Grass",
    "legacy": true,
    "height": 0.25,
    "planttype": 0
  },
  "0200XX": {
    "description": "Grass 25 cm aver. dense",
    "color": "#00dd00",
    "group": "Grass",
    "legacy": false,
    "height": 0.25,
    "planttype": 0
  },
  "0100SO": {
    "description": "LEGACY: Soja 63cm",
    "color": "#00dd00",
    "group": "~ Legacy|Agriculture",
    "legacy": true,
    "height": 0.63,
    "planttype": 0
  },
  "0200SO": {
    "description": "Soja 63cm",
    "color": "#00dd00",
    "group": "Agriculture",
    "legacy": false,
    "height": 0.63,
    "planttype": 0
  },
  "0100LG": {
    "description": "LEGACY: Luzerne 18cm",
    "color": "#00dd00",
    "group": "~ Legacy|Agriculture",
    "legacy": true,
    "height": 0.18,
    "planttype": 0
  },
  "0200LG": {
    "description": "Luzerne 18cm",
    "color": "#00dd00",
    "group": "Agriculture",
    "legacy": false,
    "height": 0.18,
    "planttype": 0
  },
  "0100H2": {
    "description": "LEGACY: Hedge dense, 2m",
    "color": "#00dd00",
    "group": "~ Legacy|Hedges and others",
    "legacy": true,
    "height": 2.0,
    "planttype": 0
  },
  "0200H2": {
    "description": "Hedge dense, 2m",
    "color": "#00dd00",
    "group": "Hedges and others",
    "legacy": false,
    "height": 2.0,
    "planttype": 0
  },
  "0201H2": {
    "description": "Hedge light, 2m",
    "color": "#00dd00",
    "group": "Hedges and others",
    "legacy": false,
    "height": 2.0,
    "planttype": 0
  },
  "0200H1": {
    "description": "Hedge dense, 1m",
    "color": "#00dd00",
    "group": "Hedges and others",
    "legacy": false,
    "height": 1.0,
    "planttype": 0
  },
  "0201H1": {
    "description": "Hedge light, 1m",
    "color": "#00dd00",
    "group": "Hedges and others",
    "legacy": false,
    "height": 1.0,
    "planttype": 0
  },
  "0100H4": {
    "description": "LEGACY: Hedge dense, 4m",
    "color": "#00dd00",
    "group": "~ Legacy|Hedges and others",
    "legacy": true,
    "height": 4.0,
    "planttype": 0
  },
  "0200H4": {
    "description": "Hedge dense, 4m",
    "color": "#00dd00",
    "group": "Hedges and others",
    "legacy": false,
    "height": 4.0,
    "planttype": 0
  },
  "0201H4": {
    "description": "Hedge light, 4m",
    "color": "#00dd00",
    "group": "Hedges and others",
    "legacy": false,
    "height": 4.0,
    "planttype": 0
  },
  "0100IV": {
    "description": "LEGACY: Ivy (Hedera helix)",
    "color": "#00dd00",
    "group": "~ Legacy|Facade Greening plants",
    "legacy": true,
    "height": 0.25,
    "planttype": 0
  },
  "0200IV": {
    "description": "Ivy (Hedera helix)",
    "color": "#00dd00",
    "group": "Facade Greening plants",
    "legacy": false,
    "height": 0.25,
    "planttype": 0
  },
  "0100FE": {
    "description": "LEGACY: Fern (Nephrolepis)",
    "color": "#00dd00",
    "group": "~ Legacy|Facade Greening plants",
    "legacy": true,
    "height": 0.5,
    "planttype": 0
  },
  "0200FE": {
    "description": "Fern (Nephrolepis)",
    "color": "#00dd00",
    "group": "Facade Greening plants",
    "legacy": false,
    "height": 0.5,
    "planttype": 0
  },
  "0100FU": {
    "description": "LEGACY: Funkia (Hosta)",
    "color": "#393000",
    "group": "~ Legacy|Facade Greening plants",
    "legacy": true,
    "height": 0.4,
    "planttype": 0
  },
  "0200FU": {
    "description": "Funkia (Hosta)",
    "color": "#393000",
    "group": "Facade Greening plants",
    "legacy": false,
    "height": 0.4,
    "planttype": 0
  }
};

export const PLANT3D_DB = {
  "ED00NN": {
    "description": "Tilia cordata Example",
    "color": "#ff8068",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": null,
    "legacy": false,
    "height": 10.22,
    "width": 6.2183
  },
  "01SSDM": {
    "description": "LEGACY: Spherical, small trunk, dense, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Medium|dense canopy",
    "legacy": true,
    "height": 15.0,
    "width": 11.0
  },
  "01SSDL": {
    "description": "LEGACY: Spherical, small trunk, dense, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Large|dense canopy",
    "legacy": true,
    "height": 25.0,
    "width": 19.0
  },
  "01SSDS": {
    "description": "LEGACY: Spherical, small trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Small|dense canopy",
    "legacy": true,
    "height": 5.0,
    "width": 3.0
  },
  "01SMDS": {
    "description": "LEGACY: Spherical, medium trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Small|dense canopy",
    "legacy": true,
    "height": 5.0,
    "width": 3.0
  },
  "01SLDS": {
    "description": "LEGACY: Spherical, large trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Small|dense canopy",
    "legacy": true,
    "height": 5.0,
    "width": 3.0
  },
  "01SMDM": {
    "description": "LEGACY: Spherical, medium trunk, dense, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Medium|dense canopy",
    "legacy": true,
    "height": 15.0,
    "width": 11.0
  },
  "01SMDL": {
    "description": "LEGACY: Spherical, medium trunk, dense, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Large|dense canopy",
    "legacy": true,
    "height": 25.0,
    "width": 19.0
  },
  "01SLDM": {
    "description": "LEGACY: Spherical, large trunk, dense, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Medium|dense canopy",
    "legacy": true,
    "height": 15.0,
    "width": 11.0
  },
  "01SLDL": {
    "description": "LEGACY: Spherical, large trunk, dense, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Large|dense canopy",
    "legacy": true,
    "height": 25.0,
    "width": 19.0
  },
  "01OSDL": {
    "description": "LEGACY: Cylindric, small trunk, dense, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Large|dense canopy",
    "legacy": true,
    "height": 25.0,
    "width": 11.0
  },
  "01OLDL": {
    "description": "LEGACY: Cylindric, large trunk, dense, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Large|dense canopy",
    "legacy": true,
    "height": 25.0,
    "width": 11.0
  },
  "01OSDS": {
    "description": "LEGACY: Cylindric, small trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Small|dense canopy",
    "legacy": true,
    "height": 5.0,
    "width": 3.0
  },
  "01OSDM": {
    "description": "LEGACY: Cylindric, small trunk, dense, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Medium|dense canopy",
    "legacy": true,
    "height": 15.0,
    "width": 9.0
  },
  "01OMDM": {
    "description": "LEGACY: Cylindric, medium trunk, dense, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Medium|dense canopy",
    "legacy": true,
    "height": 15.0,
    "width": 9.0
  },
  "01OMDS": {
    "description": "LEGACY: Cylindric, medium trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Small|dense canopy",
    "legacy": true,
    "height": 5.0,
    "width": 3.0
  },
  "01OMDL": {
    "description": "LEGACY: Cylindric, medium trunk, dense, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Large|dense canopy",
    "legacy": true,
    "height": 25.0,
    "width": 11.0
  },
  "01OLDM": {
    "description": "LEGACY: Cylindric, large trunk, dense, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Medium|dense canopy",
    "legacy": true,
    "height": 15.0,
    "width": 9.0
  },
  "01OLDS": {
    "description": "LEGACY: Cylindric, large trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Small|dense canopy",
    "legacy": true,
    "height": 5.0,
    "width": 3.0
  },
  "01HLDL": {
    "description": "LEGACY: Heart-shaped, large trunk, dense, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Large|dense canopy",
    "legacy": true,
    "height": 25.0,
    "width": 19.0
  },
  "01HLDM": {
    "description": "LEGACY: Heart-shaped, large trunk, dense, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Medium|dense canopy",
    "legacy": true,
    "height": 15.0,
    "width": 13.0
  },
  "01HLDS": {
    "description": "LEGACY: Heart-shaped, large trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Small|dense canopy",
    "legacy": true,
    "height": 5.0,
    "width": 3.0
  },
  "01HMDL": {
    "description": "LEGACY: Heart-shaped, medium trunk, dense, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Large|dense canopy",
    "legacy": true,
    "height": 25.0,
    "width": 19.0
  },
  "01HMDM": {
    "description": "LEGACY: Heart-shaped, medium trunk, dense, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Medium|dense canopy",
    "legacy": true,
    "height": 15.0,
    "width": 13.0
  },
  "01HMDS": {
    "description": "LEGACY: Heart-shaped, medium trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Small|dense canopy",
    "legacy": true,
    "height": 5.0,
    "width": 3.0
  },
  "01HSDL": {
    "description": "LEGACY: Heart-shaped, small trunk, dense, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Large|dense canopy",
    "legacy": true,
    "height": 25.0,
    "width": 19.0
  },
  "01HSDS": {
    "description": "LEGACY: Heart-shaped, small trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Small|dense canopy",
    "legacy": true,
    "height": 5.0,
    "width": 3.0
  },
  "01HSDM": {
    "description": "LEGACY: Heart-shaped, small trunk, dense, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Medium|dense canopy",
    "legacy": true,
    "height": 15.0,
    "width": 13.0
  },
  "01SSSM": {
    "description": "LEGACY: Spherical, small trunk, sparse, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Medium|sparse canopy",
    "legacy": true,
    "height": 15.0,
    "width": 11.0
  },
  "01SSSL": {
    "description": "LEGACY: Spherical, small trunk, sparse, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Large|sparse canopy",
    "legacy": true,
    "height": 25.0,
    "width": 19.0
  },
  "01SSSS": {
    "description": "LEGACY: Spherical, small trunk, sparse, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Small|sparse canopy",
    "legacy": true,
    "height": 5.0,
    "width": 3.0
  },
  "01SMSS": {
    "description": "LEGACY: Spherical, medium trunk, sparse, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Small|sparse canopy",
    "legacy": true,
    "height": 5.0,
    "width": 3.0
  },
  "01SLSS": {
    "description": "LEGACY: Spherical, large trunk, sparse, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Small|sparse canopy",
    "legacy": true,
    "height": 5.0,
    "width": 3.0
  },
  "01SMSM": {
    "description": "LEGACY: Spherical, medium trunk, sparse, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Medium|sparse canopy",
    "legacy": true,
    "height": 15.0,
    "width": 11.0
  },
  "01SMSL": {
    "description": "LEGACY: Spherical, medium trunk, sparse, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Large|sparse canopy",
    "legacy": true,
    "height": 25.0,
    "width": 19.0
  },
  "01SLSM": {
    "description": "LEGACY: Spherical, large trunk, sparse, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Medium|sparse canopy",
    "legacy": true,
    "height": 15.0,
    "width": 11.0
  },
  "01SLSL": {
    "description": "LEGACY: Spherical, large trunk, sparse, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Large|sparse canopy",
    "legacy": true,
    "height": 25.0,
    "width": 19.0
  },
  "01OSSL": {
    "description": "LEGACY: Cylindric, small trunk, sparse, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Large|sparse canopy",
    "legacy": true,
    "height": 25.0,
    "width": 11.0
  },
  "01OLSL": {
    "description": "LEGACY: Cylindric, large trunk, sparse, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Large|sparse canopy",
    "legacy": true,
    "height": 25.0,
    "width": 11.0
  },
  "01OSSS": {
    "description": "LEGACY: Cylindric, small trunk, sparse, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Small|sparse canopy",
    "legacy": true,
    "height": 5.0,
    "width": 3.0
  },
  "01OSSM": {
    "description": "LEGACY: Cylindric, small trunk, sparse, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Medium|sparse canopy",
    "legacy": true,
    "height": 15.0,
    "width": 9.0
  },
  "01OMSM": {
    "description": "LEGACY: Cylindric, medium trunk, sparse, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Medium|sparse canopy",
    "legacy": true,
    "height": 15.0,
    "width": 9.0
  },
  "01OMSS": {
    "description": "LEGACY: Cylindric, medium trunk, sparse, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Small|sparse canopy",
    "legacy": true,
    "height": 5.0,
    "width": 3.0
  },
  "01OMSL": {
    "description": "LEGACY: Cylindric, medium trunk, sparse, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Large|sparse canopy",
    "legacy": true,
    "height": 25.0,
    "width": 11.0
  },
  "01OLSM": {
    "description": "LEGACY: Cylindric, large trunk, sparse, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Medium|sparse canopy",
    "legacy": true,
    "height": 15.0,
    "width": 9.0
  },
  "01OLSS": {
    "description": "LEGACY: Cylindric, large trunk, sparse, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Small|sparse canopy",
    "legacy": true,
    "height": 5.0,
    "width": 3.0
  },
  "01HLSL": {
    "description": "LEGACY: Heart-shaped, large trunk, sparse, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Large|sparse canopy",
    "legacy": true,
    "height": 25.0,
    "width": 19.0
  },
  "01HLSM": {
    "description": "LEGACY: Heart-shaped, large trunk, sparse, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Medium|sparse canopy",
    "legacy": true,
    "height": 15.0,
    "width": 13.0
  },
  "01HLSS": {
    "description": "LEGACY: Heart-shaped, large trunk, sparse, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Small|sparse canopy",
    "legacy": true,
    "height": 5.0,
    "width": 3.0
  },
  "01HMSL": {
    "description": "LEGACY: Heart-shaped, medium trunk, sparse, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Large|sparse canopy",
    "legacy": true,
    "height": 25.0,
    "width": 19.0
  },
  "01HMSM": {
    "description": "LEGACY: Heart-shaped, medium trunk, sparse, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Medium|sparse canopy",
    "legacy": true,
    "height": 15.0,
    "width": 13.0
  },
  "01HMSS": {
    "description": "LEGACY: Heart-shaped, medium trunk, sparse, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Small|sparse canopy",
    "legacy": true,
    "height": 5.0,
    "width": 3.0
  },
  "01HSSL": {
    "description": "LEGACY: Heart-shaped, small trunk, sparse, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Large|sparse canopy",
    "legacy": true,
    "height": 25.0,
    "width": 19.0
  },
  "01HSSS": {
    "description": "LEGACY: Heart-shaped, small trunk, sparse, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Small|sparse canopy",
    "legacy": true,
    "height": 5.0,
    "width": 3.0
  },
  "01HSSM": {
    "description": "LEGACY: Heart-shaped, small trunk, sparse, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Deciduous Trees|Medium|sparse canopy",
    "legacy": true,
    "height": 15.0,
    "width": 13.0
  },
  "01ALDL": {
    "description": "LEGACY: Conic, large trunk, dense, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Large|dense canopy",
    "legacy": true,
    "height": 25.0,
    "width": 11.0
  },
  "01CSDS": {
    "description": "LEGACY: Cylindric, small trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Small|dense canopy",
    "legacy": true,
    "height": 5.0,
    "width": 3.0
  },
  "01AMDM": {
    "description": "LEGACY: Conic, medium trunk, dense, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Medium|dense canopy",
    "legacy": true,
    "height": 15.0,
    "width": 7.0
  },
  "01AMDS": {
    "description": "LEGACY: Conic, medium trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Small|dense canopy",
    "legacy": true,
    "height": 5.0,
    "width": 3.0
  },
  "01ALDS": {
    "description": "LEGACY: Conic, large trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Small|dense canopy",
    "legacy": true,
    "height": 5.0,
    "width": 3.0
  },
  "01AMDL": {
    "description": "LEGACY: Conic, medium trunk, dense, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Large|dense canopy",
    "legacy": true,
    "height": 25.0,
    "width": 11.0
  },
  "01ALDM": {
    "description": "LEGACY: Conic, large trunk, dense, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Medium|dense canopy",
    "legacy": true,
    "height": 15.0,
    "width": 7.0
  },
  "01ASDL": {
    "description": "LEGACY: Conic, small trunk, dense, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Large|dense canopy",
    "legacy": true,
    "height": 25.0,
    "width": 11.0
  },
  "01ASDM": {
    "description": "LEGACY: Conic, small trunk, dense, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Medium|dense canopy",
    "legacy": true,
    "height": 15.0,
    "width": 7.0
  },
  "01ASDS": {
    "description": "LEGACY: Conic, small trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Small|dense canopy",
    "legacy": true,
    "height": 5.0,
    "width": 3.0
  },
  "01CLDL": {
    "description": "LEGACY: Cylindric, large trunk, dense, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Large|dense canopy",
    "legacy": true,
    "height": 25.0,
    "width": 15.0
  },
  "01CSDL": {
    "description": "LEGACY: Cylindric, small trunk, dense, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Large|dense canopy",
    "legacy": true,
    "height": 25.0,
    "width": 15.0
  },
  "01CMDL": {
    "description": "LEGACY: Cylindric, medium trunk, dense, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Large|dense canopy",
    "legacy": true,
    "height": 25.0,
    "width": 15.0
  },
  "01CMDM": {
    "description": "LEGACY: Cylindric, medium trunk, dense, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Medium|dense canopy",
    "legacy": true,
    "height": 15.0,
    "width": 9.0
  },
  "01CMDS": {
    "description": "LEGACY: Cylindric, medium trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Small|dense canopy",
    "legacy": true,
    "height": 5.0,
    "width": 3.0
  },
  "01CLDS": {
    "description": "LEGACY: Cylindric, large trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Small|dense canopy",
    "legacy": true,
    "height": 5.0,
    "width": 3.0
  },
  "01CSDM": {
    "description": "LEGACY: Cylindric, small trunk, dense, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Medium|dense canopy",
    "legacy": true,
    "height": 15.0,
    "width": 9.0
  },
  "01CLDM": {
    "description": "LEGACY: Cylindric, large trunk, dense, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Medium|dense canopy",
    "legacy": true,
    "height": 15.0,
    "width": 9.0
  },
  "01ALSL": {
    "description": "LEGACY: Conic, large trunk, sparse, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Large|sparse canopy",
    "legacy": true,
    "height": 25.0,
    "width": 11.0
  },
  "01CSSS": {
    "description": "LEGACY: Cylindric, small trunk, sparse, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Small|sparse canopy",
    "legacy": true,
    "height": 5.0,
    "width": 3.0
  },
  "01AMSM": {
    "description": "LEGACY: Conic, medium trunk, sparse, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Medium|sparse canopy",
    "legacy": true,
    "height": 15.0,
    "width": 7.0
  },
  "01AMSS": {
    "description": "LEGACY: Conic, medium trunk, sparse, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Small|sparse canopy",
    "legacy": true,
    "height": 5.0,
    "width": 3.0
  },
  "01ALSS": {
    "description": "LEGACY: Conic, large trunk, sparse, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Small|sparse canopy",
    "legacy": true,
    "height": 5.0,
    "width": 3.0
  },
  "01AMSL": {
    "description": "LEGACY: Conic, medium trunk, sparse, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Large|sparse canopy",
    "legacy": true,
    "height": 25.0,
    "width": 11.0
  },
  "01ALSM": {
    "description": "LEGACY: Conic, large trunk, sparse, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Medium|sparse canopy",
    "legacy": true,
    "height": 15.0,
    "width": 7.0
  },
  "01ASSL": {
    "description": "LEGACY: Conic, small trunk, sparse, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Large|sparse canopy",
    "legacy": true,
    "height": 25.0,
    "width": 11.0
  },
  "01ASSM": {
    "description": "LEGACY: Conic, small trunk, sparse, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Medium|sparse canopy",
    "legacy": true,
    "height": 15.0,
    "width": 7.0
  },
  "01ASSS": {
    "description": "LEGACY: Conic, small trunk, sparse, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Small|sparse canopy",
    "legacy": true,
    "height": 5.0,
    "width": 3.0
  },
  "01CLSL": {
    "description": "LEGACY: Cylindric, large trunk, sparse, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Large|sparse canopy",
    "legacy": true,
    "height": 25.0,
    "width": 15.0
  },
  "01CSSL": {
    "description": "LEGACY: Cylindric, small trunk, sparse, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Large|sparse canopy",
    "legacy": true,
    "height": 25.0,
    "width": 15.0
  },
  "01CMSL": {
    "description": "LEGACY: Cylindric, medium trunk, sparse, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Large|sparse canopy",
    "legacy": true,
    "height": 25.0,
    "width": 15.0
  },
  "01CMSM": {
    "description": "LEGACY: Cylindric, medium trunk, sparse, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Medium|sparse canopy",
    "legacy": true,
    "height": 15.0,
    "width": 9.0
  },
  "01CMSS": {
    "description": "LEGACY: Cylindric, medium trunk, sparse, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Small|sparse canopy",
    "legacy": true,
    "height": 5.0,
    "width": 3.0
  },
  "01CLSS": {
    "description": "LEGACY: Cylindric, large trunk, sparse, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Small|sparse canopy",
    "legacy": true,
    "height": 5.0,
    "width": 3.0
  },
  "01CSSM": {
    "description": "LEGACY: Cylindric, small trunk, sparse, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Medium|sparse canopy",
    "legacy": true,
    "height": 15.0,
    "width": 9.0
  },
  "01CLSM": {
    "description": "LEGACY: Cylindric, large trunk, sparse, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Abstract|Conifers|Medium|sparse canopy",
    "legacy": true,
    "height": 15.0,
    "width": 9.0
  },
  "01PLDL": {
    "description": "Palm, large trunk, dense, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Palm Trees|Large",
    "legacy": false,
    "height": 25.0,
    "width": 13.0
  },
  "01PLDM": {
    "description": "Palm, large trunk, dense, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Palm Trees|Medium",
    "legacy": false,
    "height": 15.0,
    "width": 9.0
  },
  "01PSDS": {
    "description": "Palm, small trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Palm Trees|Small",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "01PMDS": {
    "description": "Palm, medium trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Palm Trees|Small",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "01PLDS": {
    "description": "Palm, large trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Palm Trees|Small",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "0000B5": {
    "description": "LEGACY: Fraxinus Excelsior",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Deciduous Trees",
    "legacy": true,
    "height": 20.0,
    "width": 11.0
  },
  "0000B2": {
    "description": "LEGACY: Fagus Sylvatica",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Deciduous Trees",
    "legacy": true,
    "height": 20.0,
    "width": 13.0
  },
  "0000B3": {
    "description": "LEGACY: Quercus Robur",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Deciduous Trees",
    "legacy": true,
    "height": 25.0,
    "width": 15.0
  },
  "0000E1": {
    "description": "LEGACY: Ulmus Minor",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Deciduous Trees",
    "legacy": true,
    "height": 20.0,
    "width": 19.0
  },
  "0000A9": {
    "description": "LEGACY: Acer Campestre",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Deciduous Trees",
    "legacy": true,
    "height": 12.0,
    "width": 9.0
  },
  "0000B6": {
    "description": "LEGACY: Ulmus × Hollandica",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Deciduous Trees",
    "legacy": true,
    "height": 10.0,
    "width": 5.0
  },
  "0000A5": {
    "description": "LEGACY: Gleditsia Triacanthos",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Deciduous Trees",
    "legacy": true,
    "height": 15.0,
    "width": 11.0
  },
  "0000B4": {
    "description": "LEGACY: Carpinus Betulus",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Deciduous Trees",
    "legacy": true,
    "height": 20.0,
    "width": 15.0
  },
  "000003": {
    "description": "LEGACY: Robinia Pseudoacacia",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Deciduous Trees",
    "legacy": true,
    "height": 12.0,
    "width": 7.0
  },
  "0000C1": {
    "description": "LEGACY: Larix Decidua",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Conifers",
    "legacy": true,
    "height": 20.0,
    "width": 9.0
  },
  "0000A2": {
    "description": "LEGACY: Tilia Platyphyllos",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Deciduous Trees",
    "legacy": true,
    "height": 18.0,
    "width": 11.0
  },
  "0000C4": {
    "description": "LEGACY: Picea Abies",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Conifers",
    "legacy": true,
    "height": 18.0,
    "width": 11.0
  },
  "0000C2": {
    "description": "LEGACY: Pine",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Conifers",
    "legacy": true,
    "height": 15.0,
    "width": 7.0
  },
  "0000B7": {
    "description": "LEGACY: Betula Pendula",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Deciduous Trees",
    "legacy": true,
    "height": 6.0,
    "width": 7.0
  },
  "0000C3": {
    "description": "LEGACY: Abies Alba",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Conifers",
    "legacy": true,
    "height": 20.0,
    "width": 9.0
  },
  "0000A1": {
    "description": "LEGACY: Tilia Cordata",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Deciduous Trees",
    "legacy": true,
    "height": 20.0,
    "width": 13.0
  },
  "000007": {
    "description": "LEGACY: Acer Platanoides",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Deciduous Trees",
    "legacy": true,
    "height": 15.0,
    "width": 7.0
  },
  "0000A8": {
    "description": "LEGACY: Acer Pseudoplatanus",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Deciduous Trees",
    "legacy": true,
    "height": 15.0,
    "width": 11.0
  },
  "0000AC": {
    "description": "LEGACY: Senegalia Greggii",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Deciduous Trees",
    "legacy": true,
    "height": 2.0,
    "width": 3.0
  },
  "0000TA": {
    "description": "LEGACY: Tamarix Gallica",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Conifers",
    "legacy": true,
    "height": 2.0,
    "width": 3.0
  },
  "0000JU": {
    "description": "LEGACY: Cercis Siliquastrum",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Deciduous Trees",
    "legacy": true,
    "height": 10.0,
    "width": 11.0
  },
  "0000PW": {
    "description": "LEGACY: Palm Washingtonia",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Deciduous Trees",
    "legacy": true,
    "height": 20.0,
    "width": 3.0
  },
  "0000CC": {
    "description": "LEGACY: Fraxinus",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Deciduous Trees",
    "legacy": true,
    "height": 18.0,
    "width": 11.0
  },
  "0000PR": {
    "description": "LEGACY: Tilia",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Deciduous Trees",
    "legacy": true,
    "height": 18.0,
    "width": 13.0
  },
  "0000PP": {
    "description": "LEGACY: Pinus Pinea",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Conifers",
    "legacy": true,
    "height": 15.0,
    "width": 11.0
  },
  "0000AJ": {
    "description": "LEGACY: Albizia Julibrissin",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Deciduous Trees",
    "legacy": true,
    "height": 12.0,
    "width": 11.0
  },
  "0000AN": {
    "description": "LEGACY: Acer Negundo",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Deciduous Trees",
    "legacy": true,
    "height": 11.0,
    "width": 9.0
  },
  "0000S2": {
    "description": "LEGACY: Sophora Japonica",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Deciduous Trees",
    "legacy": true,
    "height": 10.0,
    "width": 15.0
  },
  "0000B8": {
    "description": "LEGACY: Platanus × Acerifolia",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Deciduous Trees",
    "legacy": true,
    "height": 20.0,
    "width": 15.0
  },
  "0000ZY": {
    "description": "LEGACY: Cypress",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Conifers",
    "legacy": true,
    "height": 7.0,
    "width": 3.0
  },
  "0000JM": {
    "description": "LEGACY: Jacaranda mimosifolia",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Deciduous Trees",
    "legacy": true,
    "height": 15.0,
    "width": 9.0
  },
  "0000OT": {
    "description": "LEGACY: Olea Europaea",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Deciduous Trees",
    "legacy": true,
    "height": 4.0,
    "width": 5.0
  },
  "0000LI": {
    "description": "LEGACY: Privet",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Deciduous Trees",
    "legacy": true,
    "height": 5.0,
    "width": 5.0
  },
  "0000ZI": {
    "description": "LEGACY: Citrus x Aurantium",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Deciduous Trees",
    "legacy": true,
    "height": 4.0,
    "width": 3.0
  },
  "0000K1": {
    "description": "LEGACY: Koelreuteria paniculata",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Deciduous Trees",
    "legacy": true,
    "height": 10.0,
    "width": 13.0
  },
  "0000PN": {
    "description": "LEGACY: Populus Nigra",
    "color": "#006c00",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "~ Legacy|Deciduous Trees",
    "legacy": true,
    "height": 20.0,
    "width": 15.0
  },
  "0000PA": {
    "description": "Palm",
    "color": "#339966",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Specific|Palm",
    "legacy": false,
    "height": 3.02,
    "width": 0.04
  },
  "0000NM": {
    "description": "DemoTree 10 Iterations",
    "color": "#ff8068",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Specific|DemoTree",
    "legacy": false,
    "height": 7.8616,
    "width": 7.9788
  },
  "0000NO": {
    "description": "DemoTree 5 Iterations",
    "color": "#ff8068",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Specific|DemoTree",
    "legacy": false,
    "height": 0.0,
    "width": 0.0
  },
  "000DNN": {
    "description": "DemoTree altern Angle",
    "color": "#ff8068",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Specific|DemoTree",
    "legacy": false,
    "height": 0.0,
    "width": 0.0
  },
  "0000DD": {
    "description": "Pine like Tree",
    "color": "#ef8068",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Specific|Pine like Tree",
    "legacy": false,
    "height": 5.02,
    "width": 3.67607
  },
  "010020": {
    "description": "Field Maple (young)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#99ff33",
    "group": "Specific|Field Maple",
    "legacy": false,
    "height": 10.81628,
    "width": 5.43172
  },
  "030060": {
    "description": "London Plane Tree (old)",
    "color": "#00cc00",
    "colorStem": "#855e42",
    "colorBlossom": "#cc0000",
    "group": "Specific|Plane Tree",
    "legacy": false,
    "height": 23.57682,
    "width": 13.12928
  },
  "030052": {
    "description": "Horse Chestnut (old)",
    "color": "#336600",
    "colorStem": "#855e42",
    "colorBlossom": "#ffffcc",
    "group": "Specific|Horse Chestnut",
    "legacy": false,
    "height": 20.59226,
    "width": 12.14525
  },
  "030090": {
    "description": "Common Robinia (old)",
    "color": "#008000",
    "colorStem": "#855e42",
    "colorBlossom": "#ffffff",
    "group": "Specific|Robinia / False Acacia",
    "legacy": false,
    "height": 23.52998,
    "width": 15.94223
  },
  "042010": {
    "description": "Little Leaf Lime (very old) II",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#ffffcc",
    "group": "Specific|Little Leaf Lime",
    "legacy": false,
    "height": 21.85061,
    "width": 14.26367
  },
  "02001A": {
    "description": "Little Leaf Lime Rancho (middle)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#ffffcc",
    "group": "Specific|Little Leaf Lime Rancho",
    "legacy": false,
    "height": 8.62517,
    "width": 5.77976
  },
  "01002A": {
    "description": "Field Maple Elsrijk (young)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#99ff33",
    "group": "Specific|Field Maple Elsrijk",
    "legacy": false,
    "height": 7.02,
    "width": 3.32888
  },
  "020051": {
    "description": "Red-flowered Horse Chestnut (middle)",
    "color": "#336600",
    "colorStem": "#855e42",
    "colorBlossom": "#ff7c80",
    "group": "Specific|Red~flowered Horse Chestnut",
    "legacy": false,
    "height": 15.53598,
    "width": 13.83756
  },
  "000NNN": {
    "description": "Tilia Alternative",
    "color": "#020200",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Specific|Tilia Alternative",
    "legacy": false,
    "height": 8.83871,
    "width": 6.33886
  },
  "02002B": {
    "description": "Field Maple Elegant (middle)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#99ff33",
    "group": "Specific|Field Maple Elegant",
    "legacy": false,
    "height": 9.2737,
    "width": 4.34856
  },
  "030030": {
    "description": "Norway Maple (old)",
    "color": "#00cc00",
    "colorStem": "#855e42",
    "colorBlossom": "#ccff99",
    "group": "Specific|Norway Maple",
    "legacy": false,
    "height": 21.16934,
    "width": 16.30207
  },
  "02003A": {
    "description": "Norway Maple Cleveland (middle)",
    "color": "#00cc00",
    "colorStem": "#855e42",
    "colorBlossom": "#ccff99",
    "group": "Specific|Norway Maple Cleveland",
    "legacy": false,
    "height": 15.60429,
    "width": 8.03748
  },
  "021041": {
    "description": "Hungarian Oak (middle)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#99cc00",
    "group": "Specific|Hungarian Oak",
    "legacy": false,
    "height": 21.37718,
    "width": 16.0278
  },
  "020121": {
    "description": "Dutch Elm (middle)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#ccff99",
    "group": "Specific|Elm",
    "legacy": false,
    "height": 12.61999,
    "width": 5.06542
  },
  "020130": {
    "description": "Swedisch Whitebeam (middle)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#ffffcc",
    "group": "Specific|Whitebeam",
    "legacy": false,
    "height": 16.5509,
    "width": 7.03554
  },
  "000140": {
    "description": "Wild Cherry Plena (GALK)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#ffffff",
    "group": "Specific|Wild Cherry",
    "legacy": false,
    "height": 25.32677,
    "width": 13.24169
  },
  "030150": {
    "description": "Ginkgo / Fan Leave Tree (old)",
    "color": "#66ff33",
    "colorStem": "#855e42",
    "colorBlossom": "#ccff66",
    "group": "Specific|Ginkgo / Fan Leave Tree",
    "legacy": false,
    "height": 24.85244,
    "width": 10.60583
  },
  "020160": {
    "description": "American Sweet Gum (middle)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Specific|American Sweet Gum",
    "legacy": false,
    "height": 20.44784,
    "width": 9.44189
  },
  "030170": {
    "description": "American Gleditschie / Leather Sleeve Tree (old)",
    "color": "#008000",
    "colorStem": "#855e42",
    "colorBlossom": "#996600",
    "group": "Specific|Gleditschie / Leather Sleeve Tree",
    "legacy": false,
    "height": 23.30374,
    "width": 15.18331
  },
  "020180": {
    "description": "Flower-/ Manna-Ash (middle)",
    "color": "#336600",
    "colorStem": "#855e42",
    "colorBlossom": "#ffffcc",
    "group": "Specific|Flower~/ Manna~Ash",
    "legacy": false,
    "height": 14.85117,
    "width": 9.95307
  },
  "020190": {
    "description": "Tree Hazel (middle)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#996600",
    "group": "Specific|Tree Hazel",
    "legacy": false,
    "height": 17.57147,
    "width": 11.75948
  },
  "021200": {
    "description": "Quaking Aspen (middle)",
    "color": "#008000",
    "colorStem": "#855e42",
    "colorBlossom": "#663300",
    "group": "Specific|Quaking Aspen",
    "legacy": false,
    "height": 19.80305,
    "width": 11.67775
  },
  "020210": {
    "description": "Silver Lime (middle)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#ffffcc",
    "group": "Specific|Silver Lime",
    "legacy": false,
    "height": 25.86159,
    "width": 15.34183
  },
  "020020": {
    "description": "Field Maple (middle)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#99ff33",
    "group": "Specific|Field Maple",
    "legacy": false,
    "height": 15.49911,
    "width": 9.96405
  },
  "02002A": {
    "description": "Field Maple Elsrijk (middle)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#99ff33",
    "group": "Specific|Field Maple Elsrijk",
    "legacy": false,
    "height": 10.02,
    "width": 7.35815
  },
  "030070": {
    "description": "Hornbeam (old)",
    "color": "#339933",
    "colorStem": "#855e42",
    "colorBlossom": "#cccc00",
    "group": "Specific|Hornbeam",
    "legacy": false,
    "height": 18.21071,
    "width": 12.9905
  },
  "020100": {
    "description": "Apple Tree (middle)",
    "color": "#339933",
    "colorStem": "#855e42",
    "colorBlossom": "#ffffff",
    "group": "Specific|Apple Tree",
    "legacy": false,
    "height": 8.13775,
    "width": 7.1273
  },
  "020050": {
    "description": "Horse Chestnut (middle)",
    "color": "#336600",
    "colorStem": "#855e42",
    "colorBlossom": "#ffffcc",
    "group": "Specific|Horse Chestnut",
    "legacy": false,
    "height": 17.39831,
    "width": 12.08104
  },
  "010051": {
    "description": "Red-flowered Horse Chestnut (young)",
    "color": "#336600",
    "colorStem": "#855e42",
    "colorBlossom": "#ff7c80",
    "group": "Specific|Red~flowered Horse Chestnut",
    "legacy": false,
    "height": 9.72493,
    "width": 6.38678
  },
  "030120": {
    "description": "Dutch Elm (old)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#ccff99",
    "group": "Specific|Elm",
    "legacy": false,
    "height": 21.42001,
    "width": 6.07758
  },
  "040030": {
    "description": "Norway Maple (very old)",
    "color": "#00cc00",
    "colorStem": "#855e42",
    "colorBlossom": "#ccff99",
    "group": "Specific|Norway Maple",
    "legacy": false,
    "height": 35.98119,
    "width": 23.06303
  },
  "02003C": {
    "description": "Norway Maple Olmsted (middle)",
    "color": "#00cc00",
    "colorStem": "#855e42",
    "colorBlossom": "#ccff99",
    "group": "Specific|Norway Maple Olmsted",
    "legacy": false,
    "height": 11.88462,
    "width": 3.78894
  },
  "02003B": {
    "description": "Norway Maple Globosum (middle)",
    "color": "#00cc00",
    "colorStem": "#855e42",
    "colorBlossom": "#ccff99",
    "group": "Specific|Norway Maple Globosum",
    "legacy": false,
    "height": 6.39297,
    "width": 5.28486
  },
  "030034": {
    "description": "Red Oak (old)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#ffcc99",
    "group": "Specific|Red Oak",
    "legacy": false,
    "height": 22.42097,
    "width": 16.4686
  },
  "030010": {
    "description": "Little Leaf Lime (old)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#ffffcc",
    "group": "Specific|Little Leaf Lime",
    "legacy": false,
    "height": 22.51077,
    "width": 14.26367
  },
  "020041": {
    "description": "Hungarian Oak (middle) II",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#99cc00",
    "group": "Specific|Hungarian Oak",
    "legacy": false,
    "height": 16.9084,
    "width": 11.98851
  },
  "030111": {
    "description": "Hanging Birch (old)",
    "color": "#009900",
    "colorStem": "#855e42",
    "colorBlossom": "#808000",
    "group": "Specific|Birch",
    "legacy": false,
    "height": 18.77631,
    "width": 14.95191
  },
  "040112": {
    "description": "Hanging Birch 2 (very old)",
    "color": "#009900",
    "colorStem": "#855e42",
    "colorBlossom": "#808000",
    "group": "Specific|Birch",
    "legacy": false,
    "height": 29.26974,
    "width": 18.63797
  },
  "02001B": {
    "description": "Little Leaf Lime Greenspire (middle)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#ffffcc",
    "group": "Specific|Little Leaf Lime Greenspire",
    "legacy": false,
    "height": 19.22,
    "width": 12.34949
  },
  "020031": {
    "description": "Bluebell Tree (middle)",
    "color": "#339933",
    "colorStem": "#855e42",
    "colorBlossom": "#cc99ff",
    "group": "Specific|Bluebell Tree",
    "legacy": false,
    "height": 18.41592,
    "width": 10.66191
  },
  "030032": {
    "description": "Sweet Chestnut/Maron (old)",
    "color": "#339933",
    "colorStem": "#855e42",
    "colorBlossom": "#ffffcc",
    "group": "Specific|Sweet Chestnut / Maron",
    "legacy": false,
    "height": 25.47425,
    "width": 18.3674
  },
  "020033": {
    "description": "Sycamore Maple (middle)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#00ff00",
    "group": "Specific|Sycamore Maple",
    "legacy": false,
    "height": 18.92437,
    "width": 14.47506
  },
  "030040": {
    "description": "Pendunculate Oak (old)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#ccff66",
    "group": "Specific|Pendunculate Oak",
    "legacy": false,
    "height": 21.86669,
    "width": 13.6176
  },
  "030035": {
    "description": "Silver Maple (old)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#cccc00",
    "group": "Specific|Silver Maple",
    "legacy": false,
    "height": 24.27545,
    "width": 19.96914
  },
  "030037": {
    "description": "Tree of Heaven (old)",
    "color": "#009900",
    "colorStem": "#855e42",
    "colorBlossom": "#ffff99",
    "group": "Specific|Tree of Heaven",
    "legacy": false,
    "height": 22.95222,
    "width": 15.58652
  },
  "020039": {
    "description": "Spaeth's Alder (middle)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#663300",
    "group": "Specific|Alder",
    "legacy": false,
    "height": 14.79512,
    "width": 9.34211
  },
  "030600": {
    "description": "White Willow (old)",
    "color": "#339933",
    "colorStem": "#855e42",
    "colorBlossom": "#ffff99",
    "group": "Specific|White Willow",
    "legacy": false,
    "height": 23.83017,
    "width": 17.21943
  },
  "010025": {
    "description": "Rowan (young)",
    "color": "#008000",
    "colorStem": "#855e42",
    "colorBlossom": "#ffffcc",
    "group": "Specific|Rowan",
    "legacy": false,
    "height": 10.18045,
    "width": 5.87777
  },
  "020027": {
    "description": "Pine Tree (middle)",
    "color": "#003300",
    "colorStem": "#855e42",
    "colorBlossom": "#99cc00",
    "group": "Specific|Pine",
    "legacy": false,
    "height": 20.30161,
    "width": 8.74732
  },
  "030660": {
    "description": "Primeval Sequioa (old)",
    "color": "#003300",
    "colorStem": "#855e42",
    "colorBlossom": "#00cc00",
    "group": "Specific|Primeval Sequioa",
    "legacy": false,
    "height": 24.76958,
    "width": 8.99197
  },
  "010190": {
    "description": "Tree Hazel (young)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#996600",
    "group": "Specific|Tree Hazel",
    "legacy": false,
    "height": 10.13217,
    "width": 5.62835
  },
  "020025": {
    "description": "Rowan (middle)",
    "color": "#008000",
    "colorStem": "#855e42",
    "colorBlossom": "#ffffcc",
    "group": "Specific|Rowan",
    "legacy": false,
    "height": 13.78044,
    "width": 5.87777
  },
  "010039": {
    "description": "Spaeth's Alder (young)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#663300",
    "group": "Specific|Alder",
    "legacy": false,
    "height": 10.69705,
    "width": 7.59105
  },
  "030039": {
    "description": "Spaeth's Alder (old)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#663300",
    "group": "Specific|Alder",
    "legacy": false,
    "height": 19.57606,
    "width": 10.36639
  },
  "030033": {
    "description": "Sycamore Maple (old)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#00ff00",
    "group": "Specific|Sycamore Maple",
    "legacy": false,
    "height": 25.46482,
    "width": 20.21043
  },
  "010033": {
    "description": "Sycamore Maple (young)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#00ff00",
    "group": "Specific|Sycamore Maple",
    "legacy": false,
    "height": 10.4548,
    "width": 7.46255
  },
  "010160": {
    "description": "American Sweet Gum (young)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Specific|American Sweet Gum",
    "legacy": false,
    "height": 7.5359,
    "width": 4.11793
  },
  "030020": {
    "description": "Field Maple (old)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#99ff33",
    "group": "Specific|Field Maple",
    "legacy": false,
    "height": 19.46144,
    "width": 14.09977
  },
  "010080": {
    "description": "Common Ash (young)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#66ff33",
    "group": "Specific|Ash",
    "legacy": false,
    "height": 12.13345,
    "width": 7.64737
  },
  "020080": {
    "description": "Common Ash (middle)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#66ff33",
    "group": "Specific|Ash",
    "legacy": false,
    "height": 16.06515,
    "width": 9.78778
  },
  "030080": {
    "description": "Common Ash (old)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#66ff33",
    "group": "Specific|Ash",
    "legacy": false,
    "height": 20.99497,
    "width": 17.37864
  },
  "020150": {
    "description": "Ginkgo / Fan Leave Tree (middle)",
    "color": "#66ff33",
    "colorStem": "#855e42",
    "colorBlossom": "#ccff66",
    "group": "Specific|Ginkgo / Fan Leave Tree",
    "legacy": false,
    "height": 14.90368,
    "width": 7.16625
  },
  "010150": {
    "description": "Ginkgo / Fan Leave Tree (young)",
    "color": "#66ff33",
    "colorStem": "#855e42",
    "colorBlossom": "#ccff66",
    "group": "Specific|Ginkgo / Fan Leave Tree",
    "legacy": false,
    "height": 8.75059,
    "width": 4.65116
  },
  "020070": {
    "description": "Hornbeam (middle)",
    "color": "#339933",
    "colorStem": "#855e42",
    "colorBlossom": "#cccc00",
    "group": "Specific|Hornbeam",
    "legacy": false,
    "height": 15.4705,
    "width": 10.40005
  },
  "010070": {
    "description": "Hornbeam (young)",
    "color": "#339933",
    "colorStem": "#855e42",
    "colorBlossom": "#cccc00",
    "group": "Specific|Hornbeam",
    "legacy": false,
    "height": 7.27173,
    "width": 3.94779
  },
  "020060": {
    "description": "London Plane Tree (middle)",
    "color": "#00cc00",
    "colorStem": "#855e42",
    "colorBlossom": "#cc0000",
    "group": "Specific|Plane Tree",
    "legacy": false,
    "height": 17.86259,
    "width": 11.90361
  },
  "010060": {
    "description": "London Plane Tree (young)",
    "color": "#00cc00",
    "colorStem": "#855e42",
    "colorBlossom": "#cc0000",
    "group": "Specific|Plane Tree",
    "legacy": false,
    "height": 11.38676,
    "width": 6.9627
  },
  "020034": {
    "description": "Red Oak (middle)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#ffcc99",
    "group": "Specific|Red Oak",
    "legacy": false,
    "height": 16.47959,
    "width": 11.55387
  },
  "010050": {
    "description": "Horse Chestnut (young)",
    "color": "#336600",
    "colorStem": "#855e42",
    "colorBlossom": "#ffffcc",
    "group": "Specific|Horse Chestnut",
    "legacy": false,
    "height": 8.23553,
    "width": 5.2639
  },
  "030051": {
    "description": "Red-flowered Horse Chestnut (old)",
    "color": "#336600",
    "colorStem": "#855e42",
    "colorBlossom": "#ff7c80",
    "group": "Specific|Red~flowered Horse Chestnut",
    "legacy": false,
    "height": 20.21642,
    "width": 20.49982
  },
  "020030": {
    "description": "Norway Maple (middle)",
    "color": "#00cc00",
    "colorStem": "#855e42",
    "colorBlossom": "#ccff99",
    "group": "Specific|Norway Maple",
    "legacy": false,
    "height": 15.8209,
    "width": 12.82952
  },
  "010030": {
    "description": "Norway Maple (young)",
    "color": "#00cc00",
    "colorStem": "#855e42",
    "colorBlossom": "#ccff99",
    "group": "Specific|Norway Maple",
    "legacy": false,
    "height": 10.35744,
    "width": 6.66614
  },
  "000040": {
    "description": "Pendunculate Oak (GALK)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#ccff66",
    "group": "Specific|Pendunculate Oak",
    "legacy": false,
    "height": 27.83955,
    "width": 21.10182
  },
  "020040": {
    "description": "Pendunculate Oak (middle)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#ccff66",
    "group": "Specific|Pendunculate Oak",
    "legacy": false,
    "height": 16.72824,
    "width": 9.79453
  },
  "010040": {
    "description": "Pendunculate Oak (young)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#ccff66",
    "group": "Specific|Pendunculate Oak",
    "legacy": false,
    "height": 10.45615,
    "width": 5.35595
  },
  "020035": {
    "description": "Silver Maple (middle)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#cccc00",
    "group": "Specific|Silver Maple",
    "legacy": false,
    "height": 18.02175,
    "width": 12.86553
  },
  "010035": {
    "description": "Silver Maple (young)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#cccc00",
    "group": "Specific|Silver Maple",
    "legacy": false,
    "height": 10.73827,
    "width": 5.87308
  },
  "020600": {
    "description": "White Willow (middle)",
    "color": "#339933",
    "colorStem": "#855e42",
    "colorBlossom": "#ffff99",
    "group": "Specific|White Willow",
    "legacy": false,
    "height": 13.51618,
    "width": 10.15749
  },
  "030140": {
    "description": "Wild Cherry Plena (old)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#ffffff",
    "group": "Specific|Wild Cherry",
    "legacy": false,
    "height": 19.20287,
    "width": 10.41866
  },
  "020140": {
    "description": "Wild Cherry Plena (middle)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#ffffff",
    "group": "Specific|Wild Cherry",
    "legacy": false,
    "height": 12.47453,
    "width": 7.95687
  },
  "010140": {
    "description": "Wild Cherry Plena (young)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#ffffff",
    "group": "Specific|Wild Cherry",
    "legacy": false,
    "height": 7.37641,
    "width": 3.52162
  },
  "01002B": {
    "description": "Field Maple Elegant (young)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#99ff33",
    "group": "Specific|Field Maple Elegant",
    "legacy": false,
    "height": 5.76593,
    "width": 3.19904
  },
  "020090": {
    "description": "Common Robinia (middle)",
    "color": "#008000",
    "colorStem": "#855e42",
    "colorBlossom": "#ffffff",
    "group": "Specific|Robinia / False Acacia",
    "legacy": false,
    "height": 14.03491,
    "width": 10.78291
  },
  "010090": {
    "description": "Common Robinia (young)",
    "color": "#008000",
    "colorStem": "#855e42",
    "colorBlossom": "#ffffff",
    "group": "Specific|Robinia / False Acacia",
    "legacy": false,
    "height": 7.31262,
    "width": 2.81474
  },
  "010130": {
    "description": "Swedish Whitebeam (young)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#ffffcc",
    "group": "Specific|Whitebeam",
    "legacy": false,
    "height": 8.35844,
    "width": 2.94736
  },
  "020111": {
    "description": "Hanging Birch (middle)",
    "color": "#009900",
    "colorStem": "#855e42",
    "colorBlossom": "#808000",
    "group": "Specific|Birch",
    "legacy": false,
    "height": 15.36686,
    "width": 13.29625
  },
  "010111": {
    "description": "Hanging Birch (young)",
    "color": "#009900",
    "colorStem": "#855e42",
    "colorBlossom": "#808000",
    "group": "Specific|Birch",
    "legacy": false,
    "height": 7.98162,
    "width": 8.05663
  },
  "020010": {
    "description": "Little Leaf Lime (middle)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#ffffcc",
    "group": "Specific|Little Leaf Lime",
    "legacy": false,
    "height": 18.52453,
    "width": 12.06763
  },
  "010010": {
    "description": "Little Leaf Lime (young)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#ffffcc",
    "group": "Specific|Little Leaf Lime",
    "legacy": false,
    "height": 11.36818,
    "width": 7.00349
  },
  "020032": {
    "description": "Sweet Chestnut/Maron (middle)",
    "color": "#339933",
    "colorStem": "#855e42",
    "colorBlossom": "#ffffcc",
    "group": "Specific|Sweet Chestnut / Maron",
    "legacy": false,
    "height": 14.00247,
    "width": 9.40498
  },
  "010031": {
    "description": "Bluebell Tree (young)",
    "color": "#339933",
    "colorStem": "#855e42",
    "colorBlossom": "#cc99ff",
    "group": "Specific|Bluebell Tree",
    "legacy": false,
    "height": 7.59613,
    "width": 7.24861
  },
  "020440": {
    "description": "Oak (middle)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#ccff66",
    "group": "Specific|Oak",
    "legacy": false,
    "height": 13.07376,
    "width": 8.21417
  },
  "030440": {
    "description": "Oak (old)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#ccff66",
    "group": "Specific|Oak",
    "legacy": false,
    "height": 18.79126,
    "width": 14.7135
  },
  "010027": {
    "description": "Pine Tree (young)",
    "color": "#38f189",
    "colorStem": "#855e42",
    "colorBlossom": "#99cc00",
    "group": "Specific|Pine",
    "legacy": false,
    "height": 10.85609,
    "width": 5.23429
  },
  "020170": {
    "description": "American Gelditschie / Leather Sleeve Tree (middle)",
    "color": "#008000",
    "colorStem": "#855e42",
    "colorBlossom": "#996600",
    "group": "Specific|Gleditschie / Leather Sleeve Tree",
    "legacy": false,
    "height": 15.58382,
    "width": 11.57177
  },
  "020037": {
    "description": "Tree of Heaven (middle)",
    "color": "#009900",
    "colorStem": "#855e42",
    "colorBlossom": "#ffff99",
    "group": "Specific|Tree of Heaven",
    "legacy": false,
    "height": 18.2404,
    "width": 10.91158
  },
  "020200": {
    "description": "Quaking Aspen (middle) II",
    "color": "#008000",
    "colorStem": "#855e42",
    "colorBlossom": "#663300",
    "group": "Specific|Quaking Aspen",
    "legacy": false,
    "height": 17.23324,
    "width": 10.40505
  },
  "010430": {
    "description": "Persian Walnut (young)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#ccff33",
    "group": "Specific|Walnut",
    "legacy": false,
    "height": 4.75084,
    "width": 2.77134
  },
  "010440": {
    "description": "Common Beech (young)",
    "color": "#00cc00",
    "colorStem": "#855e42",
    "colorBlossom": "#ccff99",
    "group": "Specific|Beech",
    "legacy": false,
    "height": 6.50777,
    "width": 4.14977
  },
  "030450": {
    "description": "Beech (old)",
    "color": "#00cc00",
    "colorStem": "#855e42",
    "colorBlossom": "#ccff66",
    "group": "Specific|Beech",
    "legacy": false,
    "height": 24.4653,
    "width": 21.04004
  },
  "010721": {
    "description": "Wild Fruit Tree (young)",
    "color": "#009900",
    "colorStem": "#855e42",
    "colorBlossom": "#ffffff",
    "group": "Specific|Wild Fruit Tree",
    "legacy": false,
    "height": 5.26078,
    "width": 2.76086
  },
  "010461": {
    "description": "Englisch Hawthorn Paul's Scarlett (young)",
    "color": "#339933",
    "colorStem": "#855e42",
    "colorBlossom": "#ff0066",
    "group": "Specific|Englisch Hawthorn",
    "legacy": false,
    "height": 7.09447,
    "width": 5.67055
  },
  "020592": {
    "description": "Japanese Pagoda Tree (middle)",
    "color": "#008000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Specific|Japanese Pagoda Tree",
    "legacy": false,
    "height": 11.93227,
    "width": 8.89372
  },
  "010641": {
    "description": "Indian Bean Tree (young)",
    "color": "#009900",
    "colorStem": "#855e42",
    "colorBlossom": "#ffffff",
    "group": "Specific|Indian Bean Tree",
    "legacy": false,
    "height": 6.87673,
    "width": 5.93072
  },
  "020652": {
    "description": "Tulip Tree (middle)",
    "color": "#006600",
    "colorStem": "#855e42",
    "colorBlossom": "#ffff99",
    "group": "Specific|Tulip Tree",
    "legacy": false,
    "height": 18.66122,
    "width": 11.78953
  },
  "020702": {
    "description": "Willow Tree (middle)",
    "color": "#339933",
    "colorStem": "#855e42",
    "colorBlossom": "#ffffcc",
    "group": "Specific|Willow Tree",
    "legacy": false,
    "height": 17.07279,
    "width": 13.84562
  },
  "010700": {
    "description": "Willow Tree (young)",
    "color": "#339933",
    "colorStem": "#855e42",
    "colorBlossom": "#ffffcc",
    "group": "Specific|Willow Tree",
    "legacy": false,
    "height": 6.36396,
    "width": 4.34513
  },
  "010800": {
    "description": "Bird Cherry (young)",
    "color": "#008000",
    "colorStem": "#855e42",
    "colorBlossom": "#ffffff",
    "group": "Specific|Bird Cherry",
    "legacy": false,
    "height": 7.18731,
    "width": 2.69033
  },
  "020810": {
    "description": "Bird Cherry Schloss Tiefurt (middle)",
    "color": "#336600",
    "colorStem": "#855e42",
    "colorBlossom": "#ffffff",
    "group": "Specific|Bird Cherry",
    "legacy": false,
    "height": 13.20717,
    "width": 7.39034
  },
  "010900": {
    "description": "Thuja (young)",
    "color": "#003300",
    "colorStem": "#855e42",
    "colorBlossom": "#00cc00",
    "group": "Specific|Thuja",
    "legacy": false,
    "height": 6.21176,
    "width": 1.80006
  },
  "02SSDM": {
    "description": "Spherical, small trunk, dense, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Medium|dense canopy",
    "legacy": false,
    "height": 15.0,
    "width": 11.0
  },
  "02SSDL": {
    "description": "Spherical, small trunk, dense, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Large|dense canopy",
    "legacy": false,
    "height": 25.0,
    "width": 19.0
  },
  "02SSDS": {
    "description": "Spherical, small trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Small|dense canopy",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "02SMDS": {
    "description": "Spherical, medium trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Small|dense canopy",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "02SLDS": {
    "description": "Spherical, large trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Small|dense canopy",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "02SMDM": {
    "description": "Spherical, medium trunk, dense, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Medium|dense canopy",
    "legacy": false,
    "height": 15.0,
    "width": 11.0
  },
  "02SMDL": {
    "description": "Spherical, medium trunk, dense, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Large|dense canopy",
    "legacy": false,
    "height": 25.0,
    "width": 19.0
  },
  "02SLDM": {
    "description": "Spherical, large trunk, dense, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Medium|dense canopy",
    "legacy": false,
    "height": 15.0,
    "width": 11.0
  },
  "02SLDL": {
    "description": "Spherical, large trunk, dense, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Large|dense canopy",
    "legacy": false,
    "height": 25.0,
    "width": 19.0
  },
  "02OSDL": {
    "description": "Cylindric, small trunk, dense, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Large|dense canopy",
    "legacy": false,
    "height": 25.0,
    "width": 11.0
  },
  "02OLDL": {
    "description": "Cylindric, large trunk, dense, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Large|dense canopy",
    "legacy": false,
    "height": 25.0,
    "width": 11.0
  },
  "02OSDS": {
    "description": "Cylindric, small trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Small|dense canopy",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "02OSDM": {
    "description": "Cylindric, small trunk, dense, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Medium|dense canopy",
    "legacy": false,
    "height": 15.0,
    "width": 9.0
  },
  "02OMDM": {
    "description": "Cylindric, medium trunk, dense, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Medium|dense canopy",
    "legacy": false,
    "height": 15.0,
    "width": 9.0
  },
  "02OMDS": {
    "description": "Cylindric, medium trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Small|dense canopy",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "02OMDL": {
    "description": "Cylindric, medium trunk, dense, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Large|dense canopy",
    "legacy": false,
    "height": 25.0,
    "width": 11.0
  },
  "02OLDM": {
    "description": "Cylindric, large trunk, dense, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Medium|dense canopy",
    "legacy": false,
    "height": 15.0,
    "width": 9.0
  },
  "02OLDS": {
    "description": "Cylindric, large trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Small|dense canopy",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "02HLDL": {
    "description": "Heart-shaped, large trunk, dense, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Large|dense canopy",
    "legacy": false,
    "height": 25.0,
    "width": 19.0
  },
  "02HLDM": {
    "description": "Heart-shaped, large trunk, dense, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Medium|dense canopy",
    "legacy": false,
    "height": 15.0,
    "width": 13.0
  },
  "02HLDS": {
    "description": "Heart-shaped, large trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Small|dense canopy",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "02HMDL": {
    "description": "Heart-shaped, medium trunk, dense, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Large|dense canopy",
    "legacy": false,
    "height": 25.0,
    "width": 19.0
  },
  "02HMDM": {
    "description": "Heart-shaped, medium trunk, dense, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Medium|dense canopy",
    "legacy": false,
    "height": 15.0,
    "width": 13.0
  },
  "02HMDS": {
    "description": "Heart-shaped, medium trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Small|dense canopy",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "02HSDL": {
    "description": "Heart-shaped, small trunk, dense, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Large|dense canopy",
    "legacy": false,
    "height": 25.0,
    "width": 19.0
  },
  "02HSDS": {
    "description": "Heart-shaped, small trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Small|dense canopy",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "02HSDM": {
    "description": "Heart-shaped, small trunk, dense, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Medium|dense canopy",
    "legacy": false,
    "height": 15.0,
    "width": 13.0
  },
  "02SSSM": {
    "description": "Spherical, small trunk, sparse, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Medium|sparse canopy",
    "legacy": false,
    "height": 15.0,
    "width": 11.0
  },
  "02SSSL": {
    "description": "Spherical, small trunk, sparse, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Large|sparse canopy",
    "legacy": false,
    "height": 25.0,
    "width": 19.0
  },
  "02SSSS": {
    "description": "Spherical, small trunk, sparse, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Small|sparse canopy",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "02SMSS": {
    "description": "Spherical, medium trunk, sparse, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Small|sparse canopy",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "02SLSS": {
    "description": "Spherical, large trunk, sparse, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Small|sparse canopy",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "02SMSM": {
    "description": "Spherical, medium trunk, sparse, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Medium|sparse canopy",
    "legacy": false,
    "height": 15.0,
    "width": 11.0
  },
  "02SMSL": {
    "description": "Spherical, medium trunk, sparse, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Large|sparse canopy",
    "legacy": false,
    "height": 25.0,
    "width": 19.0
  },
  "02SLSM": {
    "description": "Spherical, large trunk, sparse, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Medium|sparse canopy",
    "legacy": false,
    "height": 15.0,
    "width": 11.0
  },
  "02SLSL": {
    "description": "Spherical, large trunk, sparse, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Large|sparse canopy",
    "legacy": false,
    "height": 25.0,
    "width": 19.0
  },
  "02OSSL": {
    "description": "Cylindric, small trunk, sparse, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Large|sparse canopy",
    "legacy": false,
    "height": 25.0,
    "width": 11.0
  },
  "02OLSL": {
    "description": "Cylindric, large trunk, sparse, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Large|sparse canopy",
    "legacy": false,
    "height": 25.0,
    "width": 11.0
  },
  "02OSSS": {
    "description": "Cylindric, small trunk, sparse, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Small|sparse canopy",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "02OSSM": {
    "description": "Cylindric, small trunk, sparse, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Medium|sparse canopy",
    "legacy": false,
    "height": 15.0,
    "width": 9.0
  },
  "02OMSM": {
    "description": "Cylindric, medium trunk, sparse, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Medium|sparse canopy",
    "legacy": false,
    "height": 15.0,
    "width": 9.0
  },
  "02OMSS": {
    "description": "Cylindric, medium trunk, sparse, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Small|sparse canopy",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "02OMSL": {
    "description": "Cylindric, medium trunk, sparse, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Large|sparse canopy",
    "legacy": false,
    "height": 25.0,
    "width": 11.0
  },
  "02OLSM": {
    "description": "Cylindric, large trunk, sparse, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Medium|sparse canopy",
    "legacy": false,
    "height": 15.0,
    "width": 9.0
  },
  "02OLSS": {
    "description": "Cylindric, large trunk, sparse, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Small|sparse canopy",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "02HLSL": {
    "description": "Heart-shaped, large trunk, sparse, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Large|sparse canopy",
    "legacy": false,
    "height": 25.0,
    "width": 19.0
  },
  "02HLSM": {
    "description": "Heart-shaped, large trunk, sparse, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Medium|sparse canopy",
    "legacy": false,
    "height": 15.0,
    "width": 13.0
  },
  "02HLSS": {
    "description": "Heart-shaped, large trunk, sparse, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Small|sparse canopy",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "02HMSL": {
    "description": "Heart-shaped, medium trunk, sparse, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Large|sparse canopy",
    "legacy": false,
    "height": 25.0,
    "width": 19.0
  },
  "02HMSM": {
    "description": "Heart-shaped, medium trunk, sparse, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Medium|sparse canopy",
    "legacy": false,
    "height": 15.0,
    "width": 13.0
  },
  "02HMSS": {
    "description": "Heart-shaped, medium trunk, sparse, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Small|sparse canopy",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "02HSSL": {
    "description": "Heart-shaped, small trunk, sparse, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Large|sparse canopy",
    "legacy": false,
    "height": 25.0,
    "width": 19.0
  },
  "02HSSS": {
    "description": "Heart-shaped, small trunk, sparse, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Small|sparse canopy",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "02HSSM": {
    "description": "Heart-shaped, small trunk, sparse, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Deciduous Trees|Medium|sparse canopy",
    "legacy": false,
    "height": 15.0,
    "width": 13.0
  },
  "02ALDL": {
    "description": "Conic, large trunk, dense, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Large|dense canopy",
    "legacy": false,
    "height": 25.0,
    "width": 11.0
  },
  "02CSDS": {
    "description": "Cylindric, small trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Small|dense canopy",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "02AMDM": {
    "description": "Conic, medium trunk, dense, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Medium|dense canopy",
    "legacy": false,
    "height": 15.0,
    "width": 7.0
  },
  "02AMDS": {
    "description": "Conic, medium trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Small|dense canopy",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "02ALDS": {
    "description": "Conic, large trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Small|dense canopy",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "02AMDL": {
    "description": "Conic, medium trunk, dense, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Large|dense canopy",
    "legacy": false,
    "height": 25.0,
    "width": 11.0
  },
  "02ALDM": {
    "description": "Conic, large trunk, dense, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Medium|dense canopy",
    "legacy": false,
    "height": 15.0,
    "width": 7.0
  },
  "02ASDL": {
    "description": "Conic, small trunk, dense, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Large|dense canopy",
    "legacy": false,
    "height": 25.0,
    "width": 11.0
  },
  "02ASDM": {
    "description": "Conic, small trunk, dense, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Medium|dense canopy",
    "legacy": false,
    "height": 15.0,
    "width": 7.0
  },
  "02ASDS": {
    "description": "Conic, small trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Small|dense canopy",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "02CLDL": {
    "description": "Cylindric, large trunk, dense, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Large|dense canopy",
    "legacy": false,
    "height": 25.0,
    "width": 15.0
  },
  "02CSDL": {
    "description": "Cylindric, small trunk, dense, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Large|dense canopy",
    "legacy": false,
    "height": 25.0,
    "width": 15.0
  },
  "02CMDL": {
    "description": "Cylindric, medium trunk, dense, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Large|dense canopy",
    "legacy": false,
    "height": 25.0,
    "width": 15.0
  },
  "02CMDM": {
    "description": "Cylindric, medium trunk, dense, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Medium|dense canopy",
    "legacy": false,
    "height": 15.0,
    "width": 9.0
  },
  "02CMDS": {
    "description": "Cylindric, medium trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Small|dense canopy",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "02CLDS": {
    "description": "Cylindric, large trunk, dense, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Small|dense canopy",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "02CSDM": {
    "description": "Cylindric, small trunk, dense, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Medium|dense canopy",
    "legacy": false,
    "height": 15.0,
    "width": 9.0
  },
  "02CLDM": {
    "description": "Cylindric, large trunk, dense, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Medium|dense canopy",
    "legacy": false,
    "height": 15.0,
    "width": 9.0
  },
  "02ALSL": {
    "description": "Conic, large trunk, sparse, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Large|sparse canopy",
    "legacy": false,
    "height": 25.0,
    "width": 11.0
  },
  "02CSSS": {
    "description": "Cylindric, small trunk, sparse, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Small|sparse canopy",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "02AMSM": {
    "description": "Conic, medium trunk, sparse, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Medium|sparse canopy",
    "legacy": false,
    "height": 15.0,
    "width": 7.0
  },
  "02AMSS": {
    "description": "Conic, medium trunk, sparse, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Small|sparse canopy",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "02ALSS": {
    "description": "Conic, large trunk, sparse, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Small|sparse canopy",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "02AMSL": {
    "description": "Conic, medium trunk, sparse, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Large|sparse canopy",
    "legacy": false,
    "height": 25.0,
    "width": 11.0
  },
  "02ALSM": {
    "description": "Conic, large trunk, sparse, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Medium|sparse canopy",
    "legacy": false,
    "height": 15.0,
    "width": 7.0
  },
  "02ASSL": {
    "description": "Conic, small trunk, sparse, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Large|sparse canopy",
    "legacy": false,
    "height": 25.0,
    "width": 11.0
  },
  "02ASSM": {
    "description": "Conic, small trunk, sparse, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Medium|sparse canopy",
    "legacy": false,
    "height": 15.0,
    "width": 7.0
  },
  "02ASSS": {
    "description": "Conic, small trunk, sparse, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Small|sparse canopy",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "02CLSL": {
    "description": "Cylindric, large trunk, sparse, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Large|sparse canopy",
    "legacy": false,
    "height": 25.0,
    "width": 15.0
  },
  "02CSSL": {
    "description": "Cylindric, small trunk, sparse, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Large|sparse canopy",
    "legacy": false,
    "height": 25.0,
    "width": 15.0
  },
  "02CMSL": {
    "description": "Cylindric, medium trunk, sparse, large (25m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Large|sparse canopy",
    "legacy": false,
    "height": 25.0,
    "width": 15.0
  },
  "02CMSM": {
    "description": "Cylindric, medium trunk, sparse, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Medium|sparse canopy",
    "legacy": false,
    "height": 15.0,
    "width": 9.0
  },
  "02CMSS": {
    "description": "Cylindric, medium trunk, sparse, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Small|sparse canopy",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "02CLSS": {
    "description": "Cylindric, large trunk, sparse, small (5m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Small|sparse canopy",
    "legacy": false,
    "height": 5.0,
    "width": 3.0
  },
  "02CSSM": {
    "description": "Cylindric, small trunk, sparse, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Medium|sparse canopy",
    "legacy": false,
    "height": 15.0,
    "width": 9.0
  },
  "02CLSM": {
    "description": "Cylindric, large trunk, sparse, medium (15m)",
    "color": "#000000",
    "colorStem": "#855e42",
    "colorBlossom": "#ab2dbc",
    "group": "Abstract|Conifers|Medium|sparse canopy",
    "legacy": false,
    "height": 15.0,
    "width": 9.0
  }
};

export const SOURCE_DB = {
  "0200DR": {
    "description": "Test Lane",
    "color": "#e6f351",
    "group": null,
    "legacy": false,
    "sourcetype": 1,
    "defaultHeight": 0.15
  },
  "0000DR": {
    "description": "LEGACY: Test Lane",
    "color": "#e6f351",
    "group": "~ Legacy",
    "legacy": true,
    "sourcetype": 1,
    "defaultHeight": 0.15
  },
  "0200FT": {
    "description": "Water Fountain 4 m",
    "color": "#73fc0a",
    "group": null,
    "legacy": false,
    "sourcetype": 0,
    "defaultHeight": 4.0
  },
  "0200WN": {
    "description": "Water Nozzle 2 m",
    "color": "#73fc0a",
    "group": null,
    "legacy": false,
    "sourcetype": 0,
    "defaultHeight": 2.0
  },
  "0000FT": {
    "description": "LEGACY: Water Fountain 4 m",
    "color": "#73fc0a",
    "group": "~ Legacy",
    "legacy": true,
    "sourcetype": 0,
    "defaultHeight": 4.0
  }
};
