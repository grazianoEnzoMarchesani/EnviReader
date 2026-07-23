// Viewer three.js del modello INX: gestisce renderer, camera orbitale e
// ricostruzione della scena quando cambia il modello. I toggle dei livelli e
// il wireframe agiscono sulla scena esistente senza ricostruirla.
// Il gizmo di orientamento (ViewCube) e lo switch prospettica/parallela
// condividono lo stesso renderer/canvas (vedi viewCube.js e setProjection).

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildModelScene, buildVegetation, setLayerVisibility, setWireframe, disposeGroup, updateSunLayer, setSunDiagram, setShadowCasting, buildDataOverlay, buildWindOnSlices, buildWindVolume, applyWindTheme, worldToGrid, gridToWorld, updateGridWallVisibility } from '../lib/inxScene';
import { createViewCube } from '../lib/viewCube';
import { useI18n } from '../i18n/I18nContext';
import HelpTooltip from './controls/HelpTooltip';

const DEG = Math.PI / 180;
const UP_Y = new THREE.Vector3(0, 1, 0);

// Risolve una custom property CSS (es. "--surface") in "rgb(r, g, b)" con
// componenti 0-255, qualunque sia la sintassi con cui è definita nel tema
// chiaro/scuro (hex, oklch, ...): serve per dare a scene.background lo stesso
// colore del tema corrente senza doverlo duplicare/parsare a mano in JS.
// getComputedStyle da solo non basta: sui browser con supporto CSS Color 4
// il valore calcolato resta serializzato come "oklch(...)" (non convertito in
// rgb), sintassi che THREE.Color.setStyle non riconosce. Il canvas 2D invece
// rasterizza sempre in RGBA a 8 bit indipendentemente dallo spazio colore di
// input, quindi leggere il pixel dopo un fillRect dà un rgb() sempre valido.
function resolveCssColor(varName) {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;';
  probe.style.color = `var(${varName})`;
  document.body.appendChild(probe);
  const cssColor = getComputedStyle(probe).color;
  document.body.removeChild(probe);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = cssColor;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `rgb(${r}, ${g}, ${b})`;
}
// costante di tempo (s) dell'inseguimento morbido di rotazione/zoom ricevuti
// in sincronizzazione: più basso = risposta più pronta, più alto = più lento.
// A ~3×FOLLOW_TAU l'inseguimento è visivamente concluso (vedi loop sotto).
const FOLLOW_TAU = 0.12;

