// Gizmo di orientamento (ViewCube) in stile software di modellazione: un cubo
// etichettato con anello dei punti cardinali, disegnato nell'angolo in alto a
// destra dello stesso canvas WebGL del viewer (viewport/scissor dedicati). Il
// cubo riflette in tempo reale l'orientamento della camera; cliccando una
// faccia, uno spigolo o un vertice la camera principale si allinea con
// un'animazione fluida, mantenendo il target e la distanza correnti.
//
// Convenzioni assi coerenti con inxScene.js e con la bussola solare
// (sunDirection): +Z = nord griglia, -X = est griglia, y = quota. Le etichette
// di vista (TOP/FRONT/…) sono nomi di orientamento, indipendenti dai cardinali.
//
// L'anello dei cardinali può riferirsi al nord vero (ruotato di modelRotation,
// stessa formula di sunDirection in inxScene.js) oppure alla griglia del
// modello (lato piatto, rotazione 0): il nord "vero" non coincide con +Z se
// il modello INX è ruotato rispetto al nord geografico (vedi readInxRotation).
// In modalità griglia le lettere mostrate sono F/L/B/R (front/left/back/right,
// vedi GRID_LABELS) invece di N/E/S/W, per non far credere che l'anello
// indichi i cardinali geografici reali quando in realtà segue solo il lato
// piatto del modello.

import * as THREE from 'three';

const PHI_MIN = 0.12; // vista dall'alto "ripida" ma stabile (up resta +Y)

// Etichette per indice materiale della BoxGeometry: [+X,-X,+Y,-Y,+Z,-Z]
const FACE_LABELS = ['RIGHT', 'LEFT', 'TOP', 'BOTTOM', 'FRONT', 'BACK'];
const FACE_BG = '#ffffff';
const FACE_BG_HOVER = '#bcd4f2';
const FACE_TEXT = '#20242b';
const CUBE_COLOR = 0xffffff;
const EDGE_COLOR = 0x2b2f34;
const CARDINAL_LETTERS = ['N', 'E', 'S', 'W'];
// In modalità griglia le lettere N/E/S/W (nord vero) vengono sostituite da
// queste, coerenti con le etichette delle facce del cubo (FRONT/BACK/LEFT/
// RIGHT), per non far credere che puntino ai cardinali geografici reali.
const GRID_LABELS = { N: 'F', E: 'L', S: 'B', W: 'R' };

// Direzioni (world space) dei 4 cardinali per una data rotazione del modello
// (gradi, stessa convenzione di sunDirection in inxScene.js: a rotazione 0,
// N=+Z, E=-X). Con rotationDeg=0 si ottiene l'allineamento con la griglia
// (il "lato piatto"); con rotationDeg=modelRotation si ottiene il nord vero.
function cardinalDirs(rotationDeg) {
  const theta = (rotationDeg || 0) * (Math.PI / 180);
  const north = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
  const east = new THREE.Vector3(-Math.cos(theta), 0, Math.sin(theta));
  return [
    ['N', north],
    ['E', east],
    ['S', north.clone().negate()],
    ['W', east.clone().negate()],
  ];
}

function faceTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = FACE_BG;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(43,47,52,0.18)';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, 125, 125);
  ctx.fillStyle = FACE_TEXT;
  ctx.font = '700 27px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 66);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return { texture, ctx, canvas };
}

