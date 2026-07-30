import { useEffect, useRef } from 'react';
import * as THREE from 'three';
// maplibre-gl non ha un default export (solo named export, vedi dist/maplibre-gl.mjs)
import { Map as MapLibreMap, NavigationControl, MercatorCoordinate } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { buildModelScene, buildDataOverlay, disposeGroup, setLayerVisibility, setWireframe } from '../lib/inxScene';
import { lowerLeftLngLat } from '../lib/geodesy';

// Sorgenti raster senza API key. Niente tile OpenStreetMap: il loro server
// non manda header CORS, quindi maplibre-gl (che carica i tile come texture
// WebGL) li rifiuta con un errore di sicurezza — a differenza di Leaflet, che
// li mostra come semplici <img> e non ha questo problema. I servizi ArcGIS
// Online supportano CORS e coprono sia satellite che stradale.
const BASEMAP_SOURCES = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
  streets: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
};

function buildStyle() {
  const sources = {};
  const layers = [];
  for (const [key, src] of Object.entries(BASEMAP_SOURCES)) {
    sources[key] = { type: 'raster', tiles: [src.url], tileSize: 256, maxzoom: 19, attribution: src.attribution };
    layers.push({ id: key, type: 'raster', source: key, layout: { visibility: 'none' } });
  }
  return { version: 8, sources, layers };
}

// Zoom iniziale che fa stare per intero l'estensione del dominio (con un
// margine) nella finestra della mappa, alla latitudine del sito.
function estimateInitialZoom(spanMeters, latitude, viewportPx = 900) {
  const metersPerPixelEquatorAtZ0 = 156543.03392;
  const metersPerPixelTarget = (spanMeters * 1.6) / viewportPx;
  const z = Math.log2((metersPerPixelEquatorAtZ0 * Math.cos((latitude * Math.PI) / 180)) / metersPerPixelTarget);
  return Math.min(20, Math.max(14, z));
}

// Trasformazione locale (metri, Y=quota) -> spazio mercatore di maplibre.
// Ancora = coordinate mercatore del punto lat/lon del sito (INX), spostata
// dell'offset di calibrazione (est/nord in metri). La rotazione combina: la
// rotazione del modello rispetto al nord (letta dall'INX, regolabile) più il
// passaggio da assi Y-up (three.js) a Z-up (mercatore) — derivazione basata
// sulla stessa convenzione "-X=est, +Z=nord a rotazione 0" già usata per il
// sole in inxScene.js (sunDirection), dove trueEast/trueNord = RotateY(theta)
// applicata alla base (-1,0,0)/(0,0,1). Invertendo quella base si ottiene la
// mappa locale->est/nord corretta: serve un ribaltamento dell'asse X prima
// del passaggio Y-up->Z-up (altrimenti la componente nord-sud risulta
// specchiata, verificato algebricamente componente per componente) e una
// rotazione di -rotazione_totale (non 180°-rotazione_totale come in una
// versione precedente, che produceva un modello rototraslato male). "invert"
// resta una via di fuga se il segno di rotazione letto dall'INX risultasse
// comunque opposto a quello atteso sul sito reale.
//
// L'ancora geografica (vedi lowerLeftLngLat in geodesy.js) è l'angolo sud-ovest
// del BOUNDING BOX del dominio ruotato — non il centro, e non la cella d'origine
// della griglia. Verificato per registrazione sul dataset pais: sovrapponendo le
// celle asfalto del modello alle strade OpenStreetMap, la posizione corretta sta
// 132 m a est della cella d'origine, e l'angolo ovest del bounding box la spiega
// a 1,3 m su una ricerca di ±600 m.
//
// ATTENZIONE, residuo noto: sullo stesso dataset la registrazione chiede anche
// +30 m verso nord, che il bounding box non spiega (il suo bordo sud coincide
// con la cella d'origine, quindi prevede 0). Il valore è vicino alla fascia di
// nesting proiettata — nest*dx*(|cos|+|sin|) = 32,8 m con 7 grid da 3,5 m e
// rotazione -26,07° — ma con un solo file georeferenziato a disposizione non si
// distingue da una coincidenza, e applicare la stessa fascia anche a est
// peggiorerebbe quella componente di 34 m. Finché non c'è un secondo progetto
// geodata2ENVI-met con rotazione o nesting diversi, resta da compensare a mano
// con l'offset nord della calibrazione.
//
// buildModelScene centra il gruppo three.js sull'origine (toX/toZ in
// inxScene.js) e con la convenzione qui sopra a rotazione 0 vale est = -x,
// nord = +z. Il bounding box va quindi calcolato ruotando i quattro angoli del
// dominio e prendendo l'estremo ovest/sud, che in genere non è un vertice del
// modello ma il punto d'incontro delle due tangenti.
function domainRotation(calibration, modelRotationDeg) {
  const sign = calibration.invert ? -1 : 1;
  const thetaDeg = sign * ((modelRotationDeg || 0) + (calibration.rotationDeg || 0));
  const phi = -(thetaDeg * Math.PI) / 180;
  return new THREE.Matrix4()
    .makeRotationX(Math.PI / 2)
    .multiply(new THREE.Matrix4().makeScale(-1, 1, 1))
    .multiply(new THREE.Matrix4().makeRotationY(phi));
}

