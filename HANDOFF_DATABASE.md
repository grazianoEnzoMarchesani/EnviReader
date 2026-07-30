# Handoff — Database materiali ENVI-met → colori reali per il 3D

## Contesto
`database.edb` (root del repo, ~4.8MB, **non tracciato in git**) è il database
materiali ENVI-met V.4.4 Winter1819 decrittato in una chat precedente
(spacchettando l'installer 5.6.1). È testo XML-like, non JSON.

`inxScene.js` e `colormap.js` oggi colorano edifici/terreno/vegetazione con
palette **hardcoded a mano** (`WALL_COLORS`, `ROOF_COLORS`, `SOIL_COLORS`,
`VEGETATION_COLORS` + `hashPick()`), perché finora il database reale non era
leggibile. Obiettivo: sostituirle con i colori reali del database.

## Fatto in questa chat

1. **Letto tutto `database.edb`**, mappate le 9 sezioni: `SOIL`, `MATERIAL`,
   `WALL` (= Building Construction, pacchetti multi-layer), `SINGLEWALL`
   (muri a strato unico), `PROFILE` (stack di 19 layer `SOIL` = quello
   davvero usato per colorare il terreno negli INX), `GREENING` (tetti/pareti
   verdi), `PLANT` (vegetazione 2D), `PLANT3D` (338 alberi 3D, con colore
   separato per fogliame/tronco/fiori), `SOURCE` (sorgenti inquinamento,
   irrilevante per i colori).

2. **Decodificato il formato colore**: il campo `<Color>` NON è RGB diretto,
   è un `TColor` Delphi / `COLORREF` Windows in ordine **BGR** (`0x00BBGGRR`):
   ```
   R = color & 0xFF
   G = (color >> 8) & 0xFF
   B = (color >> 16) & 0xFF
   ```
   Un solo colore su 696 nel DB eccede i 24 bit (byte alto spurio `0x02` su
   un `PLANT3D` "Pine Tree"); risolto con mask `& 0xFFFFFF` prima di
   decodificare.

3. **Generato [src/data/envimetMaterials.js](src/data/envimetMaterials.js)**
   (163KB, creato con uno script Python usato una tantum, non salvato nel
   repo) con 7 export, scope deciso insieme a Graziano (**esclusi
   volutamente `MATERIAL` e `SOIL` grezzi**, tenuti solo i colori "di
   pacchetto"):

   | Export | Voci | Chiave | Campi extra oltre color/group/legacy |
   |---|---|---|---|
   | `WALL_DB` | 83 | ID `BuildingWallMaterial`/`BuildingRoofMaterial` | `materials[]`, `thicknessLayers[]`, `roughnessLength`, `canBeGreened` |
   | `SINGLEWALL_DB` | 5 | stesso tipo di ID | `material`, `thickness`, `roughnessLength` |
   | `PROFILE_DB` | 62 | ID profilo suolo (matrice terreno INX) | `soilProfile[]` (19 ID `SOIL`), `albedo` |
   | `GREENING_DB` | 8 | ID pacchetto verde | `soilId[]`, `simplePlantId`, `hasSubstrate` |
   | `PLANT_DB` | 36 | ID pianta 2D | `height`, `planttype` |
   | `PLANT3D_DB` | 337 (338 nel DB, 1 ID duplicato `0000PA` — l'ultima occorrenza vince) | ID albero 3D | `colorStem`, `colorBlossom` (oltre a `color` = fogliame), `height`, `width` |
   | `SOURCE_DB` | 5 | ID sorgente | `sourcetype`, `defaultHeight` |

   `legacy: true` = voce storica (`Description`/`Name` che inizia per
   `LEGACY:` o `Group` che inizia per `~`) — **tenuta di proposito**, non
   filtrata, perché progetti INX vecchi possono ancora referenziarla.

   Verificato con `node --input-type=module -e "import(...)"`: tutte le
   chiavi caricano, colori plausibili (es. `PROFILE_DB.CELLAR.color` →
   `#808080`, `PLANT3D_DB['010027']` Pine con tronco `#855e42`).

## Stato attuale
- **Niente è committato.** `database.edb` e `src/data/envimetMaterials.js`
  sono `??` in `git status` — Graziano preferisce revisionare e committare a
  mano (stesso pattern di [[envireader-pulizia-in-corso]]).
- `inxScene.js` / `colormap.js` **non sono ancora stati toccati**: i fallback
  vecchi (`hashPick`, `WALL_COLORS`, `SOIL_COLORS`, `VEGETATION_COLORS`) sono
  ancora lì e attivi.

## Prossimo passo (non ancora iniziato)
Wire di `src/data/envimetMaterials.js` dentro `src/lib/inxScene.js` e
`src/lib/colormap.js`:
- `soilColor(id)` in `inxScene.js:72` → lookup `PROFILE_DB[id].color`,
  fallback su `SOIL_COLORS`/`hashPick` solo se l'ID non è nel DB.
- `buildingColors()` in `inxScene.js:527` → lookup `WALL_DB[wallMaterial]`
  o `SINGLEWALL_DB[wallMaterial]` (idem per `roofMaterial`), stesso
  fallback a `hashPick` per ID assenti (es. progetti con materiali custom
  non nel DB ufficiale).
- `VEGETATION_COLORS` in `colormap.js:13` → **non collegabile direttamente**:
  l'INX espone solo la classe di densità `rv` (11–15), non l'ID pianta
  reale. Per usare `PLANT_DB`/`PLANT3D_DB` servirebbe prima parsare il blocco
  `<3Dplants>` dell'INX, che oggi `inx.js` esplicitamente non legge (vedi
  commento a inx.js:2).

Punto aperto da decidere con Graziano prima di scrivere codice: cosa fare
quando un ID letto dall'INX non è nel DB leggero (mantenere il fallback
hash attuale come rete di sicurezza, presumibilmente sì).
