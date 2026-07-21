// Viewer three.js del modello INX: gestisce renderer, camera orbitale e
// ricostruzione della scena quando cambia il modello. I toggle dei livelli e
// il wireframe agiscono sulla scena esistente senza ricostruirla.
// Il gizmo di orientamento (ViewCube) e lo switch prospettica/parallela
// condividono lo stesso renderer/canvas (vedi viewCube.js e setProjection).

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildModelScene, setLayerVisibility, setWireframe, disposeGroup, updateSunLayer, setSunDiagram, setShadowCasting } from '../lib/inxScene';
import { createViewCube } from '../lib/viewCube';
import { useI18n } from '../i18n/I18nContext';

const DEG = Math.PI / 180;

export default function Model3DViewer({ model, objectsVolume, flags, wireframe, resetNonce, projection, sunEnabled, sunAzimuth, sunAltitude, sunPathPoints, sunDiagram, gizmoNorthMode }) {
  const { tr } = useI18n();
  const containerRef = useRef(null);
  const gizmoRef = useRef(null); // div overlay che intercetta i click del gizmo
  const stageRef = useRef(null); // { renderer, scene, camera, controls, layers, resetView, setProjection }
  const gizmoApiRef = useRef(null); // API del ViewCube (setNorthReference, ecc.)

  // setup del renderer: una volta sola per montaggio
  useEffect(() => {
    const container = containerRef.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
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

    // gizmo di orientamento nell'angolo in alto a destra
    const gizmo = createViewCube(stage, gizmoRef.current);
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

    const clock = new THREE.Clock();
    let frame;
    const loop = () => {
      const delta = clock.getDelta();
      // durante l'animazione del gizmo la camera è pilotata direttamente,
      // quindi si salta l'update (con damping) di OrbitControls
      const animating = gizmo.update(delta);
      if (!animating) stage.controls.update();
      renderer.render(stage.scene, stage.camera);
      gizmo.render(renderer);
      frame = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
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
    const { group, layers, size, maxHeight, hemisphereLight, decorativeLight, sunLayer } = buildModelScene(model, objectsVolume);
    stage.scene.add(group);
    stage.layers = layers;
    stage.hemisphereLight = hemisphereLight;
    stage.decorativeLight = decorativeLight;
    stage.sunLayer = sunLayer;

    const radius = Math.max(size.W, size.H, maxHeight * 2);
    const resetPos = new THREE.Vector3(radius * 0.65, radius * 0.75, radius * 0.95);
    const resetTarget = new THREE.Vector3(0, maxHeight / 4, 0);
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
        return;
      }
      gizmoApiRef.current?.animateReset(resetPos, resetTarget, new THREE.Vector3(0, 1, 0));
    };
    stage.resetView({ animate: false });

    return () => {
      stage.scene.remove(group);
      disposeGroup(group);
      stage.layers = null;
      stage.hemisphereLight = null;
      stage.decorativeLight = null;
      stage.sunLayer = null;
    };
  }, [model, objectsVolume]);

  // toggle dei livelli e wireframe, senza ricostruire
  useEffect(() => {
    const stage = stageRef.current;
    if (stage?.layers) setLayerVisibility(stage.layers, flags);
  }, [model, flags]);

  useEffect(() => {
    const stage = stageRef.current;
    if (stage?.layers) setWireframe(stage.layers, wireframe);
  }, [model, wireframe]);

  // "Reimposta vista" dalla sidebar
  useEffect(() => {
    if (resetNonce > 0) stageRef.current?.resetView();
  }, [resetNonce]);

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
        <button
          type="button"
          className="view-gizmo-btn view-gizmo-home"
          title={tr('gizmo_home_title')}
          aria-label={tr('gizmo_home_title')}
          onClick={() => stageRef.current?.resetView()}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 11.5 12 4l8.5 7.5" />
            <path d="M5.5 10v9a1 1 0 0 0 1 1h4V14h3v6h4a1 1 0 0 0 1-1v-9" />
          </svg>
        </button>
        <button
          type="button"
          className="view-gizmo-btn view-gizmo-rotate view-gizmo-rotate-ccw"
          title={tr('gizmo_rotate_ccw_title')}
          aria-label={tr('gizmo_rotate_ccw_title')}
          onClick={() => gizmoApiRef.current?.rotate(90)}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4a8 8 0 1 0 7.75 6" transform="scale(-1,1) translate(-24,0)" />
            <path d="M19 2v5h-5" transform="scale(-1,1) translate(-24,0)" />
          </svg>
        </button>
        <button
          type="button"
          className="view-gizmo-btn view-gizmo-rotate view-gizmo-rotate-cw"
          title={tr('gizmo_rotate_cw_title')}
          aria-label={tr('gizmo_rotate_cw_title')}
          onClick={() => gizmoApiRef.current?.rotate(-90)}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4a8 8 0 1 0 7.75 6" />
            <path d="M19 2v5h-5" />
          </svg>
        </button>
      </div>
    </>
  );
}