// Mercatore del centro del dominio: l'origine locale del gruppo three.js, cioè
// la traslazione della matrice di buildLocalTransform. Isolata perché serve
// anche per centrare la camera della mappa.
function domainCenterMerc(anchorLngLat, calibration, modelRotationDeg, domainSize) {
  const anchor = MercatorCoordinate.fromLngLat(anchorLngLat, 0);
  const metersToMerc = anchor.meterInMercatorCoordinateUnits();
  const rotate = domainRotation(calibration, modelRotationDeg);

  const { W, H } = domainSize;
  const corners = [
    [W / 2, H / 2],
    [W / 2, -H / 2],
    [-W / 2, H / 2],
    [-W / 2, -H / 2],
  ].map(([x, z]) => new THREE.Vector3(x, 0, z).applyMatrix4(rotate));
  // X mercatore cresce verso est, Y verso SUD: l'angolo sud-ovest del bounding
  // box è quindi (X minima, Y massima).
  const refX = Math.min(...corners.map((c) => c.x));
  const refY = Math.max(...corners.map((c) => c.y));

  return {
    metersToMerc,
    rotate,
    x: anchor.x + (calibration.offsetEast || 0) * metersToMerc - refX * metersToMerc,
    y: anchor.y - (calibration.offsetNorth || 0) * metersToMerc - refY * metersToMerc,
    z: anchor.z,
  };
}

function buildLocalTransform(anchorLngLat, calibration, modelRotationDeg, domainSize) {
  const { x, y, z, metersToMerc, rotate } = domainCenterMerc(anchorLngLat, calibration, modelRotationDeg, domainSize);
  return new THREE.Matrix4()
    .makeTranslation(x, y, z)
    .scale(new THREE.Vector3(metersToMerc, metersToMerc, metersToMerc))
    .multiply(rotate);
}

function domainCenterLngLat(anchorLngLat, calibration, modelRotationDeg, domainSize) {
  const { x, y } = domainCenterMerc(anchorLngLat, calibration, modelRotationDeg, domainSize);
  const { lng, lat } = new MercatorCoordinate(x, y, 0).toLngLat();
  return [lng, lat];
}

