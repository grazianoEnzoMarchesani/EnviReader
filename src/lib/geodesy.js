// Conversione da coordinate proiettate UTM (WGS84) a lon/lat geografiche.
//
// Serve perché l'INX porta due georeferenziazioni diverse per lo stesso punto:
// `realworldLowerLeft_X/Y` (UTM, precisione centimetrica) e
// `location_Longitude/Latitude`, che gli esportatori scrivono arrotondato —
// QGIS ad esempio a 2 decimali, cioè fino a ~600 m di errore alle nostre
// latitudini. Dove ci sono le UTM vanno usate quelle.
//
// Formule inverse di Snyder (USGS Professional Paper 1395, cap. 8), le stesse
// che usa proj4: sviluppo in serie sufficiente ben oltre la precisione utile
// qui (errore sub-millimetrico entro la zona).

const A = 6378137; // semiasse maggiore WGS84
const F = 1 / 298.257223563; // schiacciamento WGS84
const K0 = 0.9996; // fattore di scala sul meridiano centrale UTM
const E2 = 2 * F - F * F; // eccentricità al quadrato
const EP2 = E2 / (1 - E2); // eccentricità seconda al quadrato

export function utmToLngLat(easting, northing, zone, northernHemisphere = true) {
  const x = easting - 500000; // falso est
  const y = northernHemisphere ? northing : northing - 10000000; // falso nord a sud dell'equatore
  const lon0 = ((zone * 6 - 183) * Math.PI) / 180; // meridiano centrale della zona

  const m = y / K0;
  const mu = m / (A * (1 - E2 / 4 - (3 * E2 * E2) / 64 - (5 * E2 ** 3) / 256));
  const e1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2));
  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);

  const sinPhi1 = Math.sin(phi1);
  const c1 = EP2 * Math.cos(phi1) ** 2;
  const t1 = Math.tan(phi1) ** 2;
  const n1 = A / Math.sqrt(1 - E2 * sinPhi1 * sinPhi1);
  const r1 = (A * (1 - E2)) / (1 - E2 * sinPhi1 * sinPhi1) ** 1.5;
  const d = x / (n1 * K0);

  const lat =
    phi1 -
    ((n1 * Math.tan(phi1)) / r1) *
      ((d * d) / 2 -
        ((5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * EP2) * d ** 4) / 24 +
        ((61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * EP2 - 3 * c1 * c1) * d ** 6) / 720);
  const lon =
    lon0 +
    (d -
      ((1 + 2 * t1 + c1) * d ** 3) / 6 +
      ((5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * EP2 + 24 * t1 * t1) * d ** 5) / 120) /
      Math.cos(phi1);

  return [(lon * 180) / Math.PI, (lat * 180) / Math.PI];
}

// Punto geografico dell'angolo sud-ovest del dominio (la "lower left grid"
// dell'INX). Preferisce sempre le UTM quando ci sono; `location_Longitude/
// Latitude` è lo stesso punto ma arrotondato, quindi resta solo come ripiego
// per i file che non portano la georeferenziazione proiettata (es. esportati
// da Grasshopper, che lascia realworldLowerLeft a 0).
export function lowerLeftLngLat(location) {
  if (!location) return null;
  const { utm } = location;
  if (utm && Number.isFinite(utm.x) && Number.isFinite(utm.y) && Number.isFinite(utm.zone)) {
    return utmToLngLat(utm.x, utm.y, utm.zone, utm.north);
  }
  if (Number.isFinite(location.longitude) && Number.isFinite(location.latitude)) {
    return [location.longitude, location.latitude];
  }
  return null;
}
