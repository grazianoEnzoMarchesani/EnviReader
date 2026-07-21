// Posizione del sole (azimuth/altitudine) per una data, ora del giorno e
// coordinate geografiche date. Algoritmo solare NOAA (precisione ~0.01°),
// sufficiente per una visualizzazione: non serve la precisione astronomica
// completa (es. parallasse, rifrazione) usata per calcoli scientifici.
//
// In assenza di un fuso orario esplicito nel file INX, si stima l'offset UTC
// dal meridiano standard più vicino alla longitudine del sito.

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

function julianDay(dateOnly) {
  return Date.UTC(dateOnly.getFullYear(), dateOnly.getMonth(), dateOnly.getDate()) / 86400000 + 2440587.5;
}

function julianCentury(jd) {
  return (jd - 2451545) / 36525;
}

function geomMeanLongSun(t) {
  const l = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
  return l < 0 ? l + 360 : l;
}
function geomMeanAnomalySun(t) {
  return 357.52911 + t * (35999.05029 - 0.0001537 * t);
}
function eccentricityEarthOrbit(t) {
  return 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
}
function sunEqOfCenter(t) {
  const m = geomMeanAnomalySun(t) * DEG;
  return (
    Math.sin(m) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * m) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * m) * 0.000289
  );
}
function sunTrueLong(t) {
  return geomMeanLongSun(t) + sunEqOfCenter(t);
}
function sunAppLong(t) {
  return sunTrueLong(t) - 0.00569 - 0.00478 * Math.sin((125.04 - 1934.136 * t) * DEG);
}
function meanObliquityOfEcliptic(t) {
  return 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
}
function obliquityCorrection(t) {
  return meanObliquityOfEcliptic(t) + 0.00256 * Math.cos((125.04 - 1934.136 * t) * DEG);
}
function sunDeclination(t) {
  const e = obliquityCorrection(t) * DEG;
  const lambda = sunAppLong(t) * DEG;
  return Math.asin(Math.sin(e) * Math.sin(lambda)) * RAD;
}
function equationOfTime(t) {
  const epsilon = obliquityCorrection(t) * DEG;
  const l0 = geomMeanLongSun(t) * DEG;
  const e = eccentricityEarthOrbit(t);
  const m = geomMeanAnomalySun(t) * DEG;
  const y = Math.tan(epsilon / 2) ** 2;
  const eot =
    y * Math.sin(2 * l0) -
    2 * e * Math.sin(m) +
    4 * e * y * Math.sin(m) * Math.cos(2 * l0) -
    0.5 * y * y * Math.sin(4 * l0) -
    1.25 * e * e * Math.sin(2 * m);
  return 4 * eot * RAD; // minuti
}

// Offset UTC (ore) stimato dal meridiano standard più vicino alla longitudine.
export function estimateTimezoneOffset(longitude) {
  return Math.round(longitude / 15);
}

// dateOnly: Date (si usano solo anno/mese/giorno, in ora locale del browser).
// hour: ora del giorno decimale (0-24) nel fuso `tzOffset` (ore rispetto a UTC).
// Ritorna { azimuth, altitude } in gradi: azimuth 0=nord, 90=est, 180=sud, 270=ovest.
export function sunPosition(dateOnly, hour, lat, lon, tzOffset) {
  const jd = julianDay(dateOnly);
  const t = julianCentury(jd + (hour - tzOffset) / 24);
  const eot = equationOfTime(t);
  const decl = sunDeclination(t);

  let trueSolarTime = (hour * 60 + eot + 4 * lon - 60 * tzOffset) % 1440;
  if (trueSolarTime < 0) trueSolarTime += 1440;
  let hourAngle = trueSolarTime / 4 - 180;
  if (hourAngle < -180) hourAngle += 360;

  const latRad = lat * DEG;
  const declRad = decl * DEG;
  const haRad = hourAngle * DEG;

  const cosZenith = Math.sin(latRad) * Math.sin(declRad) + Math.cos(latRad) * Math.cos(declRad) * Math.cos(haRad);
  const zenith = Math.acos(Math.min(1, Math.max(-1, cosZenith)));
  const altitude = 90 - zenith * RAD;

  const sinZenith = Math.sin(zenith);
  let azimuth;
  if (sinZenith < 1e-6) {
    azimuth = 0; // sole allo zenit/nadir: azimuth indefinito
  } else {
    const cosAz = (Math.sin(declRad) - Math.sin(latRad) * Math.cos(zenith)) / (Math.cos(latRad) * sinZenith);
    const azAcos = Math.acos(Math.min(1, Math.max(-1, cosAz))) * RAD;
    azimuth = hourAngle > 0 ? 360 - azAcos : azAcos;
  }

  return { azimuth, altitude };
}

// Campiona la posizione del sole lungo l'intera giornata (passo in ore,
// default 10 minuti): usato per disegnare l'arco del percorso solare.
export function sunPathSamples(dateOnly, lat, lon, tzOffset, stepHours = 1 / 6) {
  const samples = [];
  for (let hour = 0; hour < 24; hour += stepHours) {
    const { azimuth, altitude } = sunPosition(dateOnly, hour, lat, lon, tzOffset);
    samples.push({ hour, azimuth, altitude });
  }
  return samples;
}

// Rete annuale del percorso solare per il diagramma della cupola celeste.
// Descrive l'inviluppo del sole tra il solstizio d'estate e quello d'inverno
// tramite due famiglie di curve:
//  - dateArcs: un arco giornaliero per mese (il 21), da orizzonte a orizzonte;
//    giugno/dicembre sono i solstizi (archi estremi).
//  - analemmas: per ogni ora dell'orologio, la stessa ora campionata lungo
//    l'anno (la classica curva a "8"), che lega insieme gli archi giornalieri.
// Dipende solo dalla località, quindi si calcola una volta sola (non per data).
export function sunDiagramCurves(lat, lon, tzOffset, year = new Date().getFullYear()) {
  const dateArcs = [];
  for (let m = 0; m < 12; m++) {
    const date = new Date(year, m, 21);
    const samples = [];
    for (let hour = 0; hour <= 24; hour += 1 / 12) {
      const { azimuth, altitude } = sunPosition(date, hour, lat, lon, tzOffset);
      samples.push({ azimuth, altitude });
    }
    dateArcs.push({ month: m, solstice: m === 5 ? 'summer' : m === 11 ? 'winter' : null, samples });
  }

  const analemmas = [];
  for (let hour = 3; hour <= 21; hour++) {
    const samples = [];
    for (let day = 0; day <= 366; day += 7) {
      const date = new Date(year, 0, 1 + day);
      const { azimuth, altitude } = sunPosition(date, hour, lat, lon, tzOffset);
      samples.push({ azimuth, altitude });
    }
    analemmas.push({ hour, samples });
  }

  return { dateArcs, analemmas };
}
