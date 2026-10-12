// Testo dell'informativa privacy (inglese e italiano). Descrive ciò che l'app
// fa DAVVERO: se cambia un servizio di terzi, un valore in localStorage o una
// finalità, cambia questo file nello stesso commit. `npm run audit:privacy`
// (scripts/privacy-audit.mjs) fallisce se nel codice compare un host o una
// chiave di storage che qui non è dichiarata.
//
// Punti di rete da tenere allineati:
//   src/lib/mapStyle.js     OpenFreeMap, solo dopo consenso (mapConsent.js)
//   hosting                 GitHub Pages (.github/workflows/pages.yml)
//
// Markup inline: **grassetto**, `codice`, [testo](indirizzo).

export const PRIVACY_UPDATED = '2026-10';
export const CONTACT_EMAIL_OBFUSCATED = 'graziano.marchesani [at] unicam.it';

// Chiavi di localStorage dichiarate (il prefisso `envireader.webgisCalibration.`
// copre una chiave per ogni modello). Usato anche da scripts/privacy-audit.mjs.
export const STORAGE_KEYS = [
  'envireader.lang.v1',
  'envireader.theme.v1',
  'envireader.customPalettes.v1',
  'envireader.customPresets.v1',
  'envireader.positionCursors.v1',
  'envireader.positionBookmarks.v1',
  'envireader.mapConsent.v1',
];
export const STORAGE_PREFIXES = ['envireader.webgisCalibration.'];

