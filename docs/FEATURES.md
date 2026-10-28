# EnviReader 2.0.1: mappa completa delle funzionalità

Inventario ricavato dal codice sorgente (non dal README né dai testi di aiuto in app), pensato come scaletta per la documentazione e per una serie di video, uno per funzionalità o per gruppo di funzionalità.

Ogni voce ha la stessa struttura:

- **Dove**: vista › zona dell'interfaccia › controllo
- **Cosa fa**
- **Serve**: dati o condizioni necessari perché la funzione compaia o funzioni
- **Note**: vincoli e interazioni con altre funzioni, cose da sapere prima di registrare
- **Tasto**: scorciatoia, se esiste
- **Stato**: indicato solo se non è stabile; le etichette in app dicono *3D (beta)* e *WebGIS (alpha)*

In fondo ci sono un ordine suggerito per i video e l'elenco delle **incongruenze trovate** tra codice, testi di aiuto e `docs/keyboard_shortcuts.txt`. Va letto prima di copiare testi di aiuto nella documentazione.

---

## 0. Concetti trasversali (da spiegare una volta, all'inizio)

**Fileset A e B.** Un fileset è la cartella di output di una simulazione ENVI-met. A è il fileset principale, B è quello di confronto, facoltativo. Tutto viene letto in locale nel browser e non viene caricato su alcun server.

**Quattro viste**, nella barra in alto:

1. *2D Data Analysis*
2. *3D Data Analysis (beta)*
3. *WebGIS (alpha)*
4. *Boundary conditions*

**La sidebar è condivisa** da 2D, 3D e WebGIS, con le schede Data, Wind, Palette, Cursors e Presets. La vista Boundary conditions non ha sidebar.

**Lo stato è condiviso tra le viste.** Cambiando vista restano identici:

- istante temporale
- livello, sezioni e angolo delle sezioni
- dataset
- palette
- stile di resa (Pixel o Contour)
- zebra
- impostazioni del vento

Anche la riproduzione automatica continua quando si cambia vista o scheda.

**Il "mirino"** è l'incrocio delle due sezioni (`sectionX`/`sectionY`) più il livello. Determina:

- le sezioni mostrate
- il punto della serie temporale
- la quota indicata accanto allo slider del livello

**Tooltip di aiuto.** Quasi ogni controllo mostra al passaggio del mouse un tooltip con titolo e spiegazione.

**Toolbar e sidebar richiudibili.**

