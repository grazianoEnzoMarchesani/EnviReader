// Viewer three.js del modello INX: gestisce renderer, camera orbitale e
// ricostruzione della scena quando cambia il modello. I toggle dei livelli e
// il wireframe agiscono sulla scena esistente senza ricostruirla.

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildModelScene, setLayerVisibility, setWireframe, disposeGroup } from '../lib/inxScene';

export default function Model3DViewer({ model, objectsVolume, flags, wireframe, resetNonce }) {
  const containerRef = useRef(null);
  const stageRef = useRef(null); // { renderer, scene, camera, controls, layers, resetView }

  // setup del renderer: una volta sola per montaggio
  useEffect(() => {
    const container = containerRef.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 20000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // mai sotto il terreno

    const stage = { renderer, scene, camera, controls, layers: null, resetView: () => {} };
    stageRef.current = stage;

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = container;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    let frame;
    const loop = () => {
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      stageRef.current = null;
    };
  }, []);

  // (ri)costruzione della scena al cambio di modello
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !model) return;
    const { group, layers, size, maxHeight } = buildModelScene(model, objectsVolume);
    stage.scene.add(group);
    stage.layers = layers;

    const radius = Math.max(size.W, size.H, maxHeight * 2);
    stage.resetView = () => {
      stage.camera.position.set(radius * 0.65, radius * 0.75, radius * 0.95);
      stage.controls.target.set(0, maxHeight / 4, 0);
      stage.controls.update();
    };
    stage.resetView();

    return () => {
      stage.scene.remove(group);
      disposeGroup(group);
      stage.layers = null;
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

  return <div ref={containerRef} className="model-canvas" />;
}
