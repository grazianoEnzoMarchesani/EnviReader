// Controllo automatico: ciò che l'app contatta e memorizza deve coincidere con
// l'informativa (src/data/privacyText.js) e con la Content-Security-Policy di
// index.html. Fallisce (exit 1) se il codice aggiunge un host, una chiave di
// localStorage, un CDN o un'API di tracciamento non dichiarati.
//
//   npm run audit:privacy        (dopo `npm run build` controlla anche dist/)

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { STORAGE_KEYS, STORAGE_PREFIXES, PRIVACY_TEXT } from '../src/data/privacyText.js';

// Host che l'app contatta davvero (solo dopo consenso): devono comparire anche nella CSP
const NETWORK_HOSTS = ['tiles.openfreemap.org'];
// Host che compaiono solo come link cliccabili, attribuzioni o commenti
const LINK_HOSTS = [
  'github.com', 'openfreemap.org', 'www.openmaptiles.org', 'www.openstreetmap.org',
  'stamen.com', 'www.garanteprivacy.it', 'doi.org', 'www.envi-met.com', 'vite.dev',
  'www.w3.org', 'maplibre.org',
];
const FORBIDDEN_IN_SRC = [
  /document\.cookie/, /sendBeacon/, /\bgtag\s*\(/, /google-analytics|googletagmanager/i,
  /cdnjs\.cloudflare|cdn\.jsdelivr|unpkg\.com|fonts\.googleapis|fonts\.gstatic/i,
];

const root = new URL('..', import.meta.url).pathname;
const problems = [];
const fail = (msg) => problems.push(msg);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const TEXT_EXT = new Set(['.js', '.jsx', '.mjs', '.css', '.html', '.json']);
const sources = [...walk(join(root, 'src')), ...walk(join(root, 'public')), join(root, 'index.html')]
  .filter((f) => TEXT_EXT.has(extname(f)));

const allowedHosts = new Set([...NETWORK_HOSTS, ...LINK_HOSTS]);
const storageSeen = new Set();

for (const file of sources) {
  const rel = file.slice(root.length);
  // I file di dati cartografici non contengono né richieste né chiavi
  if (rel === 'src/data/tonerStyle.json' || rel.startsWith('public/map/')) continue;
  const text = readFileSync(file, 'utf8');

  for (const m of text.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) {
    if (!allowedHosts.has(m[1].toLowerCase())) fail(`${rel}: host non dichiarato "${m[1]}"`);
  }
  for (const re of FORBIDDEN_IN_SRC) {
    if (rel !== 'src/data/privacyText.js' && re.test(text)) fail(`${rel}: pattern vietato ${re}`);
  }
  for (const m of text.matchAll(/['"`](envireader\.[A-Za-z0-9._-]+)/g)) storageSeen.add(m[1]);
}

for (const key of storageSeen) {
  const ok = STORAGE_KEYS.includes(key) || STORAGE_PREFIXES.some((p) => key.startsWith(p));
  if (!ok) fail(`chiave di storage non dichiarata in privacyText.js: ${key}`);
}
for (const key of STORAGE_KEYS) {
  if (!storageSeen.has(key)) fail(`chiave dichiarata ma non più usata nel codice: ${key}`);
}

// CSP: gli host di rete devono essere esattamente quelli dichiarati
const html = readFileSync(join(root, 'index.html'), 'utf8');
const csp = html.match(/Content-Security-Policy"\s+content="([^"]+)"/)?.[1];
if (!csp) fail('index.html: Content-Security-Policy mancante');
else {
  const cspHosts = new Set([...csp.matchAll(/https:\/\/([a-z0-9.-]+)/gi)].map((m) => m[1]));
  for (const h of NETWORK_HOSTS) if (!cspHosts.has(h)) fail(`CSP: manca l'host ${h}`);
  for (const h of cspHosts) if (!NETWORK_HOSTS.includes(h)) fail(`CSP: host non dichiarato ${h}`);
  if (/unsafe-eval/.test(csp) || /script-src[^;]*unsafe-inline/.test(csp)) fail('CSP: script-src troppo permissiva');
}
if (!/name="referrer"\s+content="no-referrer"/.test(html)) fail('index.html: meta referrer no-referrer mancante');

// L'informativa deve nominare ogni servizio contattato
for (const [lang, t] of Object.entries(PRIVACY_TEXT)) {
  const flat = JSON.stringify(t);
  for (const needle of ['OpenFreeMap', 'GitHub Pages']) {
    if (!flat.includes(needle)) fail(`privacyText.js (${lang}): non nomina ${needle}`);
  }
}

// dist: nessun CDN, nessuno script esterno, host di rete solo quelli noti
const dist = join(root, 'dist');
if (existsSync(dist)) {
  for (const file of walk(dist).filter((f) => ['.js', '.html', '.css'].includes(extname(f)))) {
    const text = readFileSync(file, 'utf8');
    const rel = file.slice(root.length);
    if (/cdnjs\.cloudflare|cdn\.jsdelivr|unpkg\.com|fonts\.googleapis|fonts\.gstatic/i.test(text)) fail(`${rel}: riferimento a un CDN`);
    if (extname(file) === '.html' && /<script[^>]+src=["']https?:/i.test(text)) fail(`${rel}: script esterno`);
    if (extname(file) === '.html' && /<link[^>]+href=["']https?:/i.test(text)) fail(`${rel}: risorsa esterna`);
    for (const m of text.matchAll(/["'`](https?:\/\/[a-z0-9.-]+)[^"'`]*\{z\}/gi)) {
      const host = m[1].replace(/^https?:\/\//, '');
      if (!NETWORK_HOSTS.includes(host)) fail(`${rel}: sorgente di tile non dichiarata ${host}`);
    }
  }
} else {
  console.log('(dist/ assente: salto il controllo del bundle; esegui prima `npm run build`)');
}

if (problems.length) {
  console.error('privacy-audit: FALLITO\n - ' + problems.join('\n - '));
  process.exit(1);
}
console.log(`privacy-audit: ok (${sources.length} file sorgente, ${storageSeen.size} chiavi di storage, host di rete: ${NETWORK_HOSTS.join(', ')})`);