export default function Model3DViewer({ model, objectsVolume, spacingZ, dimZ, dataOverlay, windOverlay, windVolumeOverlay, flags, wireframe, vegStyle1, projection, sunEnabled, sunAzimuth, sunAltitude, sunPathPoints, sunDiagram, gizmoNorthMode, sectionX, sectionY, sectionAngle, onPivotChange, onAngleChange, cameraSyncRef, cameraSyncEnabled }) {
  const { tr } = useI18n();
  const containerRef = useRef(null);
  const gizmoRef = useRef(null); // div overlay che intercetta i click del gizmo
  const stageRef = useRef(null); // { renderer, scene, camera, controls, layers, resetView, setProjection }
  const gizmoApiRef = useRef(null); // API del ViewCube (setNorthReference, ecc.)
  // stato sempre fresco per il loop di rendering (registrato una sola volta al
  // mount, vedi interactionRef sotto per lo stesso pattern)
  const cameraSyncEnabledRef = useRef(cameraSyncEnabled);
  useEffect(() => {
    cameraSyncEnabledRef.current = cameraSyncEnabled;
  }, [cameraSyncEnabled]);
  // stato dell'incrocio sezioni sempre fresco per i listener del canvas,
  // registrati una sola volta al mount (vedi effetto sotto)
  const interactionRef = useRef({ model, sectionX, sectionY, sectionAngle, onPivotChange, onAngleChange });
  useEffect(() => {
    interactionRef.current = { model, sectionX, sectionY, sectionAngle, onPivotChange, onAngleChange };
  });
  // flag sempre fresco per applicare subito la visibilità dei livelli alla
  // (ri)costruzione della scena qui sotto: senza questo, ogni volta che
  // objectsVolume/spacingZ cambiano (es. al primo caricamento dei risultati)
  // la scena viene ricostruita da zero con tutti i livelli visibili di
  // default (i Group di three.js nascono visible=true), e l'effetto separato
  // che applica i toggle non riparte perché non dipende da objectsVolume —
  // risultato: ricettori (e altri livelli spenti) visibili finché non si
  // tocca manualmente un toggle.
  const flagsRef = useRef(flags);
  useEffect(() => {
    flagsRef.current = flags;
  }, [flags]);
  // stesso motivo di flagsRef: la (ri)costruzione della scena qui sotto deve
  // leggere lo stile vegetazione corrente anche quando è objectsVolume/spacingZ
  // a cambiare (non vegStyle1), altrimenti ricostruirebbe sempre in stile box.
  const vegStyle1Ref = useRef(vegStyle1);
  useEffect(() => {
    vegStyle1Ref.current = vegStyle1;
  }, [vegStyle1]);

  // setup del renderer: una volta sola per montaggio
  useEffect(() => {
    const container = containerRef.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    // sfondo della scena = colore del tema (chiaro/scuro) corrente: prima si
    // affidava alla trasparenza del canvas (alpha:true) che lasciava vedere la
    // card CSS sottostante, ma nel "cielo" vuoto sopra il modello questo dava
    // un riquadro bianco poco leggibile invece di adattarsi al tema. Disegnarlo
    // dentro la scena three.js è affidabile in ogni caso, e non copre comunque
    // il modello, che viene renderizzato sopra normalmente dove presente.
    const applySceneBackground = () => {
      scene.background = new THREE.Color().setStyle(resolveCssColor('--surface'));
      // frecce/streamline del vento: nero su sfondo chiaro si legge, ma si
      // perde su sfondo scuro, quindi seguono lo stesso cambio di tema
      // (vedi applyWindTheme in inxScene.js) senza ricostruire le mesh.
      applyWindTheme(stageRef.current?.windOverlayLayer);
      applyWindTheme(stageRef.current?.windVolumeLayer);
    };
    applySceneBackground();
    const themeObserver = new MutationObserver(applySceneBackground);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    // due camere condividono posizione/target: la prospettica è quella di
    // default, l'ortografica (parallela) riusa lo stesso punto di vista
    const perspCam = new THREE.PerspectiveCamera(45, 1, 0.5, 20000);
    const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.5, 40000);
    orthoCam.userData.viewHeight = 100; // altezza mondo del frustum (ricalcolata allo switch)

    const controls = new OrbitControls(perspCam, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // mai sotto il terreno

    const stage = {
      renderer, scene, perspCam, orthoCam, camera: perspCam, controls,
      layers: null, resetView: () => {}, setProjection: () => {},
    };
    stageRef.current = stage;

    // "Quanto è zoomato" il pannello, in un'unica unità comparabile tra le
    // due proiezioni: per la prospettica è la distanza camera→target (più
    // piccola = più vicino), per la parallela è camera.zoom convertito nella
    // stessa unità di distanza con la formula già usata da setProjection per
    // passare da ortografica a prospettica — permette di sincronizzare lo
    // zoom anche in vista parallela, dove "zoom" non è affatto una distanza.
    const halfFov = (perspCam.fov * DEG) / 2;
    const currentZoomRadius = () => {
      if (stage.camera.isOrthographicCamera) {
        return (stage.camera.userData.viewHeight / stage.camera.zoom) / (2 * Math.tan(halfFov));
      }
      return stage.camera.position.distanceTo(stage.controls.target);
    };
    const applyZoomRadius = (radius) => {
      if (stage.camera.isOrthographicCamera) {
        stage.camera.zoom = stage.camera.userData.viewHeight / (2 * radius * Math.tan(halfFov));
        stage.camera.updateProjectionMatrix();
      } else {
        const target = stage.controls.target;
        const dir = stage.camera.position.clone().sub(target).normalize();
        stage.camera.position.copy(target).addScaledVector(dir, radius);
      }
    };

    // Rotazione/zoom/pan sincronizzati tra i due viewer 3D (vedi
    // cameraSyncRef in ModelView): token identificativo di *questo*
    // pannello, così ognuno ignora i propri stessi aggiornamenti nel
    // riferimento condiviso e non ri-trasmette una vista appena ricevuta
    // dall'altro (niente ping-pong). Zoom e pan viaggiano come rapporti
    // relativi alla propria inquadratura di default (baseRadius/baseTarget),
    // non come valori assoluti, così restano proporzionati anche fra
    // modelli di dimensioni diverse.
    const syncToken = {};
    let syncRev = 0;
    let syncLastAppliedRev = 0;
    const broadcastSync = (payload) => {
      if (!cameraSyncEnabledRef.current || !cameraSyncRef) return;
      syncRev += 1;
      cameraSyncRef.current = { ...payload, rev: syncRev, source: syncToken };
      syncLastAppliedRev = syncRev; // non ri-applicare a sé stesso ciò che si è appena inviato
    };

    // gizmo di orientamento nell'angolo in alto a destra. onUserGoTo: un
    // click su faccia/lettera/frecce di rotazione (mai una vista ricevuta in
    // sincronizzazione, vedi silent in viewCube.js) viene rilanciato così
    // com'è sul pannello gemello, che lo applica con lo stesso gizmo.goTo
    // (stessa animazione, stessa gestione della vista assiale) invece di
    // copiare a mano posizione/up della camera — l'unico modo corretto di
    // riprodurre una vista dall'alto/cardinale, che in coordinate sferiche
    // pure è un caso degenere (vedi note in viewCube.js su axialActive).
    const gizmo = createViewCube(stage, gizmoRef.current, {
      onUserGoTo: (dirWorld, upOverride) => {
        broadcastSync({ kind: 'goto', dir: dirWorld.clone(), up: upOverride ? upOverride.clone() : null });
      },
    });
    gizmoApiRef.current = gizmo;

    // switch prospettica/parallela conservando orientamento, target e "zoom"
    // visivo (la distanza per la prospettica, camera.zoom per l'ortografica)
    stage.setProjection = (mode) => {
      const cur = stage.camera;
      const next = mode === 'parallel' ? orthoCam : perspCam;
      if (next === cur) return;
      const target = stage.controls.target;
      const dir = cur.position.clone().sub(target);
      const aspect = (container.clientWidth || 1) / (container.clientHeight || 1);
      const halfFov = (perspCam.fov * DEG) / 2;

      if (next === orthoCam) {
        const dist = dir.length();
        const viewHeight = 2 * dist * Math.tan(halfFov);
        orthoCam.userData.viewHeight = viewHeight;
        orthoCam.top = viewHeight / 2;
        orthoCam.bottom = -viewHeight / 2;
        orthoCam.left = -(viewHeight / 2) * aspect;
        orthoCam.right = (viewHeight / 2) * aspect;
        orthoCam.zoom = 1;
        orthoCam.position.copy(cur.position);
      } else {
        // ortografica → prospettica: traduci lo zoom ortografico in distanza
        const effHeight = orthoCam.userData.viewHeight / orthoCam.zoom;
        const newDist = effHeight / (2 * Math.tan(halfFov));
        perspCam.position.copy(target).add(dir.setLength(newDist));
      }
      next.up.copy(cur.up);
      next.lookAt(target);
      next.updateProjectionMatrix();

      // OrbitControls è legato a una camera: si ricrea sulla nuova conservando
      // target e vincoli, poi si aggiorna
      const t = stage.controls.target.clone();
      stage.controls.dispose();
      const nc = new OrbitControls(next, renderer.domElement);
      nc.enableDamping = true;
      nc.maxPolarAngle = Math.PI / 2 - 0.02;
      nc.target.copy(t);
      stage.controls = nc;
      stage.camera = next;
      nc.update();
      gizmo.onControlsChanged(); // riaggancia il rebase del gizmo se in vista assiale
    };

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = container;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      const aspect = w / h;
      perspCam.aspect = aspect;
      perspCam.updateProjectionMatrix();
      const vh = orthoCam.userData.viewHeight;
      orthoCam.top = vh / 2;
      orthoCam.bottom = -vh / 2;
      orthoCam.left = -(vh / 2) * aspect;
      orthoCam.right = (vh / 2) * aspect;
      orthoCam.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    // Interazione sul terreno: click sposta l'incrocio delle sezioni (x,z),
    // trascinare vicino a una traccia la ruota — stessa semantica di
    // MapChart in 2D (vedi handleCellClick/rotDragTo), riproiettata sullo
    // schermo 3D. Non tocca mai `level` (la quota di taglio orizzontale
    // resta riservata allo slider): il raycaster interseca sempre il piano
    // y=0, quindi conta solo la posizione in pianta del click.
    const raycaster = new THREE.Raycaster();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    let dragMode = null; // null | 'maybe-click' | 'orbit' | 'rotate'
    let dragWhich = null; // 'v' | 'h' durante 'rotate'
    let downPos = null;

    const groundHit = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera({ x, y }, stage.camera);
      const point = new THREE.Vector3();
      return raycaster.ray.intersectPlane(groundPlane, point) ? point : null;
    };

    const projectToScreen = (vec3) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const p = vec3.clone().project(stage.camera);
      return { x: rect.left + (p.x * 0.5 + 0.5) * rect.width, y: rect.top + (-p.y * 0.5 + 0.5) * rect.height };
    };

    // Vicino al perno il trascinamento resta indefinito (angolo instabile):
    // lì il gesto è sempre un click che sposta l'incrocio, mai una rotazione.
    const lineHitTest = (clientX, clientY) => {
      const { model: m, sectionX: sx, sectionY: sy, sectionAngle: sa } = interactionRef.current;
      if (!m) return null;
      const { I, J } = m.geometry;
      const pivotScreen = projectToScreen(gridToWorld(m, sx, sy));
      if (Math.hypot(clientX - pivotScreen.x, clientY - pivotScreen.y) <= 18) return null;
      const rad = (sa * Math.PI) / 180;
      const span = Math.max(I, J) * 0.5;
      const dirs = { v: [-Math.sin(rad), Math.cos(rad)], h: [Math.cos(rad), Math.sin(rad)] };
      let best = null;
      for (const which of ['v', 'h']) {
        const [gx, gy] = dirs[which];
        const farScreen = projectToScreen(gridToWorld(m, sx + gx * span, sy + gy * span));
        const ddx = farScreen.x - pivotScreen.x;
        const ddy = farScreen.y - pivotScreen.y;
        const len = Math.hypot(ddx, ddy) || 1;
        const ux = ddx / len;
        const uy = ddy / len;
        const dist = Math.abs((clientX - pivotScreen.x) * uy - (clientY - pivotScreen.y) * ux);
        if (dist < 9 && (!best || dist < best.dist)) best = { which, dist };
      }
      return best?.which ?? null;
    };

    const onHoverMove = (e) => {
      if (dragMode) return;
      renderer.domElement.style.cursor = lineHitTest(e.clientX, e.clientY) ? 'grab' : '';
    };

    const onWindowMove = (e) => {
      if (dragMode === 'rotate') {
        const point = groundHit(e);
        if (!point) return;
        const { model: m, sectionX: sx, sectionY: sy } = interactionRef.current;
        const { col, row } = worldToGrid(m, point);
        const vx = col - sx;
        const vy = row - sy;
        if (Math.hypot(vx, vy) < 0.75) return; // troppo vicino al perno: angolo instabile
        let deg = (dragWhich === 'v' ? Math.atan2(-vx, vy) : Math.atan2(vy, vx)) * (180 / Math.PI);
        while (deg > 90) deg -= 180;
        while (deg <= -90) deg += 180;
        deg = Math.round(deg);
        if (Math.abs(deg) < 3) deg = 0; // snap: tornare all'ortogonale è facile
        if (deg === -90) deg = 90;
        interactionRef.current.onAngleChange?.(deg);
      } else if (dragMode === 'maybe-click' && Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 6) {
        dragMode = 'orbit'; // movimento oltre soglia: era un orbit, non un click
      }
    };

    const onWindowUp = (e) => {
      window.removeEventListener('pointermove', onWindowMove);
      window.removeEventListener('pointerup', onWindowUp);
      if (dragMode === 'rotate') {
        stage.controls.enabled = true;
        renderer.domElement.style.cursor = '';
      } else if (dragMode === 'maybe-click') {
        const point = groundHit(e);
        const { model: m } = interactionRef.current;
        if (point && m) {
          const { I, J } = m.geometry;
          const { col, row } = worldToGrid(m, point);
          interactionRef.current.onPivotChange?.(
            Math.min(I - 1, Math.max(0, Math.round(col))),
            Math.min(J - 1, Math.max(0, Math.round(row))),
          );
        }
      }
      dragMode = null;
      dragWhich = null;
      downPos = null;
    };

    const onPointerDown = (e) => {
      if (e.button !== 0 || !interactionRef.current.model) return;
      downPos = { x: e.clientX, y: e.clientY };
      const which = lineHitTest(e.clientX, e.clientY);
      if (which) {
        // trascinamento vicino a una traccia: ruota le sezioni, camera ferma
        dragMode = 'rotate';
        dragWhich = which;
        stage.controls.enabled = false;
        renderer.domElement.style.cursor = 'grabbing';
      } else {
        // altrove: potrebbe diventare un orbit (OrbitControls resta attivo e
        // gestisce il trascinamento) o restare un click che sposta il perno
        dragMode = 'maybe-click';
      }
      window.addEventListener('pointermove', onWindowMove);
      window.addEventListener('pointerup', onWindowUp);
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onHoverMove);

    // stato per il trascinamento continuo: direzione (camera→target,
    // normalizzata), up, rapporto di zoom (raggio / baseRadius) e pan (scarto
    // del target da baseTarget, in frazioni di baseRadius, vedi sopra)
    // correnti, per rilevare quando l'utente sta orbitando/zoomando/spostando
    // a mano (vedi loop sotto). Un vettore direzione non ha il problema di
    // gimbal-lock di theta/phi vicino ai poli (dove un piccolo movimento del
    // mouse farebbe impazzire l'azimuth), quindi la vista sincronizzata non
    // "sbanda" quando si passa quasi sopra la verticale.
    const dragTmp = new THREE.Vector3();
    const panTmp = new THREE.Vector3();
    let syncLastDir = null;
    let syncLastUp = null;
    let syncLastZoomRatio = null;
    let syncLastPan = null;
    const DRAG_EPS_SQ = 1e-8; // ~0.006° di scarto minimo prima di ritrasmettere
    const ZOOM_EPS = 0.0015; // ~0.15% di scarto minimo prima di ritrasmettere lo zoom
    const PAN_EPS_SQ = 1e-8; // scarto minimo (in frazioni di baseRadius) prima di ritrasmettere il pan
    // richiamato dopo ogni resetView "silenzioso" (caricamento/cambio modello,
    // vedi sotto): dimentica il riferimento così il prossimo frame lo ricattura
    // come nuova baseline invece di scambiarlo per un trascinamento dell'utente
    stage.resyncDragBaseline = () => {
      syncLastDir = null;
      syncLastUp = null;
      syncLastZoomRatio = null;
      syncLastPan = null;
    };

    // Inseguimento morbido di una vista ricevuta in sincronizzazione
    // (rotazione, zoom e pan): invece di scattare di colpo alla vista appena
    // ricevuta, ogni frame la camera si avvicina un po' di più al bersaglio
    // (target, rotazione, up e raggio), con un'attenuazione indipendente dal
    // framerate. Copre sia il trascinamento continuo sull'altro pannello (il
    // bersaglio si sposta ad ogni frame, quindi l'inseguimento resta sempre
    // "un passo indietro" e appare fluido) sia un salto grande (es.
    // sincronizzazione appena riattivata con viste molto diverse tra i due
    // pannelli).
    let followActive = false;
    const followDir = new THREE.Vector3();
    const followUp = new THREE.Vector3();
    let followRadius = null;
    const followTarget = new THREE.Vector3();
    let followHasTarget = false;

    const timer = new THREE.Timer();
    let frame;
    const loop = () => {
      timer.update();
      const delta = timer.getDelta();
      // durante l'animazione del gizmo la camera è pilotata direttamente,
      // quindi si salta l'update (con damping) di OrbitControls
      const animating = gizmo.update(delta);
      // true quando in questo frame la camera si è mossa per raggiungere una
      // vista sincronizzata (goto o inseguimento), non per un gesto
      // dell'utente: in tal caso non va ritrasmessa (niente ping-pong, vedi
      // broadcastSync sotto)
      let appliedExternalSync = false;

      // applica una vista sincronizzata ricevuta dall'altro pannello, se
      // presente e non già applicata; mai mentre questo pannello ha una sua
      // animazione del gizmo in corso, per non litigarci sopra
      if (!animating) {
        const sync = cameraSyncEnabledRef.current ? cameraSyncRef?.current : null;
        if (sync && sync.source && sync.source !== syncToken && sync.rev !== syncLastAppliedRev) {
          if (sync.kind === 'goto') {
            // click su faccia/lettera/frecce sull'altro pannello: rifà lo
            // stesso goTo qui, con la stessa animazione e la stessa gestione
            // della vista assiale (mai copiare a mano posizione/up, vedi
            // note in viewCube.js) — target e zoom restano i propri, e un
            // eventuale inseguimento di zoom in corso resta valido (goTo non
            // tocca il raggio)
            followActive = false;
            gizmo.goTo(sync.dir, sync.up ?? undefined);
          } else if (sync.dir) {
            // trascinamento/zoom/pan sull'altro pannello: stesso orientamento,
            // stesso rapporto di zoom e stesso pan (relativi alla propria
            // inquadratura di default, vedi baseRadius/baseTarget), ma la
            // scala assoluta resta quella propria di questo pannello. Se
            // questo pannello era rimasto in vista assiale per un proprio
            // click (axialActive, up non verticale), va prima ripulito:
            // altrimenti il rebase al prossimo drag userebbe uno stato ormai
            // stantio (vedi resetGizmoState in viewCube.js)
            gizmo.resetGizmoState();
            followDir.copy(sync.dir);
            followUp.copy(sync.up ?? UP_Y);
            followRadius = sync.zoomRatio != null && stage.baseRadius ? sync.zoomRatio * stage.baseRadius : null;
            followHasTarget = !!(sync.pan && stage.baseTarget && stage.baseRadius);
            if (followHasTarget) followTarget.copy(stage.baseTarget).addScaledVector(sync.pan, stage.baseRadius);
            followActive = true;
          }
          syncLastAppliedRev = sync.rev;
        }
        if (followActive) {
          const t = 1 - Math.exp(-delta / FOLLOW_TAU);
          // il pan trasla insieme target e camera prima di ri-orientare/
          // zoomare intorno al nuovo target, così i tre inseguimenti
          // compongono correttamente invece di litigarsi il pivot
          let targetConverged = true;
          if (followHasTarget) {
            const target = stage.controls.target;
            const prevTarget = target.clone();
            target.lerp(followTarget, t);
            stage.camera.position.add(target.clone().sub(prevTarget));
            targetConverged = target.distanceToSquared(followTarget) < (stage.baseRadius || 1) ** 2 * 1e-10;
          }
          const target = stage.controls.target;
          const offset = stage.camera.position.clone().sub(target);
          const posRadius = offset.length();
          const curDir = offset.normalize();
          const nextDir = curDir.lerp(followDir, t).normalize();
          stage.camera.up.lerp(followUp, t).normalize();
          // la rotazione si applica sempre in posizione (vale per entrambe le
          // proiezioni); lo zoom è gestito a parte da applyZoomRadius, che sa
          // se tradurlo in distanza (prospettica) o in camera.zoom (parallela,
          // dove la distanza non incide affatto sulla dimensione visibile)
          stage.camera.position.copy(target).addScaledVector(nextDir, posRadius);
          if (followRadius != null) applyZoomRadius(THREE.MathUtils.lerp(currentZoomRadius(), followRadius, t));
          stage.camera.lookAt(target);
          appliedExternalSync = true;
          // inseguimento concluso (vicinissimo al bersaglio): ferma il lerp
          // (altrimenti non converge mai del tutto) e scatta all'esatto valore
          const zoomConverged = followRadius == null || Math.abs(currentZoomRadius() - followRadius) < followRadius * 1e-5;
          if (nextDir.distanceToSquared(followDir) < 1e-9 && zoomConverged && targetConverged) {
            if (followHasTarget) stage.controls.target.copy(followTarget);
            stage.camera.up.copy(followUp);
            stage.camera.position.copy(stage.controls.target).addScaledVector(followDir, posRadius);
            if (followRadius != null) applyZoomRadius(followRadius);
            stage.camera.lookAt(stage.controls.target);
            followActive = false;
          }
        }
        // Fuori dall'animazione del gizmo, OrbitControls.update() è sicuro
        // solo con camera.up verticale: in vista assiale (up ruotato in
        // pianta, vedi axialActive in viewCube.js) l'orbit-controls interno
        // non sa nulla di quella rotazione e ricalcolerebbe uno spherical
        // degenere (azimuth indefinito), "collassando" la vista verso una
        // direzione qualunque. Si salta l'update finché il primo drag non
        // fa il rebase (vedi rebase() in viewCube.js).
        if (stage.camera.up.y > 0.999) stage.controls.update();
      }
      if (stage.layers) updateGridWallVisibility(stage.layers, stage.camera);
      renderer.render(stage.scene, stage.camera);
      gizmo.render(renderer);

      // trasmette il trascinamento/zoom/pan manuale (mai durante l'animazione
      // del gizmo, che trasmette da sé via onUserGoTo, né mentre si sta
      // applicando una vista appena ricevuta, né in vista assiale, dove "up"
      // non è verticale e va sempre gestito con gizmo.goTo)
      if (!animating && !appliedExternalSync && stage.camera.up.y > 0.999) {
        const target = stage.controls.target;
        dragTmp.copy(stage.camera.position).sub(target).normalize();
        const zoomRatio = stage.baseRadius ? currentZoomRadius() / stage.baseRadius : null;
        const havePan = stage.baseTarget && stage.baseRadius;
        if (havePan) panTmp.copy(target).sub(stage.baseTarget).divideScalar(stage.baseRadius);
        const changed =
          !syncLastDir ||
          dragTmp.distanceToSquared(syncLastDir) > DRAG_EPS_SQ ||
          stage.camera.up.distanceToSquared(syncLastUp) > DRAG_EPS_SQ ||
          (zoomRatio != null && syncLastZoomRatio != null && Math.abs(zoomRatio / syncLastZoomRatio - 1) > ZOOM_EPS) ||
          (havePan && syncLastPan && panTmp.distanceToSquared(syncLastPan) > PAN_EPS_SQ);
        if (changed) {
          // la primissima lettura (o quella dopo resyncDragBaseline, vedi
          // sotto) fissa solo il riferimento: non è un movimento dell'utente,
          // quindi non va trasmessa, altrimenti aprire/ricaricare un fileset
          // farebbe scattare la sincronizzazione e ruoterebbe/zoomerebbe/
          // sposterebbe anche l'altro pannello senza che nessuno abbia
          // toccato nulla
          const isBaseline = !syncLastDir;
          syncLastDir = syncLastDir ?? new THREE.Vector3();
          syncLastUp = syncLastUp ?? new THREE.Vector3();
          syncLastPan = syncLastPan ?? new THREE.Vector3();
          syncLastDir.copy(dragTmp);
          syncLastUp.copy(stage.camera.up);
          syncLastZoomRatio = zoomRatio;
          if (havePan) syncLastPan.copy(panTmp);
          if (!isBaseline) {
            broadcastSync({
              kind: 'drag',
              dir: dragTmp.clone(),
              up: stage.camera.up.clone(),
              zoomRatio,
              pan: havePan ? panTmp.clone() : null,
            });
          }
        }
      }
      frame = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      themeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onHoverMove);
      window.removeEventListener('pointermove', onWindowMove);
      window.removeEventListener('pointerup', onWindowUp);
      gizmo.dispose();
      stage.controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      stageRef.current = null;
      gizmoApiRef.current = null;
    };
  }, []);

  // riferimento dei cardinali del gizmo: nord vero (ruotato di modelRotation,
  // letto dall'INX) oppure lato piatto del modello (griglia, rotazione 0)
  useEffect(() => {
    gizmoApiRef.current?.setNorthReference(model?.location?.rotation ?? 0, gizmoNorthMode);
  }, [model, gizmoNorthMode]);

  // (ri)costruzione della scena al cambio di modello
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !model) return;
    const { group, layers, size, maxHeight, hemisphereLight, decorativeLight, sunLayer } = buildModelScene(model, objectsVolume, spacingZ, dimZ, vegStyle1Ref.current);
    stage.scene.add(group);
    stage.sceneGroup = group;
    stage.layers = layers;
    stage.hemisphereLight = hemisphereLight;
    stage.decorativeLight = decorativeLight;
    stage.sunLayer = sunLayer;
    setLayerVisibility(layers, flagsRef.current);

    const radius = Math.max(size.W, size.H, maxHeight * 2);
    // distanza di riferimento per lo zoom sincronizzato (vedi broadcastSync/
    // "zoomRatio" nel loop sotto): permette di confrontare lo zoom fra due
    // modelli di dimensioni diverse come rapporto rispetto alla propria
    // inquadratura di default, invece che come distanza assoluta (altrimenti
    // un fileset più grande apparirebbe sempre "più lontano" dell'altro anche
    // a parità di inquadratura percepita)
    stage.baseRadius = radius;
    const resetPos = new THREE.Vector3(radius * 0.65, radius * 0.75, radius * 0.95);
    const resetTarget = new THREE.Vector3(0, maxHeight / 4, 0);
    // punto di riferimento per il pan sincronizzato (vedi "pan" nel loop
    // sotto): lo spostamento del target viene condiviso come scarto da questo
    // punto, in frazioni di baseRadius, così resta proporzionato anche fra
    // modelli di dimensioni diverse invece di essere una posizione assoluta
    // (che non avrebbe senso confrontare fra due griglie diverse)
    stage.baseTarget = resetTarget.clone();
    // animate=false per lo snap iniziale al caricamento del modello (nessun
    // "volo" dall'origine); animate=true per Home/"Reimposta vista", che
    // deleghano al gizmo un'animazione fluida (vedi animateReset/flyTo in
    // viewCube.js, che interpola anche il target a differenza di goTo)
    stage.resetView = ({ animate = true } = {}) => {
      // annulla animazioni/vista assiale del gizmo residue: altrimenti la
      // camera riparte con un up-vector non verticale e la vista appare
      // "storta" (vedi resetGizmoState in viewCube.js)
      gizmoApiRef.current?.resetGizmoState();
      // la parallela non anima: il frustum va ricalcolato sulla nuova
      // distanza, quindi resta uno snap istantaneo come prima
      if (!animate || stage.camera.isOrthographicCamera) {
        stage.camera.up.set(0, 1, 0);
        stage.camera.position.copy(resetPos);
        stage.controls.target.copy(resetTarget);
        if (stage.camera.isOrthographicCamera) {
          const dist = stage.camera.position.distanceTo(stage.controls.target);
          const viewHeight = 2 * dist * Math.tan((stage.perspCam.fov * DEG) / 2);
          stage.camera.userData.viewHeight = viewHeight;
          stage.camera.zoom = 1;
          const aspect = (stage.renderer.domElement.clientWidth || 1) / (stage.renderer.domElement.clientHeight || 1);
          stage.camera.top = viewHeight / 2;
          stage.camera.bottom = -viewHeight / 2;
          stage.camera.left = -(viewHeight / 2) * aspect;
          stage.camera.right = (viewHeight / 2) * aspect;
          stage.camera.updateProjectionMatrix();
        }
        stage.controls.update();
        // snap silenzioso (caricamento/cambio modello, animate=false): non è
        // un gesto dell'utente, quindi non deve ruotare l'altro pannello
        // sincronizzato (vedi resyncDragBaseline) — a differenza di un
        // Home/"Reimposta vista" (animate=true) finito qui solo perché la
        // proiezione è parallela, che va invece sincronizzato normalmente
        if (!animate) stage.resyncDragBaseline?.();
        return;
      }
      gizmoApiRef.current?.animateReset(resetPos, resetTarget, new THREE.Vector3(0, 1, 0));
    };
    stage.resetView({ animate: false });

    return () => {
      stage.scene.remove(group);
      disposeGroup(group);
      stage.sceneGroup = null;
      stage.layers = null;
      stage.hemisphereLight = null;
      stage.decorativeLight = null;
      stage.sunLayer = null;
    };
  }, [model, objectsVolume, spacingZ, dimZ]);

  // Cambio di "stile 1" della vegetazione (voxel vs sfere per LAD): sostituisce
  // solo il sotto-layer vegetazione, senza ricostruire l'intera scena né
  // richiamare stage.resetView — a differenza dell'effetto sopra (pensato per
  // il cambio di modello/fileset), qui l'utente sta solo confrontando due stili
  // e non si aspetta che la vista della camera salti alla posizione di default.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage?.sceneGroup || !stage.layers || !model) return;
    const oldVeg = stage.layers.vegetation;
    const { I, J, dx, dy } = model.geometry;
    const W = I * dx;
    const H = J * dy;
    const toX = (i) => W / 2 - (i + 0.5) * dx;
    const toZ = (j) => H / 2 - (j + 0.5) * dy;
    const newVeg = buildVegetation(model, objectsVolume, { toX, toZ }, spacingZ, vegStyle1);
    if (oldVeg) {
      stage.sceneGroup.remove(oldVeg);
      disposeGroup(oldVeg);
    }
    if (newVeg) {
      newVeg.name = 'vegetation';
      stage.sceneGroup.add(newVeg);
    }
    stage.layers.vegetation = newVeg;
    setLayerVisibility(stage.layers, flagsRef.current);
  }, [vegStyle1]);

  // toggle dei livelli e wireframe, senza ricostruire
  useEffect(() => {
    const stage = stageRef.current;
    if (stage?.layers) setLayerVisibility(stage.layers, flags);
  }, [model, flags]);

  useEffect(() => {
    const stage = stageRef.current;
    if (stage?.layers) setWireframe(stage.layers, wireframe);
  }, [model, wireframe]);

  // Overlay voxel del dataset corrente: si ricostruisce a parte dal resto della
  // scena (dipende da slice/palette/tempo, che cambiano molto più spesso del
  // modello), ma vive nello stesso group così eredita gratis pan/zoom/rotazione.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage?.scene || !model) return;
    if (stage.dataOverlayLayer) {
      stage.scene.remove(stage.dataOverlayLayer);
      disposeGroup(stage.dataOverlayLayer);
      stage.dataOverlayLayer = null;
    }
    const layer = buildDataOverlay(model, dataOverlay);
    if (layer) {
      stage.scene.add(layer);
      stage.dataOverlayLayer = layer;
    }
    return () => {
      if (stage.dataOverlayLayer) {
        stage.scene.remove(stage.dataOverlayLayer);
        disposeGroup(stage.dataOverlayLayer);
        stage.dataOverlayLayer = null;
      }
    };
  }, [model, dataOverlay]);

  // wireframe sull'overlay voxel: effetto separato (l'overlay non fa parte di
  // stage.layers) ma nell'ordine di dichiarazione gira sempre dopo la sua
  // (ri)costruzione qui sopra, quindi vede sempre il layer aggiornato
  useEffect(() => {
    const layer = stageRef.current?.dataOverlayLayer;
    layer?.traverse((obj) => {
      if (obj.material && 'wireframe' in obj.material) obj.material.wireframe = wireframe;
    });
  }, [wireframe, dataOverlay]);

  // Vento sulle fette dati (pianta/sezioni): stesso pattern di dataOverlayLayer
  // qui sopra, gruppo indipendente così i due overlay si ricostruiscono senza
  // interferire tra loro.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage?.scene || !model) return;
    if (stage.windOverlayLayer) {
      stage.scene.remove(stage.windOverlayLayer);
      disposeGroup(stage.windOverlayLayer);
      stage.windOverlayLayer = null;
    }
    const layer = buildWindOnSlices(model, windOverlay);
    if (layer) {
      stage.scene.add(layer);
      stage.windOverlayLayer = layer;
    }
    return () => {
      if (stage.windOverlayLayer) {
        stage.scene.remove(stage.windOverlayLayer);
        disposeGroup(stage.windOverlayLayer);
        stage.windOverlayLayer = null;
      }
    };
  }, [model, windOverlay]);

  // Campo di vento volumetrico: stesso pattern, gruppo indipendente
  // ('windVolume'). Le celle (frecce/segmenti) arrivano già pronte dal worker
  // (vedi useWindVolumeCells in useSlice.js), quindi la ricostruzione qui è
  // keyed solo su windVolumeOverlay?.cells — non sull'intero oggetto, che
  // include anche `opacity` — così muovere lo slider "Wind opacity" non
  // rifà la mesh da zero: se ne occupa il piccolo effetto subito sotto,
  // che aggiorna solo il materiale.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage?.scene || !model) return;
    if (stage.windVolumeLayer) {
      stage.scene.remove(stage.windVolumeLayer);
      disposeGroup(stage.windVolumeLayer);
      stage.windVolumeLayer = null;
    }
    const layer = buildWindVolume(windVolumeOverlay);
    if (layer) {
      stage.scene.add(layer);
      stage.windVolumeLayer = layer;
    }
    return () => {
      if (stage.windVolumeLayer) {
        stage.scene.remove(stage.windVolumeLayer);
        disposeGroup(stage.windVolumeLayer);
        stage.windVolumeLayer = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, windVolumeOverlay?.cells]);

  // Opacità del campo di vento volumetrico: solo materiale, nessuna
  // ricostruzione della geometria (vedi commento sopra).
  useEffect(() => {
    const layer = stageRef.current?.windVolumeLayer;
    if (!layer) return;
    const alpha = Math.min(1, Math.max(0, (windVolumeOverlay?.opacity ?? 100) / 100));
    layer.traverse((obj) => {
      if (obj.material) obj.material.opacity = alpha;
    });
  }, [windVolumeOverlay?.opacity]);

  // switch prospettica/parallela dalla sidebar
  useEffect(() => {
    stageRef.current?.setProjection(projection === 'parallel' ? 'parallel' : 'perspective');
  }, [projection]);

  // attiva/disattiva la simulazione solare: luce con ombre al posto della
  // luce decorativa fissa, ombra propria/portata su edifici-vegetazione-terreno
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage?.sunLayer || !stage.decorativeLight) return;
    const on = !!sunEnabled;
    stage.sunLayer.group.visible = on;
    stage.decorativeLight.intensity = on ? 0 : 1.6;
    // in modalità solare l'ambiente hemisphere va tenuto basso, altrimenti
    // annulla il contrasto delle ombre proiettate dalla luce direzionale
    if (stage.hemisphereLight) stage.hemisphereLight.intensity = on ? 0.45 : 1.15;
    setShadowCasting(stage.layers, on);
  }, [model, sunEnabled]);

  // (ri)costruisce bussola e rete annuale del percorso quando cambia la località
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage?.sunLayer || !sunEnabled) return;
    const rotation = model?.location?.rotation ?? 0;
    setSunDiagram(stage.sunLayer, rotation, sunDiagram);
  }, [model, sunEnabled, sunDiagram]);

  // muove sole/ombre lungo lo slider orario e ridisegna l'arco quando cambia il giorno
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage?.sunLayer || !sunEnabled) return;
    if (!Number.isFinite(sunAzimuth) || !Number.isFinite(sunAltitude)) return;
    const rotation = model?.location?.rotation ?? 0;
    updateSunLayer(stage.sunLayer, rotation, sunAzimuth, sunAltitude, sunPathPoints);
  }, [model, sunEnabled, sunAzimuth, sunAltitude, sunPathPoints]);

  return (
    <>
      <div ref={containerRef} className="model-canvas" />
      <div className="view-gizmo-wrap">
        <div ref={gizmoRef} className="view-gizmo" />
        <HelpTooltip content={{ title: tr('help_gizmo_home_title'), body: tr('help_gizmo_home_body') }}>
          <button
            type="button"
            className="view-gizmo-btn view-gizmo-home"
            aria-label={tr('gizmo_home_title')}
            onClick={() => stageRef.current?.resetView()}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3.5 11.5 12 4l8.5 7.5" />
              <path d="M5.5 10v9a1 1 0 0 0 1 1h4V14h3v6h4a1 1 0 0 0 1-1v-9" />
            </svg>
          </button>
        </HelpTooltip>
        <HelpTooltip content={{ title: tr('help_gizmo_rotate_ccw_title'), body: tr('help_gizmo_rotate_ccw_body') }}>
          <button
            type="button"
            className="view-gizmo-btn view-gizmo-rotate view-gizmo-rotate-ccw"
            aria-label={tr('gizmo_rotate_ccw_title')}
            onClick={() => gizmoApiRef.current?.rotate(90)}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4a8 8 0 1 0 7.75 6" transform="scale(-1,1) translate(-24,0)" />
              <path d="M19 2v5h-5" transform="scale(-1,1) translate(-24,0)" />
            </svg>
          </button>
        </HelpTooltip>
        <HelpTooltip content={{ title: tr('help_gizmo_rotate_cw_title'), body: tr('help_gizmo_rotate_cw_body') }}>
          <button
            type="button"
            className="view-gizmo-btn view-gizmo-rotate view-gizmo-rotate-cw"
            aria-label={tr('gizmo_rotate_cw_title')}
            onClick={() => gizmoApiRef.current?.rotate(-90)}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4a8 8 0 1 0 7.75 6" />
              <path d="M19 2v5h-5" />
            </svg>
          </button>
        </HelpTooltip>
      </div>
    </>
  );
}