const en = {
  title: 'Privacy notice',
  updatedLabel: 'Last updated',
  updated: 'October 2026',
  sections: [
    {
      h: 'In short',
      blocks: [
        { p: 'EnviReader reads and draws your ENVI-met files **entirely in your browser**. Nothing you open — EDX/EDT result files, INX models, SIMX or FOX files, coordinates, names, values — is uploaded to a server. The app sets no cookies, runs no analytics, carries no advertising and does not profile its visitors. Scripts, fonts, styles and libraries are all served from this same site: no third-party script, font or CDN is loaded.' },
        { p: 'One feature reaches third parties, and **it stays off until you accept it**: the background map of the Web GIS view. If you accept, the map service receives **your IP address** and can tell roughly **where on Earth your model is located**, because every map tile you look at is requested by position. If you decline, the 3D model is shown on a plain background and the rest of the app works the same.' },
        { p: 'If the location of your project is confidential, decline the map (or run EnviReader on your own computer, see the README).' },
      ],
    },
    { choice: true },
    {
      h: '1. Data controller',
      blocks: [
        { p: 'The controller is **Graziano Enzo Marchesani**, acting as a natural person. Contact: **{EMAIL}** (replace `[at]` with `@`).' },
        { p: 'This is an independent research project. **It is not an institutional site: the University of Camerino does not operate it or determine the purposes of the processing described here. It is also not affiliated with, endorsed by or supported by ENVI-met GmbH.** No Data Protection Officer has been appointed.' },
      ],
    },
    {
      h: '2. What stays on your device',
      blocks: [
        { ul: [
          '**Your simulation files** are read locally, through the folder picker of your browser, and kept in memory. They are gone when you close or reload the tab. The app never writes to your folders.',
          '**Model coordinates and names.** The INX model contains the geographic position of the site and project names. They are used only on your device — for the sun position, the 3D view and, if you accepted it, to centre the map.',
          '**Exports** (images, SVG, GIF, Excel, CSV, ZIP) are generated in your browser and saved by you. Where they show other people’s property or people, you are responsible for how you use them.',
          '**The clipboard** is written only when you press “copy” on a palette code.',
          '**No telemetry.** No analytics, error reporting, tracking pixel, advertising or social-media widget; no request carries your data to the controller or to anyone else.',
        ] },
      ],
    },
    {
      h: '3. What is stored in your browser',
      blocks: [
        { p: 'The app uses **no cookies**. It writes a few values to `localStorage` — all of them on your device only, never sent anywhere, and all of them either needed to remember a choice you made or created by you. You can delete them from the panel above (“Delete stored data”) or from your browser settings.' },
        { table: {
          head: ['Key', 'Content', 'Why'],
          rows: [
            ['`envireader.lang.v1`', 'Interface language', 'Remember your choice'],
            ['`envireader.theme.v1`', 'Light or dark theme', 'Remember your choice'],
            ['`envireader.customPalettes.v1`', 'Colour palettes you create', 'Keep your own work'],
            ['`envireader.customPresets.v1`', 'View presets you save', 'Keep your own work'],
            ['`envireader.positionCursors.v1`, `envireader.positionBookmarks.v1`', 'Crosshair positions you save (the second is the name used by older versions)', 'Keep your own work'],
            ['`envireader.webgisCalibration.<model name>`', 'Manual offset and rotation you set to align a model on the map; the key contains the location name written in the INX file', 'Keep your own work'],
            ['`envireader.mapConsent.v1`', 'Your answer about the background map, with the date; it expires after six months and then you are asked again', 'Remember your choice'],
          ],
        } },
        { p: 'They identify nobody and are not used for tracking, so under Article 122 of the Italian Privacy Code and the ePrivacy Directive they are technical storage and need no consent. They are listed here because you are entitled to know.' },
      ],
    },
    {
      h: '4. Services contacted by the page',
      blocks: [
        { p: 'Each service below receives what any web request carries: your **IP address**, browser information (user agent) and the time. The page asks browsers not to send the address of this site (referrer) with requests. None of them receives your files, values, names or any other content.' },
        { table: {
          head: ['Service', 'Why', 'When'],
          rows: [
            ['GitHub Pages (GitHub, Inc.)', 'Hosts the app (code, translations, styles). Keeps standard access logs.', 'Every visit — unavoidable: it is where the page comes from'],
            ['[OpenFreeMap](https://openfreemap.org)', 'Street-map vector tiles and map fonts for the Web GIS. Each tile request encodes a map position and zoom, so, with your IP address, the provider can tell **which area you are looking at**.', '**Only after you accept** the background map, in the Web GIS view'],
          ],
        } },
        { ul: [
          '**Purposes:** delivering the page; drawing the background map when you ask for it.',
          '**Legal basis:** for the map, your **consent**, Article 6(1)(a) GDPR, which you can withdraw at any time from the box at the top of this notice (withdrawal does not undo requests already made). For hosting, the controller’s legitimate interest in providing a working service, Article 6(1)(f); the controller has no access to the hosting logs and uses them for nothing.',
          '**Transfers outside the EU.** GitHub is a US company; hosting relies on the EU–US Data Privacy Framework and standard contractual clauses where applicable. OpenFreeMap is run by an independent operator and its servers may be outside the EU. By accepting the map you expressly consent to the transfer of your IP address and of the map positions you view, Article 49(1)(a) GDPR, knowing that the countries involved may not offer a level of data protection equivalent to the EU’s; the consent box tells you this before you accept.',
          '**Not collected by the controller:** the controller runs no server and receives neither your IP address nor anything else about you; the logs above stay with the providers, each of which acts as an independent controller under its own policy.',
          '**If you decline:** nothing is requested from OpenFreeMap; the 3D model, data overlays, charts, statistics and exports work the same.',
          '**Links.** The app links to its GitHub repository, and the map credits link to the map data sources. Nothing is contacted until you click, and those sites have their own policies.',
        ] },
      ],
    },
    {
      h: '5. Retention',
      blocks: [
        { p: 'The controller keeps no copy of anything you open. Hosting and map-provider logs are kept by those providers according to their own policies. The values in section 3 stay on your device until you delete them (the map answer expires by itself after six months).' },
      ],
    },
    {
      h: '6. Your rights',
      blocks: [
        { p: 'You may exercise the rights in Articles 15–22 GDPR (access, rectification, erasure, restriction, portability, objection) by writing to the address above; you will get a reply within one month. As the controller holds no data about you beyond what is described here, most requests must be addressed to the providers in section 4. You may lodge a complaint with the Italian data protection authority, the [Garante per la protezione dei dati personali](https://www.garanteprivacy.it), or with the authority of your country.' },
        { p: 'No profiling or automated decision-making within the meaning of Article 22 GDPR takes place. The app is not directed at children under fourteen.' },
      ],
    },
    {
      h: '7. Changes and verification',
      blocks: [
        { p: 'This notice is updated when the app or the law changes; the date at the top shows the latest revision. The source code is public at [github.com/grazianoEnzoMarchesani/EnviReader](https://github.com/grazianoEnzoMarchesani/EnviReader), so every statement above can be checked; an automatic check (`npm run audit:privacy`) fails the build if the code contacts a host or stores a key that is not declared here.' },
      ],
    },
  ],
  ui: {
    choiceTitle: 'Your choice',
    mapLabel: 'Background map (OpenFreeMap)',
    mapOn: 'on',
    mapOff: 'off',
    mapUnset: 'not chosen yet',
    turnOff: 'Turn off',
    turnOn: 'Accept and turn on',
    clearTitle: 'Stored data',
    clearText: 'Remove every value EnviReader stored in this browser (language, theme, palettes, presets, saved positions, map choice). The page reloads and any file you opened is closed.',
    clearButton: 'Delete stored data',
    clearConfirm: 'Delete all EnviReader data stored in this browser? The page will reload.',
    close: 'Close',
  },
};