// texture della corona (compass ring): sfondo a gradiente radiale + doppio
// bordo, per un aspetto "disco" invece della corona a tinta piatta di prima.
// Simmetrica rispetto alla rotazione, così la proiezione piana delle UV di
// RingGeometry (basata sul bounding box) non introduce distorsioni.
function ringTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;
  const outerR = size / 2 - 6;
  const innerR = outerR * (0.92 / 1.2);
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, outerR, 0, Math.PI * 2);
  ctx.arc(c, c, innerR, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();
  const grad = ctx.createRadialGradient(c, c, innerR, c, c, outerR);
  grad.addColorStop(0, '#e4e7eb');
  grad.addColorStop(1, '#aab0b8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(45,49,54,0.6)';
  ctx.beginPath();
  ctx.arc(c, c, outerR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(c, c, innerR, 0, Math.PI * 2);
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

// piccolo pallino grigio per i tacche diagonali (NE/SE/SW/NW) dell'anello
function tickSprite(size) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#4b5158';
  ctx.beginPath();
  ctx.arc(16, 16, 5, 0, Math.PI * 2);
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(size, size, 1);
  return sprite;
}

function labelSprite(text, color, size) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.font = '700 40px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 32, 34);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(size, size, 1);
  return sprite;
}

// vignette circolare semi-trasparente dietro al cubo: non ruota con `root`
// (resta sempre rivolta verso la camera del gizmo), garantisce contrasto
// leggibile qualunque sia lo sfondo della scena 3D principale sottostante
// (cielo chiaro, modello scuro, vuoto), scurendo leggermente gli sfondi
// chiari e schiarendo quelli scuri.
function backdropTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, size * 0.08, c, c, size * 0.5);
  grad.addColorStop(0, 'rgba(70,75,82,0.4)');
  grad.addColorStop(0.7, 'rgba(70,75,82,0.22)');
  grad.addColorStop(1, 'rgba(70,75,82,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

// Crea il gizmo. `stage` espone camera/controls correnti (cambiano con la
// proiezione); `hitEl` è il div overlay che intercetta i click nell'angolo.
// `onUserGoTo(dirWorld, upOverride)`, se fornito, viene invocato ogni volta
// che un gesto dell'utente (click su faccia/lettera, frecce di rotazione)
// avvia un `goTo`: usato dal viewer per replicare la stessa vista sul
// pannello gemello quando la rotazione sincronizzata è attiva (vedi
// Model3DViewer). Non viene invocato quando `goTo` è chiamato "in silenzio"
// per applicare una vista già ricevuta dall'altro pannello — altrimenti i
// due pannelli si rimbalzerebbero l'un l'altro all'infinito.
export function createViewCube(stage, hitEl, { onUserGoTo } = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1.8, 1.8, 1.8, -1.8, 0.1, 10);
  camera.position.set(0, 0, 4);
  camera.lookAt(0, 0, 0);

  // dietro a tutto (root incluso): vedi backdropTexture()
  const backdrop = new THREE.Mesh(
    new THREE.CircleGeometry(1.7, 48),
    new THREE.MeshBasicMaterial({ map: backdropTexture(), transparent: true, depthWrite: false }),
  );
  backdrop.position.z = -1.5;
  scene.add(backdrop);

  // gruppo che ruota con la camera principale (WYSIWYG)
  const root = new THREE.Group();
  scene.add(root);

  // cubo: 6 materiali (uno per faccia) con texture etichetta. Non illuminato
  // (MeshBasicMaterial): le facce restano bianco pieno e ugualmente leggibili
  // da qualunque angolazione, invece di scurirsi in ombra come con un
  // materiale lambertiano (il contrasto voluto non deve dipendere dalla luce).
  const faces = FACE_LABELS.map((label) => {
    const { texture, ctx } = faceTexture(label);
    const material = new THREE.MeshBasicMaterial({ color: CUBE_COLOR, map: texture });
    return { material, texture, ctx, label };
  });
  const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), faces.map((f) => f.material));
  root.add(cube);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(cube.geometry),
    new THREE.LineBasicMaterial({ color: EDGE_COLOR, transparent: true, opacity: 0.95 }),
  );
  root.add(edges);

  // anello dei cardinali nel piano di terra, sotto al cubo (segue la rotazione)
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.92, 1.2, 64),
    new THREE.MeshBasicMaterial({ map: ringTexture(), transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -0.62;
  root.add(ring);

  // sprite dei 4 cardinali: posizione e colore vengono ricalcolati da
  // applyNorthReference() in base al riferimento scelto (nord vero o griglia)
  const cardinalSprites = CARDINAL_LETTERS.map((letter) => {
    const sprite = labelSprite(letter, '#33383f', 0.34);
    root.add(sprite);
    return { letter, sprite };
  });

  // 4 tacche diagonali (NE/SE/SW/NW) fra le lettere cardinali, puramente
  // decorative: posizionate in applyNorthReference() come punto medio fra le
  // due direzioni cardinali adiacenti (stesso raggio dell'anello)
  const DIAGONALS = [['N', 'E'], ['E', 'S'], ['S', 'W'], ['W', 'N']];
  const diagonalTicks = DIAGONALS.map(() => {
    const sprite = tickSprite(0.14);
    root.add(sprite);
    return sprite;
  });

  let northMode = 'true'; // 'true' = nord vero (ruotato), 'grid' = lato piatto del modello
  let modelRotationDeg = 0;
  // direzione mondo correntemente mostrata per ciascuna lettera (aggiornata da
  // applyNorthReference): usata sia per disegnare i cardinali sia per il click
  // su una lettera (vedi pickCardinal/onClick), che porta quella direzione
  // in cima allo schermo in vista dall'alto.
  const currentDirs = new Map();

  // riposiziona/ricolora i 4 cardinali; solo il nord *vero* viene evidenziato
  // (in modalità griglia nessuna lettera rivendica di essere il nord reale)
  function applyNorthReference() {
    const dirs = cardinalDirs(northMode === 'true' ? modelRotationDeg : 0);
    const primaryLetter = northMode === 'true' ? 'N' : null;
    for (const [letter, vec] of dirs) {
      currentDirs.set(letter, vec);
      const entry = cardinalSprites.find((c) => c.letter === letter);
      const primary = letter === primaryLetter;
      entry.sprite.position.copy(vec).multiplyScalar(1.42).setY(-0.62);
      const map = entry.sprite.material.map;
      const canvas = map.image;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = '700 40px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = primary ? '#a85d16' : '#33383f';
      ctx.fillText(northMode === 'grid' ? GRID_LABELS[letter] : letter, 32, 34);
      map.needsUpdate = true;
      entry.sprite.scale.setScalar(primary ? 0.42 : 0.34);
    }
    DIAGONALS.forEach(([a, b], i) => {
      const mid = currentDirs.get(a).clone().add(currentDirs.get(b)).normalize();
      diagonalTicks[i].position.copy(mid).multiplyScalar(1.42).setY(-0.62);
    });
  }
  applyNorthReference();

  const raycaster = new THREE.Raycaster();
  let hoverFace = -1; // indice materiale evidenziato
  let anim = null; // animazione in corso (vedi goTo)
  // vista assiale attiva (perfettamente dall'alto, up=+Z): OrbitControls vincola
  // il polo su +Y, quindi finché resta +Z la protezione "sotto terra" è sospesa;
  // al primo drag si "rebase" su +Y con uno scarto impercettibile (vedi rebase).
  let axialActive = false;
  // direzione (mondo, orizzontale) che la vista assiale corrente porta in
  // cima allo schermo: ricordata per il rebase, che deve tornare esattamente
  // a questa direzione (altrimenti "salta" su un'altra al primo drag/zoom)
  let axialUpDir = null;
  const UP_Y = new THREE.Vector3(0, 1, 0);
  // nord in alto nella vista dall'alto: deve produrre lo stesso "screen up"
  // del rebase (theta=PI, up=+Y appena sotto lo zenit), altrimenti al primo
  // drag/zoom dopo il click su TOP la vista "salta" da sud-in-alto a
  // nord-in-alto (verificato numericamente sulla base della camera)
  const UP_TOP = new THREE.Vector3(0, 0, 1);

  function setHover(index) {
    if (index === hoverFace) return;
    const paint = (i, bg) => {
      const f = faces[i];
      f.ctx.fillStyle = bg;
      f.ctx.fillRect(0, 0, 128, 128);
      f.ctx.strokeStyle = 'rgba(43,47,52,0.18)';
      f.ctx.lineWidth = 3;
      f.ctx.strokeRect(1.5, 1.5, 125, 125);
      f.ctx.fillStyle = FACE_TEXT;
      f.ctx.font = '700 27px -apple-system, system-ui, sans-serif';
      f.ctx.textAlign = 'center';
      f.ctx.textBaseline = 'middle';
      f.ctx.fillText(f.label, 64, 66);
      f.texture.needsUpdate = true;
    };
    if (hoverFace >= 0) paint(hoverFace, FACE_BG);
    if (index >= 0) paint(index, FACE_BG_HOVER);
    hoverFace = index;
  }

  // pointer → raycast sul cubo, ritorna { dirWorld, faceIndex } o null
  function pick(ev) {
    const rect = hitEl.getBoundingClientRect();
    const nx = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera({ x: nx, y: ny }, camera);
    const hits = raycaster.intersectObject(cube, false);
    if (!hits.length) return null;
    // punto in coordinate locali del cubo (== assi mondo): quantizza in
    // faccia/spigolo/vertice includendo l'asse quando è vicino al bordo (±0.5)
    const p = cube.worldToLocal(hits[0].point.clone());
    const t = 0.32;
    const q = (v) => (v > t ? 1 : v < -t ? -1 : 0);
    const dirWorld = new THREE.Vector3(q(p.x), q(p.y), q(p.z));
    if (dirWorld.lengthSq() === 0) return null;
    return { dirWorld, faceIndex: hits[0].face.materialIndex };
  }

  // pointer → raycast sulle 4 lettere cardinali dell'anello, ritorna la
  // lettera colpita ('N'/'E'/'S'/'W') o null
  function pickCardinal(ev) {
    const rect = hitEl.getBoundingClientRect();
    const nx = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera({ x: nx, y: ny }, camera);
    const hits = raycaster.intersectObjects(cardinalSprites.map((c) => c.sprite), false);
    if (!hits.length) return null;
    return cardinalSprites.find((c) => c.sprite === hits[0].object)?.letter ?? null;
  }

  function onMove(ev) {
    if (pickCardinal(ev)) {
      setHover(-1);
      hitEl.style.cursor = 'pointer';
      return;
    }
    const hit = pick(ev);
    setHover(hit ? hit.faceIndex : -1);
    hitEl.style.cursor = hit ? 'pointer' : 'default';
  }
  function onLeave() {
    setHover(-1);
  }
  function onClick(ev) {
    // click su una lettera cardinale: vista dall'alto con quella direzione
    // in cima allo schermo (vedi currentDirs, aggiornato da applyNorthReference)
    const letter = pickCardinal(ev);
    if (letter) {
      const dir = currentDirs.get(letter);
      if (dir) goTo(new THREE.Vector3(0, 1, 0), dir);
      return;
    }
    const hit = pick(ev);
    if (hit) goTo(hit.dirWorld);
  }

  // al primo drag dopo una vista dall'alto perfetta: ripristina up=+Y (e con
  // esso la protezione "mai sotto terra" di OrbitControls) con uno scostamento
  // di ~0.6° dallo zenit verso axialUpDir, impercettibile ma sufficiente a
  // definire l'azimuth — deve restare la stessa direzione mostrata in cima
  // allo schermo dalla vista assiale corrente, altrimenti la vista "salta".
  function rebase() {
    if (!axialActive) return;
    axialActive = false;
    stage.controls.removeEventListener('start', rebase);
    const cam = stage.camera;
    const target = stage.controls.target;
    const r = cam.position.distanceTo(target);
    const eps = 0.01;
    cam.up.copy(UP_Y);
    cam.position
      .copy(target)
      .addScaledVector(UP_Y, r * Math.cos(eps))
      .addScaledVector(axialUpDir ?? UP_TOP, -r * Math.sin(eps));
    cam.lookAt(target);
    stage.controls.update();
  }

  // avvia l'animazione verso la direzione di vista (coord. mondo). Interpola
  // sia la direzione (arco a raggio costante) sia il vettore up, così la vista
  // dall'alto può arrivare allo zenit esatto con un up dedicato (nord in alto,
  // o la direzione cardinale scelta se si è cliccata una lettera dell'anello).
  // `silent` evita di rilanciare `onUserGoTo` quando la chiamata arriva già
  // dalla sincronizzazione con l'altro pannello (vedi commento su createViewCube).
  function goTo(dirWorld, upOverride, silent = false) {
    if (!silent) onUserGoTo?.(dirWorld, upOverride ?? null);
    if (axialActive) {
      axialActive = false;
      stage.controls.removeEventListener('start', rebase);
    }
    const controls = stage.controls;
    const cam = stage.camera;
    const nd = dirWorld.clone().normalize();
    const vertical = dirWorld.x === 0 && dirWorld.z === 0 && dirWorld.y !== 0;
    const axialTop = vertical && dirWorld.y > 0;

    let goalDir;
    let goalUp;
    if (axialTop) {
      goalDir = new THREE.Vector3(0, 1, 0); // zenit esatto
      goalUp = (upOverride ?? UP_TOP).clone().normalize();
    } else {
      const g = new THREE.Spherical().setFromVector3(nd);
      const phiMax = controls.maxPolarAngle ?? Math.PI;
      // BOTTOM (verticale verso il basso): azimuth indeterminato → theta=π così
      // resta il nord in alto; il polo è comunque limitato da maxPolarAngle
      const theta = vertical ? Math.PI : g.theta;
      const phi = THREE.MathUtils.clamp(g.phi, PHI_MIN, phiMax);
      goalDir = new THREE.Vector3().setFromSpherical(new THREE.Spherical(1, phi, theta));
      goalUp = UP_Y.clone();
    }
    anim = {
      kind: 'orbit',
      startDir: cam.position.clone().sub(controls.target).normalize(),
      goalDir,
      startUp: cam.up.clone(),
      goalUp,
      radius: cam.position.distanceTo(controls.target),
      axialTop,
      t: 0,
      dur: 0.45,
    };
  }

  // avvia un'animazione "di volo" verso una posizione/target/up qualsiasi
  // (usata dal reset "Home", che a differenza di goTo può cambiare anche il
  // target: interpola linearmente posizione, target e up invece dell'arco a
  // raggio costante di goTo, pensato per orbitare attorno a un target fisso)
  function flyTo(goalPos, goalTarget, goalUp) {
    if (axialActive) {
      axialActive = false;
      stage.controls.removeEventListener('start', rebase);
    }
    const cam = stage.camera;
    anim = {
      kind: 'fly',
      startPos: cam.position.clone(),
      goalPos: goalPos.clone(),
      startTarget: stage.controls.target.clone(),
      goalTarget: goalTarget.clone(),
      startUp: cam.up.clone(),
      goalUp: goalUp.clone(),
      t: 0,
      dur: 0.5,
    };
  }

  hitEl.addEventListener('pointermove', onMove);
  hitEl.addEventListener('pointerleave', onLeave);
  hitEl.addEventListener('click', onClick);

  return {
    get animating() {
      return !!anim;
    },
    // annulla lo stato interno del gizmo che sopravvive a un reset "Home":
    // un'animazione goTo/rotate in corso (altrimenti l'update() successivo
    // sovrascrive la posizione appena impostata da resetView) e la vista
    // assiale dall'alto (camera.up ruotato, ascoltatore 'start' per il
    // rebase) — senza questo, dopo un click su TOP o sulle frecce curve
    // "Reimposta vista" lascia un up-vector non verticale e la vista
    // successiva appare "storta" (roll indesiderato di OrbitControls)
    resetGizmoState() {
      anim = null;
      if (axialActive) {
        axialActive = false;
        stage.controls.removeEventListener('start', rebase);
      }
    },
    // anima il reset "Home" verso posizione/target/up dati (vedi flyTo):
    // a differenza di goTo interpola anche il target, quindi funziona pure
    // se la vista era stata spostata (pan) prima del reset
    animateReset(goalPos, goalTarget, goalUp) {
      flyTo(goalPos, goalTarget, goalUp ?? UP_Y);
    },
    // aggiorna il riferimento dell'anello dei cardinali: rotationDeg è il
    // modelRotation letto dall'INX (readInxRotation), mode è 'true' (nord
    // vero) o 'grid' (lato piatto del modello, cioè rotazione 0)
    setNorthReference(rotationDeg, mode) {
      modelRotationDeg = rotationDeg || 0;
      northMode = mode === 'grid' ? 'grid' : 'true';
      applyNorthReference();
    },
    // applica dall'esterno la stessa vista raggiunta con un click su
    // faccia/lettera (vedi onUserGoTo): usato per replicare sul pannello
    // gemello la rotazione avviata sull'altro, con la stessa animazione e
    // la stessa gestione della vista assiale (axialActive/rebase) di un
    // click reale, invece di copiare a mano posizione/up della camera.
    goTo(dirWorld, upOverride) {
      goTo(dirWorld, upOverride, true);
    },
    // ruota la vista di deltaDeg (gradi) attorno all'asse verticale, mantenendo
    // l'inclinazione corrente (frecce curve del gizmo): in vista assiale
    // dall'alto ruota l'up-vector (spin sul posto), altrimenti l'azimuth della
    // direzione camera→target, riusando l'animazione di goTo
    rotate(deltaDeg) {
      const rad = (deltaDeg || 0) * (Math.PI / 180);
      if (axialActive) {
        const newUp = (axialUpDir ?? UP_TOP).clone().applyAxisAngle(UP_Y, rad);
        goTo(new THREE.Vector3(0, 1, 0), newUp);
        return;
      }
      const cam = stage.camera;
      const dir = cam.position.clone().sub(stage.controls.target).normalize();
      goTo(dir.applyAxisAngle(UP_Y, rad));
    },
    // avanza l'animazione della camera principale; true finché è in corso
    update(delta) {
      if (!anim) return false;
      anim.t = Math.min(1, anim.t + delta / anim.dur);
      const e = anim.t < 0.5 ? 2 * anim.t * anim.t : 1 - Math.pow(-2 * anim.t + 2, 2) / 2; // easeInOutQuad
      const cam = stage.camera;
      if (anim.kind === 'fly') {
        // reset "Home": interpolazione lineare di posizione, target e up
        // (nessun arco a raggio costante: il target può cambiare, es. dopo un pan)
        cam.position.lerpVectors(anim.startPos, anim.goalPos, e);
        stage.controls.target.lerpVectors(anim.startTarget, anim.goalTarget, e);
        cam.up.copy(anim.startUp).lerp(anim.goalUp, e).normalize();
        cam.lookAt(stage.controls.target);
        if (anim.t >= 1) {
          anim = null;
          stage.controls.update();
        }
        return true;
      }
      const target = stage.controls.target;
      const dir = anim.startDir.clone().lerp(anim.goalDir, e);
      if (dir.lengthSq() < 1e-8) dir.copy(anim.goalDir); // direzioni opposte: salta al goal
      dir.normalize();
      cam.position.copy(target).addScaledVector(dir, anim.radius);
      cam.up.copy(anim.startUp).lerp(anim.goalUp, e).normalize();
      cam.lookAt(target);
      if (anim.t >= 1) {
        const { axialTop, radius, goalUp } = anim;
        anim = null;
        if (axialTop) {
          // fissa lo zenit esatto e sospendi OrbitControls fino al primo drag
          cam.up.copy(goalUp);
          cam.position.copy(target).addScaledVector(UP_Y, radius);
          cam.lookAt(target);
          axialActive = true;
          axialUpDir = goalUp.clone(); // ricordato per il rebase (vedi sopra)
          stage.controls.addEventListener('start', rebase);
        } else {
          stage.controls.update();
        }
      }
      return true;
    },
    // OrbitControls è stato ricreato (switch proiezione): riaggancia il rebase
    onControlsChanged() {
      if (axialActive) stage.controls.addEventListener('start', rebase);
    },
    // disegna il gizmo nell'angolo (chiamare dopo il render della scena).
    // I valori di viewport/scissor sono in pixel CSS: three.js li moltiplica
    // internamente per il pixelRatio, quindi qui NON vanno pre-moltiplicati.
    // Posizione ricavata da getBoundingClientRect (come pick/pickCardinal),
    // non da offsetParent/offsetLeft: questi dipendono dal più vicino
    // antenato posizionato, che con i pulsanti home/rotate del gizmo (vedi
    // .view-gizmo-wrap) non è più il contenitore a piena altezza del canvas.
    render(renderer) {
      root.quaternion.copy(stage.camera.quaternion).invert();
      const canvasRect = renderer.domElement.getBoundingClientRect();
      const hitRect = hitEl.getBoundingClientRect();
      if (!canvasRect.width || !canvasRect.height) return;
      const vx = hitRect.left - canvasRect.left;
      const vy = canvasRect.bottom - hitRect.bottom; // origine WebGL in basso a sinistra
      const vw = hitRect.width;
      const vh = hitRect.height;
      const prev = renderer.getViewport(new THREE.Vector4());
      renderer.setScissorTest(true);
      renderer.setScissor(vx, vy, vw, vh);
      renderer.setViewport(vx, vy, vw, vh);
      // renderer.render() cancella sempre color+depth all'inizio se autoClear
      // è true (vedi WebGLBackground.render in three.js), scissor rect incluso:
      // senza disattivarlo qui, questa seconda render() nel riquadro del gizmo
      // cancellerebbe i pixel del modello già disegnati lì dal render principale
      // (risultato: un riquadro a tinta unita al posto del modello sotto il
      // gizmo). Si disattiva autoClear e si cancella solo la depth a mano,
      // così il colore del render principale resta intatto sotto al gizmo.
      const prevAutoClear = renderer.autoClear;
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.render(scene, camera);
      renderer.autoClear = prevAutoClear;
      renderer.setScissorTest(false);
      renderer.setViewport(prev);
    },
    dispose() {
      if (axialActive) stage.controls.removeEventListener('start', rebase);
      hitEl.removeEventListener('pointermove', onMove);
      hitEl.removeEventListener('pointerleave', onLeave);
      hitEl.removeEventListener('click', onClick);
      scene.traverse((obj) => {
        obj.geometry?.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
        for (const m of mats) {
          m.map?.dispose();
          m.dispose();
        }
      });
    },
  };
}