- La toolbar di ogni vista ha una freccia per comprimerla.
- La sidebar ha una linguetta laterale per comprimerla.
- Il tasto `\` chiude o apre entrambe insieme.

---

## 1. Avvio, file e impostazioni generali

### F01 · Apertura del fileset A
- **Dove**: barra in alto › *+ Open fileset A*
- **Cosa fa**: chiede di scegliere la cartella dei risultati ENVI-met, poi:
  - cerca ricorsivamente le coppie EDT/EDX e le raggruppa in **gruppi dati**, uno per sottocartella (per esempio `atmosphere`, `biomet/UTCI`, `surface`, …);
  - le ordina cronologicamente leggendo data e ora dal nome del file;
  - legge l'INX (modello), il SIMX (nome della simulazione) e il terreno.

  Il pulsante mostra poi il **nome della simulazione** letto dal `<simName>` del SIMX, oppure il nome della cartella se manca.
- **Serve**: una cartella di output ENVI-met con coppie EDT/EDX.
- **Note**:
  - Su Chrome ed Edge usa il selettore di cartelle nativo (File System Access API).
  - Su Firefox e Safari usa il selettore di file con `webkitdirectory`. Il comportamento è lo stesso, ma il dialogo è diverso: conviene mostrarlo nel video.
  - Durante la lettura compare uno spinner "Loading…".
  - I valori `-999` di ENVI-met diventano "nessun dato", cioè celle trasparenti.

### F02 · Apertura e chiusura del fileset B (confronto)
- **Dove**: barra in alto › *+ Open fileset B (compare)*
- **Cosa fa**: carica una seconda simulazione per il confronto. Cliccando di nuovo il pulsante, il fileset B si chiude.
- **Note**:
  - I gruppi dati mostrati sono quelli di A.
  - Chiudere B riporta tutti i confronti a "Only A".

### F03 · Tema chiaro/scuro
- **Dove**: barra in alto › interruttore Light/Dark
- **Cosa fa**: cambia il tema dell'intera app. Si adeguano anche lo sfondo 3D, i colori del vento 3D e i grafici FOX.
- **Note**: al primo avvio segue il tema di sistema; la scelta viene poi ricordata.
- **Tasto**: `Shift+D`

### F04 · Lingua
- **Dove**: barra in alto › IT / EN / ES / FR / DE
- **Cosa fa**: traduce l'interfaccia in 5 lingue.

### F05 · Scorciatoie da tastiera
- **Dove**: barra in alto › icona tastiera, oppure `Shift+?`
- **Cosa fa**: apre il pannello con l'elenco delle scorciatoie.

  | Tasto | Azione |
  |---|---|
  | `Spazio` | Play/pausa del tempo |
  | `←` / `→` | Istante precedente/successivo |
  | `↑` / `↓` | Livello (piano orizzontale) su/giù, sia in 2D sia in 3D |
  | `1` / `2` / `3` | In 2D: Pianta / Sezione longitudinale / Sezione trasversale. In 3D: vista dall'alto / destra / fronte |
  | `B` / `V` / `T` / `R` | Edifici / Vegetazione / Terreno / Ricettori |
  | `O` | Overlay dati in 3D |
  | `S` | Simulazione solare |
  | `F` | Campo di vento sulle fette |
  | `Shift+F` | Volume di vento 3D |
  | `C` | Cicla le modalità di confronto (solo con B aperto) |
  | `A` | Alterna 2D e 3D |
  | `G` | WebGIS |
  | `E` | Boundary conditions |
  | `\` | Toolbar e sidebar |
  | `Shift+D` | Tema |
  | `Shift+?` | Questo pannello |

- **Note**: le scorciatoie sono ignorate mentre si scrive in un campo di testo.

### F06 · Privacy
- **Dove**:
  - banner al primo avvio
  - barra in alto › *Privacy*
- **Cosa fa**:
  - Il banner ricorda che i file restano nel browser.
  - Il pannello contiene l'informativa completa e un pulsante per **cancellare tutti i dati salvati** dall'app (palette, preset, cursori, calibrazioni, consenso mappa), con conferma.
- **Note**:
  - Niente cookie, analytics o CDN.
  - L'unico contatto con terzi è la mappa di sfondo del WebGIS, ed è attivo solo dopo il consenso (F64).

### F07 · Crediti e citazione
- **Dove**: clic sul logo *EnviReader* in alto a sinistra
- **Cosa fa**: mostra versione, autori, link a GitHub e la **citazione accademica** (DOI Zenodo).

---

## 2. Vista *2D Data Analysis*

### Selezione dei dati (sidebar › scheda Data)

### F10 · Gruppo dati e dataset
- **Dove**: sidebar › Data › *Data group*, *Dataset*
- **Cosa fa**:
  - Il gruppo dati è la sottocartella di output.
  - Il dataset è la variabile, letta dall'EDX: per esempio *Potential Air Temperature (°C)*, *Wind Speed (m/s)*, *UTCI (°C)*, …
- **Note**: se il nuovo gruppo ha la stessa variabile, la selezione si conserva.

### F11 · Slider del tempo
- **Dove**: sidebar › Data › *Time*
- **Cosa fa**: sceglie l'istante. Ogni passo corrisponde a un file EDT/EDX, con etichetta `AAAA-MM-GG · HH:MM`.
- **Tasto**: `←` / `→`

### F12 · Riproduzione automatica (time player)
- **Dove**: sidebar › Data › pulsante ▶ accanto al valore di *Time*
- **Cosa fa**: apre un piccolo lettore con:
  - passo indietro, play/pausa, passo avanti;
  - velocità **1×, 5× e 10×**, dove 1× corrisponde a un passo ogni 0,6 s.

  La riproduzione va in loop.
- **Note**:
  - La riproduzione continua anche a pannello chiuso e cambiando vista: 2D, 3D, WebGIS, sole e volume di vento seguono il tempo.
  - Si ferma da sola se la serie ha un solo istante.
- **Tasto**: `Spazio`

### F13 · Livello (piano orizzontale) e quota reale
- **Dove**: sidebar › Data › *Plan level*
- **Cosa fa**:
  - Sceglie l'indice Z della pianta.
  - Accanto mostra la **quota in metri** nel punto del mirino. Con *Follow terrain* attivo mostra anche "m dal suolo".
- **Tasto**: `↑` / `↓`

### F14 · Posizione delle sezioni
- **Dove**: sidebar › Data › *Longitudinal position*, *Transverse position*
- **Cosa fa**: sposta le due sezioni verticali, X e Y.

### F15 · Rotazione delle sezioni
- **Dove**:
  - sidebar › Data › *Section rotation*, da −90° a +90°
  - oppure trascinando la maniglia sulle linee in pianta (F27)
- **Cosa fa**: ruota la croce delle sezioni attorno al perno. Le sezioni diventano piani verticali obliqui.
- **Note**: un chip con l'angolo, visibile in pianta, riporta le sezioni ortogonali.

### F16 · Segui il terreno (Follow terrain)
- **Dove**: sidebar › Data › *Follow terrain*. È attivo di default.
- **Cosa fa**: la pianta non è più un piano a quota fissa, ma "drappeggia" il terreno: il livello diventa relativo al suolo.
- **Note**: incide su pianta, sezioni (profilo del taglio), serie temporale, overlay 3D e quota mostrata.

### F17 · Modalità di livellamento (Standard / Cascade)
- **Dove**: sidebar › Data › *Leveling mode*. Compare solo con *Follow terrain* attivo.
- **Cosa fa**: man mano che il livello sale, il piano di taglio smette di seguire il rilievo e diventa orizzontale.
  - **Standard**: il rilievo si smorza in modo uniforme su tutte le celle.
  - **Cascade**: ogni colonna resta ferma alla sua quota finché il livello non la raggiunge, poi la segue. Funziona come l'acqua che sale e sommerge prima le zone basse. È il default.
- Lo slider **Transition height** regola in quanti livelli avviene il passaggio.

### F18 · Overlay zebra (zone fuori soglia)
- **Dove**: sidebar › Data › *Zebra (out-of-range areas)*
- **Cosa fa**: copre con strisce diagonali, come gli esposimetri fotografici, le celle che stanno:
  - sopra un **percentile alto**: strisce nere;
  - sotto un **percentile basso**: strisce blu, inclinate al contrario, quindi leggibili anche da chi non distingue i colori.

  In modalità **Inverted** copre invece tutto ciò che è *fuori* dal range scelto, in grigio. Uno slider a doppia maniglia imposta i percentili e accanto mostra il valore reale corrispondente. Sotto la mappa compare una legenda zebra.
- **Note**:
  - I percentili sono calcolati sulla vista visibile (quella pianta o quella sezione), non sull'intero dataset.
  - In 3D funziona solo con *Smooth surface* oppure con lo stile Contour (vedi F43).
  - Se si porta uno slider all'estremo (0 o 100), quel lato si disattiva.

### Toolbar della vista 2D

### F20 · Modalità di confronto
- **Dove**: toolbar › *Only A* / *Only B* / *A vs B* / *A vs B vs Diff*
- **Cosa fa**:
  - mostra una, due o tre mappe affiancate;
  - **Diff** è la differenza cella per cella, con scala simmetrica attorno allo zero e una palette divergente propria.
- **Serve**: il fileset B aperto. Senza B le tre opzioni sono disabilitate e un suggerimento lo spiega.
- **Note**:
  - L'ordine della differenza, (A−B) o (B−A), si sceglie nella scheda Palette (F36).
  - Passando da una a più mappe lo zoom si reimposta.
- **Tasto**: `C`

### F21 · Tipo di vista: Pianta / Sezione longitudinale / Sezione trasversale
- **Dove**:
  - toolbar › *Plan* / *Longitudinal section* / *Transverse section*
  - oppure clic sulle miniature sotto ogni mappa
- **Cosa fa**: la mappa grande mostra la vista scelta; le altre due compaiono come **miniature cliccabili**, con la loro mini-legenda.
- **Note**: se il gruppo dati ha **un solo livello Z** (per esempio `surface`), le sezioni sono nascoste e resta solo la pianta.
- **Tasto**: `1` / `2` / `3`

### F22 · Zoom delle viste
- **Dove**: toolbar › *View zoom*, da 1× a 3×
- **Cosa fa**: allarga le mappe fino a una per riga, a tutta larghezza.

### F23 · Stile di resa: Pixel / Contour / Vector (SVG)
- **Dove**: toolbar › *Pixel* / *Contour* / *Vector (SVG)*
- **Cosa fa**:
  - **Pixel**: una tinta per cella, alla risoluzione esatta della griglia.
  - **Contour**: dati interpolati in **fasce di colore con isolinee** (filled contour).
  - **Vector**: la griglia disegnata in forme vettoriali. È più pesante e utile in vista dell'export SVG.
- **Note**: Pixel e Contour esistono anche in 3D; Vector solo in 2D.

### F24 · Modalità HD (2D)
- **Dove**: toolbar › icona *HD*. È attiva di default.
- **Cosa fa**: ricampiona la mappa alla risoluzione fisica dello schermo. Rende l'immagine più nitida a zoom elevati, soprattutto in Contour.

### F25 · Limiti della legenda (Legend bounds)
- **Dove**: toolbar › *Legend*
- **Cosa fa**: decide su quale insieme si calcolano minimo e massimo della scala colori.

  | Opzione | Insieme usato |
  |---|---|
  | *single chart* | ogni mappa per conto suo |
  | *across views* (default) | ogni tipo di vista (pianta, sezione X, sezione Y) ha il suo range, condiviso tra A e B |
  | *fileset* | pianta e sezioni dello stesso fileset su un unico range |
  | *all filesets* | pianta e sezioni di A e B insieme, per un confronto equo |
  | *manual* | valori impostati a mano (F26) |

- **Note**:
  - Tutti gli ambiti automatici si calcolano **solo sull'istante corrente** e si ricalcolano a ogni passo temporale, anche *fileset*: nessuno copre l'intera serie.
  - Durante la riproduzione i colori seguono quindi la distribuzione di ogni singola ora, non l'andamento della giornata.
  - Per confrontare ore diverse serve il range manuale.

### F26 · Range manuale cliccando la legenda
- **Dove**: clic sulla barra della legenda, di una mappa o di una miniatura
- **Cosa fa**: apre una finestra con slider a doppia maniglia e campi Min/Max. *Apply* imposta il range manuale per quella specifica vista e porta la legenda su *manual*.

### F27 · Interazione sulla mappa (mirino e tooltip)
- **Dove**: sulla mappa
- **Cosa fa**:
  - **Passaggio del mouse**: un tooltip mostra il valore della cella.
  - **Clic in pianta**: sposta l'incrocio delle sezioni in quel punto.
  - **Clic in sezione**: sposta l'altra sezione e il livello.
  - **In pianta**, avvicinandosi a una linea di sezione compare una **maniglia**: trascinandola si ruotano le sezioni.
  - **In sezione**, una linea mostra il livello corrente. Con *Follow terrain* segue il profilo reale del taglio, a gradini.
- **Note**: il mirino è condiviso, quindi A, B e Diff si aggiornano insieme.

### F28 · Overlay degli oggetti 3D sulla mappa 2D
- **Dove**: toolbar › icona livelli 3D, con i sotto-interruttori **Buildings / Terrain / Vegetation**
- **Cosa fa**: sovrappone alla mappa le sagome di edifici, terreno e vegetazione, lette dal layer *Objects* dei risultati.
- **Note**:
  - L'opacità si regola in *View settings* (F31).
  - Lo stile grafico si sceglie in F32.

### F29 · Correzione delle sezioni biomet
- **Dove**: toolbar › icona terreno con correzione. Compare **solo** su dataset biomet (PMV, PET, SET, UTCI).
- **Cosa fa**: corregge un bug storico dell'export ENVI-met. Nei dataset biomet la colonna è "schiacciata" sul fondo del dominio; la correzione la ricolloca sopra edifici e terreno, in 2D, in 3D e nella serie temporale.
- **Note**: con la correzione attiva la quota mostrata riporta "· fix".

### F30 · Widget sulla mappa: nord, data, ora
- **Dove**: toolbar › icone *bussola*, *calendario*, *orologio*
- **Cosa fa**: sulla mappa compaiono:
  - la freccia del nord, ruotata secondo la rotazione del modello letta dall'INX;
  - il giorno della settimana con il giorno del mese;
  - l'ora dell'istante corrente.
- **Note**: sono **solo indicatori**, non comandi (vedi le incongruenze).

### F31 · View settings (2D)
- **Dove**: toolbar › icona ingranaggio
- **Cosa fa**:
  - **Object Style** (F32)
  - **Section line**: spessore (1–5 px), spaziatura del tratteggio (0–12 px) e colore della linea di sezione, con reset al colore del tema
  - **Objects opacity** dell'overlay oggetti, solo se F28 è attivo
  - **Legend**: valori intermedi sulla legenda; dimensione del testo della legenda (100–200%)
  - **Widgets**: dimensione dei widget nord, calendario e orologio (100–300%)

### F32 · Stile degli oggetti (condiviso tra 2D e 3D)
- **Dove**: View settings › *Object Style*
- **Cosa fa**: 4 stili grafici per edifici, terreno e vegetazione:

  | Stile | Aspetto |
  |---|---|
  | **Default** | voxel minimal |
  | **Style 1** | tecnico: edifici con contorno spesso e retino a 45°, vegetazione a cerchi proporzionati alla densità |
  | **Style 2** | bianco architettonico |
  | **Style 3** | silhouette e contorno; in 3D un unico contorno sull'intera scena |

### F33 · Campo di vento in 2D
- **Dove**:
  - toolbar › icona raffica
  - oppure sidebar › Wind › *Show wind field*
- **Cosa fa**: disegna il vento sulla pianta, sulle sezioni e sulle miniature, con una legenda che mostra da 1 a 5 valori di riferimento.
- **Serve**: un gruppo dati con le componenti *Flow u/v/w* (tipicamente `atmosphere`).
- **Note**: il valore di riferimento è **comune** ad A, B e a tutte le viste, quindi le lunghezze sono confrontabili ovunque.
- **Tasto**: `F`

### Scheda Wind (sidebar)

### F34 · Stile e parametri del vento
- **Dove**: sidebar › Wind
- **Cosa fa**:
  - **Style**:
    - *Arrows*: lunghezza proporzionale all'intensità;
    - *Streamlines*: linee di flusso con spessore proporzionale all'intensità;
    - *Combined*: streamline con piccole punte di direzione.
  - **Opacity**, **Size**, **Density**: 0–100%.
- **Note**: le stesse impostazioni valgono per il vento sulle fette in 3D e per il volume 3D.

### Scheda Palette (sidebar)

### F35 · Palette principale e di differenza
- **Dove**: sidebar › Palette › *Main palette*, *Difference palette*
- **Cosa fa**: menu a tendina con tre famiglie:
  - **Scientific**:
    - principali: Turbo, Viridis, Thermal, Coolwarm, Mono grey;
    - divergenti per la differenza: RdBu, PiYG, Warm-Cool.
  - **Catalog**: le 62 palette storiche di EnviReader 1.x (C1–C62).
  - **My palettes**: quelle create dall'utente.

  Ogni palette ha il pulsante **Reverse**.

### F36 · Ordine della differenza
- **Dove**: sidebar › Palette › *Difference order*
- **Cosa fa**: sceglie tra (A − B) e (B − A).

### F37 · Editor di palette
- **Dove**: sidebar › Palette › *Customize…*. Si parte sempre dalla palette visibile, compresa l'eventuale inversione.
- **Cosa fa**:
  - da 2 a 8 tappe di colore, ciascuna con il proprio selettore;
  - nome;
  - anteprima **dal vivo** sulle mappe;
  - *Save*, oppure *Copy code* per copiare il codice condivisibile.

  Le palette personali si possono modificare (✎) o eliminare (×) dal menu.
- **Note**: per la palette di differenza un suggerimento raccomanda un colore neutro al centro.

### F38 · Condividere le palette
- **Dove**: sidebar › Palette › *My palettes*
- **Cosa fa**:
  - **Import** ed **Export** su file JSON;
  - **Add from code…**: incolla un codice testuale `EVR1:hex-hex-…:Nome`, per scambiare una palette via chat o email.
- **Note**: le palette sono salvate nel browser e restano dopo la chiusura.

### Scheda Cursors (sidebar)

### F39 · Posizioni salvate (cursori)
- **Dove**: sidebar › Cursors
- **Cosa fa**: salva con un nome la posizione corrente del mirino:
  - sezione X e Y, angolo, livello;
  - *Follow terrain* e modalità di livellamento.

  Ogni cursore:
  - ha un **colore** modificabile;
  - si **richiama** con un clic;
  - si **rinomina** e si **elimina**.

  Un'icona terreno segnala i cursori salvati con *Follow terrain* attivo. Import ed Export avvengono su JSON.
- **Note**: ogni cursore aggiunge una propria curva alla serie temporale (F40). È il modo per confrontare più punti dello stesso modello nel tempo.

### Serie temporale (in fondo alle viste 2D e 3D)

### F40 · Serie temporale nel punto
- **Dove**: pannello *Time series* sotto le mappe, apribile e richiudibile
- **Cosa fa**: grafico dell'andamento nel tempo del dataset nel punto del mirino. Contiene:
  - la curva del **cursore live** per A (linea piena) e per B (linea tratteggiata);
  - una curva per ogni **cursore salvato**, del suo colore.

  Interazioni:
  - una linea verticale indica l'istante mostrato nelle mappe;
  - un crosshair segue il mouse, con un tooltip che riporta tutti i valori;
  - **cliccando sul grafico si salta a quell'istante**.

  L'intestazione mostra i nomi reali dei fileset dietro A e B.
- **Note**:
  - Le curve si interrompono dove non ci sono dati.
  - Un'icona terreno segnala le serie che seguono il terreno.
  - Se il mirino coincide con un cursore salvato, si vede una sola curva.

---

## 3. Vista *3D Data Analysis (beta)*

### F41 · Viewer del modello INX
- **Dove**: vista 3D
- **Cosa fa**: ricostruisce in 3D, dal file INX, edifici (2.5D o full 3D), terreno a voxel, vegetazione (letta dal layer *Objects*) e ricettori. Sopra il pannello compaiono le statistiche: griglia, risoluzione, altezza massima.
- **Serve**: il gruppo dati deve avere più livelli Z. Altrimenti il modello è bloccato e compare l'invito a scegliere un altro gruppo.
- **Note**:
  - Navigazione: trascinare per ruotare, rotella per lo zoom, pan.
  - La sidebar è la stessa del 2D.

### F42 · Layer del modello
- **Dove**: toolbar 3D › *Model layers*
- **Cosa fa**: attiva e disattiva:
  - **Edifici** (`B`)
  - **Vegetazione** (`V`)
  - **Terreno** (`T`)
  - **Ricettori** (`R`)
  - **Griglia di calcolo**: pareti del dominio con le quote di larghezza, profondità e altezza. Le due pareti più vicine alla camera si nascondono da sole e le quote restano sempre in primo piano.

### F43 · Overlay dei dati in 3D (Data overlay)
- **Dove**: toolbar 3D › *Data overlay*, con i sotto-interruttori:
  - *Plan*
  - *Longitudinal section*
  - *Transverse section*
  - *Smooth surface*
- **Cosa fa**: disegna il dataset corrente, con la stessa palette del 2D, come piano e/o sezioni dentro il modello. Con *Follow terrain* la pianta drappeggia il terreno.
  - **Smooth surface** spento: un voxel per cella, a gradini.
  - **Smooth surface** acceso (default): superficie continua a piani inclinati.

  È solo un effetto visivo: il colore resta quello esatto della cella.
- **Note**:
  - Con lo stile **Contour** (F45) la superficie diventa a fasce con **isolinee 3D** esatte.
  - Gli edifici nascondono correttamente le parti di fetta che stanno dietro.
- **Tasto**: `O`

### F44 · Legenda 3D
- **Dove**: toolbar 3D › *Legend* (solo con l'overlay attivo); barra della legenda sotto ogni pannello
- **Cosa fa**: gli ambiti disponibili sono solo *fileset*, *all filesets* (default) e *manual*: c'è una sola legenda per tutti i piani attivi. Cliccando la legenda si imposta il range manuale (come F26).
- **Note**: come in 2D, gli ambiti automatici valgono per l'istante corrente e si ricalcolano a ogni passo; per confrontare ore diverse serve il range manuale.

### F45 · Pixel/Contour e HD in 3D
- **Dove**: toolbar 3D › *Pixel* / *Contour*, icona *HD*
- **Cosa fa**:
  - lo stile di resa è condiviso con il 2D (Vector non c'è);
  - **HD 3D** alza antialiasing e densità di pixel. È spento di default perché pesa sulla GPU.

### F46 · Interazione nel 3D: mirino e rotazione delle sezioni
- **Dove**: clic e trascinamento sul modello
- **Cosa fa**:
  - **clic sul terreno**: sposta l'incrocio delle sezioni, come in pianta 2D;
  - **trascinamento vicino a una traccia di sezione**: ruota le sezioni senza muovere la camera;
  - **altrove**: il trascinamento orbita la camera.
- **Note**: il livello non cambia mai cliccando; resta legato allo slider o a `↑` / `↓`.

### F47 · ViewCube (gizmo di orientamento)
- **Dove**: angolo in alto a destra del viewer
- **Cosa fa**:
  - un cubo con le facce etichettate e un anello dei punti cardinali, che segue la camera;
  - **cliccando una faccia, uno spigolo o un vertice** la camera si allinea con un'animazione;
  - pulsanti **Home** (vista iniziale) e **ruota di 90°** a sinistra e a destra.
- **Tasto**: `1` / `2` / `3` per alto, destra, fronte

### F48 · View settings (3D)
- **Dove**: toolbar 3D › ingranaggio
- **Cosa fa**:
  - **Object Style** (F32)
  - **Wireframe**
  - **Ambient occlusion (AO)**, attiva di default
  - **Projection**: prospettica oppure parallela (ortografica)
  - **Gizmo north reference**:
    - *True north*: nord geografico, tenendo conto della rotazione del modello;
    - *Grid*: lato piatto del modello, con lettere F/L/B/R al posto di N/E/S/W.
  - Opzioni della legenda e dimensione dei widget, come in 2D

### F49 · Confronto A/B in 3D con camere sincronizzate
- **Dove**: toolbar 3D › *Only A* / *Only B* / *A vs B*; icona *Sync* (solo in A vs B)
- **Cosa fa**:
  - due modelli affiancati;
  - con **Sync**, muovere la camera in un pannello la muove anche nell'altro, con un inseguimento fluido;
  - funzionano allo stesso modo i clic sul ViewCube.
- **Note**:
  - In 3D non esiste la Diff.
  - Rotazione, zoom e pan sono sincronizzati in proporzione all'inquadratura di ciascun modello. Prima di registrare, verificare a schermo (vedi le incongruenze).
- **Tasto**: `C`

### F50 · Simulazione solare e ombre
- **Dove**: toolbar 3D › icona sole
- **Cosa fa**:
  - una **luce solare** con **ombre portate** su edifici, vegetazione e terreno, posizionata secondo data e ora dell'istante corrente;
  - il **diagramma solare** sul modello:
    - una bussola a terra;
    - la **rete annuale**: archi mensili e analemmi orari;
    - l'**arco del giorno** corrente evidenziato;
    - il marcatore del sole.
  - badge con **azimut** e **altezza** del sole.

  Scorrendo il tempo o premendo play, il sole e le ombre si muovono.
- **Serve**:
  - coordinate geografiche nell'INX; senza compare un avviso;
  - per i video usare il dataset georeferenziato.
- **Note**:
  - Il fuso orario è stimato dalla longitudine.
  - Senza risultati caricati usa la giornata odierna.
  - I colori dei dati non vengono ombreggiati e restano fedeli alla legenda.
- **Tasto**: `S`

### F51 · Vento in 3D: sulle fette e volumetrico
- **Dove**:
  - toolbar 3D › pulsante a ciclo *Wind display*: off → 2D field → 3D volume → off
  - oppure sidebar › Wind (in 3D compare anche *Show wind volume*)
- **Cosa fa**:
  - **Sulle fette** (2D field): frecce o streamline sui piani dell'overlay dati.
  - **Volume 3D**: frecce e streamline che riempiono l'intero spazio 3D, a partire dalle componenti u, v, w. Il calcolo avviene in background e durante l'elaborazione compare "Calculating wind volume…".

  Sotto il pannello c'è una legenda del vento.
- **Serve**: le componenti *Flow u/v/w*.
- **Note**:
  - Le due modalità sono **mutuamente esclusive**.
  - Accendendo il vento sulle fette in 3D, l'app accende da sola *Data overlay* e *Smooth surface*.
  - Spegnendo uno dei due, il vento si sospende e torna quando entrambi sono di nuovo attivi.
  - Il colore del vento segue il tema.
- **Tasto**: `F` / `Shift+F`

### F52 · Ricettori: grafici dei dati
- **Dove**: vista 3D, con il layer Ricettori attivo (`R`); **clic su un ricettore**
- **Cosa fa**: apre una finestra con un grafico temporale per **ogni variabile** del file del ricettore. Se il ricettore ha più quote, un selettore permette di scegliere l'**altezza (z)**.
- **Serve**: i file di output dei ricettori nel fileset.
- **Note**:
  - Si apre solo dal 3D.
  - I testi della finestra non sono tradotti (vedi le incongruenze).

### F53 · Widget data e ora in 3D
- **Dove**: toolbar 3D › calendario, orologio
- **Cosa fa**: gli stessi indicatori del 2D, sovrapposti al viewer.

---

## 4. Vista *WebGIS (alpha)*

### F60 · Modello 3D su mappa geografica
- **Dove**: vista WebGIS
- **Cosa fa**: posiziona il modello 3D (con lo stesso stile degli oggetti) nella sua posizione reale su una mappa navigabile in prospettiva.
- **Serve**:
  - coordinate nell'INX; senza compare un messaggio;
  - più livelli Z nel gruppo dati.
- **Note**:
  - Usa **solo il fileset A**.
  - La georeferenziazione preferisce le coordinate UTM precise dell'INX (`realworldLowerLeft`), altrimenti usa longitudine e latitudine arrotondate.

### F61 · Layer e overlay dati sulla mappa
- **Dove**: toolbar WebGIS › *Model layers*, *Data overlay* (Plan / Longitudinal / Transverse)
- **Cosa fa**: gli stessi layer e lo stesso overlay del 3D, sopra la mappa. La legenda segue l'ambito 3D.
- **Note**: qui non ci sono vento, sole, zebra né confronto.

### F62 · Calibrazione della georeferenziazione
- **Dove**: toolbar WebGIS › *Georeferencing calibration*
- **Cosa fa**:
  - **offset Est e Nord** in metri;
  - **rotazione** in gradi;
  - *Invert rotation direction*;
  - punti di riferimento rapidi: *Reset*, *SW corner*, *NE corner*.

  La calibrazione viene **salvata per sito** e riproposta alla riapertura dello stesso progetto.

### F63 · Mappa di sfondo
- **Dove**: toolbar WebGIS › *Basemap* › attiva/disattiva
- **Cosa fa**: mappa vettoriale in stile Toner (bianco e nero) di OpenFreeMap.
- **Note**: senza consenso, il modello compare su uno sfondo neutro.

### F64 · Consenso alla mappa
- **Dove**: finestra al primo uso della mappa
- **Cosa fa**: spiega che OpenFreeMap vede l'IP e l'area consultata, e permette di accettare o rifiutare. Il consenso dura 6 mesi e si può revocare dal pannello Privacy.

---

## 5. Vista *Boundary conditions*

### F70 · Impostazioni della simulazione (SIMX)
- **Dove**: vista Boundary › scheda *Simulation settings (SIMX)*
- **Cosa fa**: mostra in chiaro:
  - nome della simulazione, file INX, inizio e durata;
  - vento a 10 m e direzione, rugosità z0;
  - temperatura iniziale, umidità specifica e relativa;
  - limiti e accuratezza del vento, cartella di output, scenario.

  Per il Full Forcing mostra quali grandezze sono forzate: T, umidità, vento, precipitazioni, radiazione, profilo verticale di T, nudging con fattore. Le altre sezioni del SIMX stanno in un riquadro espandibile.
- **Serve**: il SIMX nel fileset.

### F71 · Simple Forcing
- **Cosa fa**: se la simulazione usa il Simple Forcing, mostra i grafici orari di **temperatura** e **umidità** scritti nel SIMX. Se la serie oraria non c'è, mostra una nota sui valori costanti.

### F72 · Full Forcing (file FOX)
- **Cosa fa**:
  - scheda con località, latitudine e longitudine, fuso, altitudine, periodo coperto, numero di passi e versione del file;
  - un **grafico panoramico** della temperatura;
  - un grafico per ogni grandezza presente:
    - temperatura, umidità specifica;
    - velocità e direzione del vento;
    - radiazione diretta, diffusa e a onde lunghe;
    - precipitazioni, pressione;
    - nuvolosità bassa, media e alta;
    - **un grafico per ogni inquinante di fondo**.

  Fino a 3 quote per grandezza, ognuna con un colore. Anche i file annuali da 8760 ore si leggono, perché il grafico mostra l'inviluppo min–max.
- **Serve**: il FOX. Se il SIMX lo cita ma il file non è nella cartella, compare il pulsante **Open FOX file…** per caricarlo a mano.

### F73 · Selezione del periodo
- **Dove**: toolbar Boundary › *Period*; brush sul grafico panoramico
- **Cosa fa**: il periodo dei grafici FOX può essere:
  - *Simulation period* (default, con la durata indicata);
  - *Whole file*;
  - un singolo **mese**;
  - *Manual selection*: si **trascina sul grafico panoramico**, e con un doppio clic si azzera.

### F74 · Zoom e scelta del fileset
- **Dove**: toolbar Boundary › *View zoom*, selettore A/B, indicatore Simple o Full Forcing (con tooltip)
- **Cosa fa**: ingrandisce i grafici fino a una colonna e alterna le condizioni al contorno di A e di B.

---

## 6. Export (*Save charts*)

### F80 · Esportazione di mappe e grafici
- **Dove**: barra in alto › *Save charts*
- **Cosa fa**: si sceglie quali mappe esportare (Only A / Only B / A vs B / A vs B vs Diff) e poi le opzioni:

  | Opzione | Risultato |
  |---|---|
  | **ZIP** | tutto in un unico archivio (default) |
  | Sottocartelle | `PNGs/`, `SVGs/`, `Data/`, `Boundary_Charts/` |
  | **PNG** | sempre, per **pianta e sezioni** di ogni mappa scelta, all'istante corrente |
  | **SVG ibrido** | mappa raster incorporata, con testi, legenda, linee di sezione e widget vettoriali, modificabili in Illustrator o Inkscape |
  | **SVG della serie temporale** | sempre incluso, se presente |
  | **SVG delle condizioni al contorno** | con il periodo scelto in F73 |
  | **GIF animata** | l'andamento su tutti gli istanti, con fps regolabili |
  | **Dati numerici** | in **CSV/testo** o **Excel (XLSX)**, con un numero di decimali scelto |

  I dati numerici:
  - senza GIF riguardano l'istante corrente;
  - con GIF coprono tutti gli istanti, un foglio per istante.
- **Serve**: almeno un fileset aperto.
- **Note**:
  - L'export **passa sempre alla vista 2D** e alla fine ripristina vista, tempo e confronto.
  - Le immagini hanno larghezza fissa di 1200 px, indipendente dallo schermo.
  - **Non si esporta nulla dal 3D né dal WebGIS.**
  - I nomi dei file sono descrittivi: simulazione, dataset, vista, istante.

---

## 7. Preset

### F90 · Preset predefiniti
- **Dove**: sidebar › Presets › *Built-in presets*
- **Cosa fa**: 15 preset, cioè 5 variabili per 3 momenti della giornata (*Morning* 08:00, *Afternoon* 14:00, *Evening* 20:00):

  | Variabile | Gruppo dati | Palette |
  |---|---|---|
  | Air temperature | `atmosphere` | C61 |
  | Wind | `atmosphere` | C53, con il vento acceso |
  | Relative humidity | `atmosphere` | C25 |
  | Radiant temp. (MRT) | `atmosphere` | C29 |
  | UTCI | `biomet/UTCI` | C45 |

  Tutti usano livello 0, *Follow terrain*, legenda *across views* e C62 come palette di differenza.
- **Note**:
  - L'ora viene applicata scegliendo l'**istante più vicino** a quell'ora del giorno, al primo giorno a parità di distanza.
  - Se il fileset non ha quel gruppo o quella variabile, quei campi vengono **ignorati senza avviso**.

### F91 · Preset personali
- **Dove**: sidebar › Presets › *My presets*
- **Cosa fa**: *Save preset* fotografa lo stato corrente con un nome. I preset si applicano con un clic, si rinominano (✎) e si eliminano (×). Restano salvati nel browser.
- **Cosa salva un preset**:
  - gruppo dati, dataset;
  - l'**ora del giorno**, oppure l'indice se l'etichetta non ha ora;
  - livello, sezione X e Y, angolo;
  - *Follow terrain*, modalità e altezza di livellamento;
  - vento: acceso o spento, stile, opacità, dimensione, densità;
  - ambito della legenda;
  - palette e palette di differenza, con le relative inversioni.
- **Cosa NON salva**:
  - stile di resa (Pixel/Contour/Vector) e HD;
  - zebra;
  - modalità di confronto;
  - tipo di vista (pianta o sezione);
  - stile degli oggetti;
  - opzioni della legenda e dei widget;
  - range manuali;
  - correzione biomet e overlay degli oggetti;
  - **tutte le opzioni 3D**.
- Quando si applica un preset con il vento acceso, l'app attiva anche l'overlay dati e la superficie liscia, per il 3D.

### F92 · Condividere i preset
- **Dove**: sidebar › Presets › *Import presets from file* / *Export my presets*
- **Cosa fa**:
  - l'export in JSON **include le palette personali** usate dai preset, così chi importa riceve anche i colori;
  - l'import accetta anche il vecchio `preset.json` di EnviReader 1.x, mappando le palette sul catalogo C1–C62.

---

## 8. Ordine suggerito per i video

L'ordine segue le dipendenze: ogni video usa solo cose già spiegate.

1. **Introduzione e privacy**: F06, F07, interfaccia generale (sezione 0), F03, F04
2. **Aprire una simulazione**: F01, gruppi dati e dataset (F10)
3. **Leggere una mappa 2D**: F21, F27 (tooltip e mirino), F22, F30
4. **Il tempo**: F11, F12, F40 (serie temporale e clic per saltare)
5. **Sezioni e terreno**: F13, F14, F15, F16, F17, F29
6. **Colori e scala**: F35, F25, F26, F37, F38
7. **Stile di resa e overlay oggetti**: F23, F24, F28, F31, F32
8. **Zebra**: F18
9. **Vento in 2D**: F33, F34
10. **Confronto A/B e differenza**: F02, F20, F36
11. **Cursori**: F39, con F40
12. **Preset**: F90, F91, F92
13. **3D: navigazione**: F41, F42, F47, F48
14. **3D: dati nel modello**: F43, F44, F45, F46
15. **3D: confronto e camere sincronizzate**: F49
16. **Sole e ombre**: F50
17. **Vento 3D**: F51
18. **Ricettori**: F52
19. **WebGIS**: F60–F64
20. **Condizioni al contorno**: F70–F74
21. **Export**: F80
22. **Scorciatoie**, come riepilogo finale: F05

Per i video su sole (16) e WebGIS (19) serve il dataset con coordinate UTM nell'INX.

---

## 9. Incongruenze trovate

Da correggere nel codice o nella documentazione **prima** di registrare: un video costruito sui testi attuali mostrerebbe comportamenti diversi da quelli descritti.

1. **`docs/keyboard_shortcuts.txt` è obsoleto** (il README lo linka). Rispetto al codice (`src/App.jsx`):
   - `W` non fa nulla;
   - `S` attiva il sole, non sposta la sezione;
   - `M` non esiste;
   - `A` alterna 2D e 3D;
   - mancano `G`, `E` e `Shift+?`;
   - `↑` / `↓` spostano sempre e solo il livello, non le sezioni.

   Il pannello in app (`ShortcutsModal`) è invece corretto. La tabella in F05 segue il codice.
2. **Calendario e orologio**: l'aiuto dice che si possono usare per cambiare giorno o ora "direttamente dalla vista". In realtà `MapCalendar`/`MapClock` sono solo indicatori, non cliccabili.
3. **Griglia di calcolo (3D)**: l'aiuto parla di una "griglia di riferimento a terra". `buildGrid` disegna invece le pareti del dominio con le quote. Verificare a schermo e riscrivere l'aiuto.
4. **Camere sincronizzate**: tre descrizioni non coincidono.
   - L'etichetta dice "Sync rotation".
   - L'aiuto dice rotazione, pan e zoom.
   - Un commento in `AppStateContext` dice che zoom e pan restano indipendenti.

   Il codice del viewer sincronizza rotazione, zoom e pan in modo proporzionale. Verificare prima del video.
5. **Testi non tradotti**:
   - in `ReceptorModal`: "Receptor:", "Altezza (z)", "Loading...", "No data found…", "No numeric data found.";
   - i giorni della settimana del calendario sono fissi in inglese (Sun, Mon, …).
6. **Testi residui**:
   - la chiave `webgis_basemap_satellite` è rimasta, ma il satellite è stato rimosso;
   - `ts_caption` dice ancora "(coming soon)", ma la serie temporale esiste.
7. **Messaggi di avanzamento dell'export** in inglese fisso ("Capturing current maps...", "Rendering frame…").
