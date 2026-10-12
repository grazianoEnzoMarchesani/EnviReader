import { setWorkerUrl } from 'maplibre-gl';
// maplibre-gl 6 cerca il worker come file separato accanto al suo modulo
// (./maplibre-gl-worker.mjs), che il bundler non copia in dist/: senza questo i
// tile vettoriali (sfondo "streets") non si decodificano mai. `?worker&url`
// impacchetta il worker con le sue dipendenze e ne dà l'URL locale (stesso sito,
// quindi coperto da worker-src 'self' della CSP).
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

setWorkerUrl(workerUrl);