const it = {
  title: 'Informativa sulla privacy',
  updatedLabel: 'Ultimo aggiornamento',
  updated: 'ottobre 2026',
  sections: [
    {
      h: 'In breve',
      blocks: [
        { p: 'EnviReader legge e disegna i tuoi file ENVI-met **interamente nel tuo browser**. Niente di ciò che apri — file di risultati EDX/EDT, modelli INX, file SIMX o FOX, coordinate, nomi, valori — viene caricato su un server. L’app non imposta cookie, non usa strumenti di analisi, non ha pubblicità e non profila i visitatori. Script, caratteri, stili e librerie sono tutti serviti da questo stesso sito: non viene caricato nessuno script, carattere o CDN di terzi.' },
        { p: 'Una funzione raggiunge terze parti, e **resta spenta finché non la accetti**: la mappa di sfondo della vista Web GIS. Se accetti, i servizi di mappa ricevono **il tuo indirizzo IP** e possono capire all’incirca **in che punto della Terra si trova il tuo modello**, perché ogni tassello di mappa che guardi viene richiesto per posizione. Se rifiuti, il modello 3D è mostrato su uno sfondo neutro e il resto dell’app funziona uguale.' },
        { p: 'Se la posizione del tuo progetto è riservata, rifiuta la mappa (oppure usa EnviReader sul tuo computer, vedi il README).' },
      ],
    },
    { choice: true },
    {
      h: '1. Titolare del trattamento',
      blocks: [
        { p: 'Titolare è **Graziano Enzo Marchesani**, persona fisica. Contatto: **{EMAIL}** (sostituisci `[at]` con `@`).' },
        { p: 'È un progetto di ricerca indipendente. **Non è un sito istituzionale: l’Università di Camerino non lo gestisce né determina le finalità dei trattamenti qui descritti. Non è inoltre affiliato, approvato o supportato da ENVI-met GmbH.** Non è stato nominato un Responsabile della protezione dei dati.' },
      ],
    },
    {
      h: '2. Cosa resta sul tuo dispositivo',
      blocks: [
        { ul: [
          '**I file di simulazione** sono letti in locale, tramite il selettore di cartelle del browser, e tenuti in memoria. Spariscono quando chiudi o ricarichi la scheda. L’app non scrive mai nelle tue cartelle.',
          '**Coordinate e nomi del modello.** Il modello INX contiene la posizione geografica del sito e i nomi di progetto. Sono usati solo sul tuo dispositivo — per la posizione del sole, la vista 3D e, se hai accettato, per centrare la mappa.',
          '**Le esportazioni** (immagini, SVG, GIF, Excel, CSV, ZIP) sono generate nel browser e salvate da te. Se mostrano proprietà o persone altrui, l’uso che ne fai è una tua responsabilità.',
          '**Gli appunti** vengono scritti solo quando premi “copia” su un codice palette.',
          '**Nessuna telemetria.** Niente analytics, segnalazione errori, pixel di tracciamento, pubblicità o widget social; nessuna richiesta porta i tuoi dati al titolare o ad altri.',
        ] },
      ],
    },
    {
      h: '3. Cosa viene memorizzato nel browser',
      blocks: [
        { p: 'L’app **non usa cookie**. Scrive alcuni valori in `localStorage` — solo sul tuo dispositivo, mai inviati altrove, e tutti necessari a ricordare una tua scelta o creati da te. Puoi cancellarli dal pannello qui sopra (“Cancella i dati memorizzati”) o dalle impostazioni del browser.' },
        { table: {
          head: ['Chiave', 'Contenuto', 'Perché'],
          rows: [
            ['`envireader.lang.v1`', 'Lingua dell’interfaccia', 'Ricordare la tua scelta'],
            ['`envireader.theme.v1`', 'Tema chiaro o scuro', 'Ricordare la tua scelta'],
            ['`envireader.customPalettes.v1`', 'Palette di colori che crei', 'Conservare il tuo lavoro'],
            ['`envireader.customPresets.v1`', 'Preset di vista che salvi', 'Conservare il tuo lavoro'],
            ['`envireader.positionCursors.v1`, `envireader.positionBookmarks.v1`', 'Posizioni del mirino che salvi (la seconda è il nome usato dalle versioni precedenti)', 'Conservare il tuo lavoro'],
            ['`envireader.webgisCalibration.<nome modello>`', 'Spostamento e rotazione manuali impostati per allineare un modello sulla mappa; la chiave contiene il nome della località scritto nel file INX', 'Conservare il tuo lavoro'],
            ['`envireader.mapConsent.v1`', 'La tua risposta sulla mappa di sfondo, con la data; scade dopo sei mesi e ti viene richiesta di nuovo', 'Ricordare la tua scelta'],
          ],
        } },
        { p: 'Non identificano nessuno e non servono al tracciamento: ai sensi dell’art. 122 del Codice privacy e della direttiva ePrivacy sono archiviazione tecnica e non richiedono consenso. Sono elencati perché hai diritto di saperlo.' },
      ],
    },
    {
      h: '4. Servizi contattati dalla pagina',
      blocks: [
        { p: 'Ogni servizio qui sotto riceve ciò che porta con sé qualsiasi richiesta web: il tuo **indirizzo IP**, le informazioni del browser (user agent) e l’orario. La pagina chiede ai browser di non inviare l’indirizzo di questo sito (referrer) con le richieste. Nessuno riceve i tuoi file, valori, nomi o altro contenuto.' },
        { table: {
          head: ['Servizio', 'Perché', 'Quando'],
          rows: [
            ['GitHub Pages (GitHub, Inc.)', 'Ospita l’app (codice, traduzioni, stili). Conserva i normali log di accesso.', 'A ogni visita — inevitabile: è da lì che arriva la pagina'],
            ['[OpenFreeMap](https://openfreemap.org)', 'Tasselli vettoriali della mappa stradale e caratteri per il Web GIS. Ogni richiesta di tassello codifica posizione e zoom, quindi, con il tuo IP, il fornitore può capire **quale zona stai guardando**.', '**Solo dopo che accetti** la mappa di sfondo, nella vista Web GIS'],
          ],
        } },
        { ul: [
          '**Finalità:** consegnare la pagina; disegnare la mappa di sfondo quando lo chiedi.',
          '**Base giuridica:** per la mappa, il tuo **consenso**, art. 6(1)(a) GDPR, revocabile in ogni momento dal riquadro in cima a questa informativa (la revoca non annulla le richieste già fatte). Per l’hosting, il legittimo interesse del titolare a fornire un servizio funzionante, art. 6(1)(f); il titolare non ha accesso ai log dell’hosting e non li usa per nulla.',
          '**Trasferimenti extra-UE.** GitHub è una società statunitense; l’hosting si basa sull’EU–US Data Privacy Framework e, dove applicabile, sulle clausole contrattuali standard. OpenFreeMap è gestito da un operatore indipendente e i suoi server possono trovarsi fuori dall’UE. Accettando la mappa acconsenti espressamente al trasferimento del tuo indirizzo IP e delle posizioni di mappa che guardi, art. 49(1)(a) GDPR, sapendo che i Paesi coinvolti possono non offrire un livello di protezione dei dati equivalente a quello dell’UE; la finestra del consenso te lo dice prima che tu accetti.',
          '**Non raccolto dal titolare:** il titolare non gestisce alcun server e non riceve né il tuo IP né altro su di te; i log sopra restano ai fornitori, ciascuno titolare autonomo secondo la propria policy.',
          '**Se rifiuti:** non viene richiesto nulla a OpenFreeMap; il modello 3D, le sovrapposizioni di dati, i grafici, le statistiche e le esportazioni funzionano uguale.',
          '**Link.** L’app rimanda al suo repository GitHub, e i crediti della mappa rimandano alle fonti dei dati cartografici. Nulla viene contattato finché non clicchi, e quei siti hanno le loro policy.',
        ] },
      ],
    },
    {
      h: '5. Conservazione',
      blocks: [
        { p: 'Il titolare non conserva copia di nulla di ciò che apri. I log di hosting e dei fornitori di mappe sono conservati da quei fornitori secondo le proprie policy. I valori della sezione 3 restano sul tuo dispositivo finché non li cancelli (la risposta sulla mappa scade da sola dopo sei mesi).' },
      ],
    },
    {
      h: '6. I tuoi diritti',
      blocks: [
        { p: 'Puoi esercitare i diritti degli artt. 15–22 GDPR (accesso, rettifica, cancellazione, limitazione, portabilità, opposizione) scrivendo all’indirizzo sopra; riceverai risposta entro un mese. Poiché il titolare non detiene dati su di te oltre a quanto descritto, la maggior parte delle richieste va rivolta ai fornitori della sezione 4. Puoi proporre reclamo al [Garante per la protezione dei dati personali](https://www.garanteprivacy.it) o all’autorità del tuo Paese.' },
        { p: 'Non avviene alcuna profilazione né decisione automatizzata ai sensi dell’art. 22 GDPR. L’app non è rivolta ai minori di quattordici anni.' },
      ],
    },
    {
      h: '7. Modifiche e verifica',
      blocks: [
        { p: 'Questa informativa è aggiornata quando cambiano l’app o la legge; la data in alto indica l’ultima revisione. Il codice sorgente è pubblico su [github.com/grazianoEnzoMarchesani/EnviReader](https://github.com/grazianoEnzoMarchesani/EnviReader), quindi ogni affermazione qui sopra è verificabile; un controllo automatico (`npm run audit:privacy`) fa fallire la build se il codice contatta un host o memorizza una chiave non dichiarati qui.' },
      ],
    },
  ],
  ui: {
    choiceTitle: 'La tua scelta',
    mapLabel: 'Mappa di sfondo (OpenFreeMap)',
    mapOn: 'attiva',
    mapOff: 'disattiva',
    mapUnset: 'non ancora scelta',
    turnOff: 'Disattiva',
    turnOn: 'Accetta e attiva',
    clearTitle: 'Dati memorizzati',
    clearText: 'Rimuove ogni valore che EnviReader ha memorizzato in questo browser (lingua, tema, palette, preset, posizioni salvate, scelta sulla mappa). La pagina si ricarica e ogni file aperto viene chiuso.',
    clearButton: 'Cancella i dati memorizzati',
    clearConfirm: 'Cancellare tutti i dati di EnviReader memorizzati in questo browser? La pagina verrà ricaricata.',
    close: 'Chiudi',
  },
};

export const PRIVACY_TEXT = { en, it };