export default function WebGisViewer({ model, objectsVolume, spacingZ, dimZ, dataOverlay, flags, wireframe, objectStyle, calibration, basemap }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const stageRef = useRef(null); // { scene, camera, renderer, group, layers, dataOverlayLayer }
  const actionsRef = useRef(null); // { rebuildModel, applyFlags, rebuildDataOverlay, applyBasemap }
  const calibrationRef = useRef(calibration);
  const anchorRef = useRef(lowerLeftLngLat(model.location));
  const rotationDegRef = useRef(model.location.rotation || 0);

  // Props sempre fresche per le callback async di maplibre (evento 'load' del
  // custom layer, che può arrivare in qualunque momento dopo il mount).
  const propsRef = useRef(null);
  propsRef.current = { model, objectsVolume, spacingZ, dimZ, dataOverlay, flags, wireframe, objectStyle, basemap };

  calibrationRef.current = calibration;

  useEffect(() => {
    const next = lowerLeftLngLat(model.location);
    const changed = anchorRef.current?.[0] !== next?.[0] || anchorRef.current?.[1] !== next?.[1];
    anchorRef.current = next;
    rotationDegRef.current = model.location.rotation || 0;
    if (changed && next && mapRef.current?.loaded()) {
      const { I, J, dx, dy } = model.geometry;
      const zoom = estimateInitialZoom(Math.max(I * dx, J * dy), next[1], containerRef.current?.clientWidth || 900);
      const domainSize = { W: I * dx, H: J * dy };
      const center = domainCenterLngLat(next, calibrationRef.current, rotationDegRef.current, domainSize);
      mapRef.current.jumpTo({ center, zoom });
    }
    mapRef.current?.triggerRepaint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.location, model.location.rotation]);

  useEffect(() => {
    mapRef.current?.triggerRepaint();
  }, [calibration]);

  // Setup mappa + custom layer three.js: una sola volta per montaggio
  useEffect(() => {
    const { I, J, dx, dy } = propsRef.current.model.geometry;
    const domainSize = { W: I * dx, H: J * dy };
    const [lng, lat] = domainCenterLngLat(anchorRef.current, calibrationRef.current, rotationDegRef.current, domainSize);
    const zoom = estimateInitialZoom(Math.max(I * dx, J * dy), lat, containerRef.current.clientWidth || 900);

    const map = new MapLibreMap({
      container: containerRef.current,
      style: buildStyle(),
      center: [lng, lat],
      zoom,
      pitch: 55,
      bearing: 0,
      antialias: true,
      attributionControl: { compact: true },
    });
    map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right');
    mapRef.current = map;

    const rebuildModel = () => {
      const stage = stageRef.current;
      if (!stage) return;
      const { model: m, objectsVolume: ov, spacingZ: sz, dimZ: dz, objectStyle: os, flags: fl, wireframe: wf } = propsRef.current;
      const old = stage.group;
      const { group, layers } = buildModelScene(m, ov, sz, dz, os || 'default');
      stage.scene.add(group);
      stage.group = group;
      stage.layers = layers;
      setLayerVisibility(layers, fl);
      setWireframe(layers, !!wf);
      if (old) {
        stage.scene.remove(old);
        disposeGroup(old);
      }
      map.triggerRepaint();
    };

    const applyFlags = () => {
      const stage = stageRef.current;
      if (!stage?.layers) return;
      setLayerVisibility(stage.layers, propsRef.current.flags);
      setWireframe(stage.layers, !!propsRef.current.wireframe);
      map.triggerRepaint();
    };

    const rebuildDataOverlay = () => {
      const stage = stageRef.current;
      if (!stage) return;
      const old = stage.dataOverlayLayer;
      if (old) {
        stage.scene.remove(old);
        disposeGroup(old);
        stage.dataOverlayLayer = null;
      }
      const { model: m, dataOverlay: overlay } = propsRef.current;
      if (overlay) {
        const layer = buildDataOverlay(m, overlay);
        if (layer) {
          stage.scene.add(layer);
          stage.dataOverlayLayer = layer;
        }
      }
      map.triggerRepaint();
    };

    const applyBasemap = () => {
      for (const key of Object.keys(BASEMAP_SOURCES)) {
        if (map.getLayer(key)) map.setLayoutProperty(key, 'visibility', key === propsRef.current.basemap ? 'visible' : 'none');
      }
    };

    actionsRef.current = { rebuildModel, applyFlags, rebuildDataOverlay, applyBasemap };

    const customLayer = {
      id: 'webgis-model-layer',
      type: 'custom',
      renderingMode: '3d',
      onAdd(_map, gl) {
        const scene = new THREE.Scene();
        const camera = new THREE.Camera();
        const renderer = new THREE.WebGLRenderer({ canvas: _map.getCanvas(), context: gl, antialias: true });
        renderer.autoClear = false;
        stageRef.current = { scene, camera, renderer, group: null, layers: null, dataOverlayLayer: null };
      },
      render(gl, options) {
        const stage = stageRef.current;
        if (!stage?.group || !anchorRef.current) return;
        const { I, J, dx, dy } = propsRef.current.model.geometry;
        const domainSize = { W: I * dx, H: J * dy };
        const local = buildLocalTransform(anchorRef.current, calibrationRef.current, rotationDegRef.current, domainSize);
        // MapLibre v6: il secondo argomento non è più la matrice piatta ma un
        // oggetto (CustomRenderMethodInput); la matrice mondo->clip equivalente
        // alla vecchia `matrix` è defaultProjectionData.mainMatrix (vedi esempio
        // ufficiale "add-a-3d-model-using-threejs" del repo maplibre-gl-js).
        stage.camera.projectionMatrix = new THREE.Matrix4().fromArray(options.defaultProjectionData.mainMatrix).multiply(local);
        stage.renderer.resetState();
        stage.renderer.render(stage.scene, stage.camera);
      },
    };

    map.on('load', () => {
      map.addLayer(customLayer);
      applyBasemap();
      rebuildModel();
      rebuildDataOverlay();
    });

    return () => {
      const stage = stageRef.current;
      if (stage?.group) disposeGroup(stage.group);
      if (stage?.dataOverlayLayer) disposeGroup(stage.dataOverlayLayer);
      map.remove();
      mapRef.current = null;
      stageRef.current = null;
      actionsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mapRef.current?.loaded()) actionsRef.current?.applyBasemap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basemap]);

  useEffect(() => {
    if (mapRef.current?.loaded()) actionsRef.current?.rebuildModel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, objectsVolume, spacingZ, dimZ, objectStyle]);

  useEffect(() => {
    if (mapRef.current?.loaded()) actionsRef.current?.applyFlags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flags, wireframe]);

  useEffect(() => {
    if (mapRef.current?.loaded()) actionsRef.current?.rebuildDataOverlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataOverlay]);

  return <div ref={containerRef} className="webgis-map" />;
}
