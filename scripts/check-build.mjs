#!/usr/bin/env node
// Chequeo de integridad del build (post-build). Corre sobre dist/ y falla
// (exit 1) si algo está roto, para no subir a Hostinger un build inconsistente.
//
// Valida:
//   1. Se generaron todas las páginas esperadas.
//   2. Ninguna referencia root-relative (assets, _astro, favicons, CSS url())
//      apunta a un archivo que no existe en dist/  → assets rotos.
//   3. Los links internos de navegación (/aliados, /contactanos, ...) resuelven
//      a una página realmente generada  → links rotos.
//   4. Cada página tiene <title>, navbar y footer (que el Layout no se rompió).
//   5. Coherencia del noindex: prod NO debe llevar noindex; preview SÍ.
//
// Uso:  node scripts/check-build.mjs [--mode prod|preview] [--dist dist]

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname, posix } from 'node:path';

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const DIST = arg('dist', 'dist');
const MODE = arg('mode', 'prod'); // prod | preview

const errors = [];
const err = (m) => errors.push(m);

if (!existsSync(DIST)) {
  console.error(`✗ No existe ${DIST}/ — corré el build primero.`);
  process.exit(1);
}

// ── 1. Páginas esperadas ──────────────────────────────────────────────
const EXPECTED_PAGES = [
  'index.html',
  'aliados/index.html',
  'contactanos/index.html',
  'blogcito/index.html',
  'admin/index.html',
];
for (const p of EXPECTED_PAGES) {
  if (!existsSync(join(DIST, p))) err(`Falta la página: ${p}`);
}

// Junta todos los .html generados.
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}
const allFiles = walk(DIST);
const htmlFiles = allFiles.filter((f) => f.endsWith('.html'));
const cssFiles = allFiles.filter((f) => f.endsWith('.css'));

// Set de rutas existentes en dist (normalizadas a "/...").
const distSet = new Set(
  allFiles.map((f) => '/' + f.slice(DIST.length + 1).split('\\').join('/')),
);
// ¿Existe un archivo servible para esta ruta root-relative?
function resolves(p) {
  // decodifica, saca query/hash
  let clean = decodeURIComponent(p.split('#')[0].split('?')[0]);
  if (distSet.has(clean)) return true;
  // ruta de página sin extensión → /x → /x/index.html o /x.html
  if (!extname(clean)) {
    const a = posix.join(clean, 'index.html');
    const b = clean.replace(/\/$/, '') + '/index.html';
    if (distSet.has(a) || distSet.has(b) || distSet.has(clean.replace(/\/$/, '') + '.html')) return true;
  }
  return false;
}

// ── Extrae referencias root-relative de HTML y CSS ────────────────────
function refsFrom(text) {
  const refs = new Set();
  // src="/..", href="/..", (no //, no http, no mailto/tel/#)
  const attrRe = /(?:src|href)\s*=\s*["']([^"']+)["']/g;
  const urlRe = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
  const srcsetRe = /srcset\s*=\s*["']([^"']+)["']/g;
  let m;
  const add = (v) => {
    v = v.trim();
    if (v.startsWith('/') && !v.startsWith('//')) refs.add(v);
  };
  while ((m = attrRe.exec(text))) add(m[1]);
  while ((m = urlRe.exec(text))) add(m[1]);
  while ((m = srcsetRe.exec(text))) {
    for (const part of m[1].split(',')) add(part.trim().split(/\s+/)[0]);
  }
  return refs;
}

// ── 2/3/4. Por cada HTML ──────────────────────────────────────────────
for (const file of htmlFiles) {
  const rel = file.slice(DIST.length + 1).split('\\').join('/');
  const html = readFileSync(file, 'utf8');

  // 4. estructura mínima (admin queda exento del footer/nav por ser gate)
  if (!/<title[ >]/.test(html)) err(`${rel}: sin <title>`);
  if (rel !== 'admin/index.html') {
    if (!/navbar-root|nav-tab/.test(html)) err(`${rel}: sin navbar`);
    if (!/footer-root/.test(html)) err(`${rel}: sin footer`);
  }

  // 2/3. referencias
  for (const ref of refsFrom(html)) {
    if (!resolves(ref)) err(`${rel}: referencia rota → ${ref}`);
  }
}

// CSS externos (url(...) a assets)
for (const file of cssFiles) {
  const rel = file.slice(DIST.length + 1).split('\\').join('/');
  const css = readFileSync(file, 'utf8');
  for (const ref of refsFrom(css)) {
    if (!resolves(ref)) err(`${rel}: url() rota → ${ref}`);
  }
}

// ── 5. noindex coherente con el modo ──────────────────────────────────
const home = existsSync(join(DIST, 'index.html'))
  ? readFileSync(join(DIST, 'index.html'), 'utf8')
  : '';
const hasNoindex = /name=["']robots["'][^>]*noindex/i.test(home);
if (MODE === 'prod' && hasNoindex) {
  err('Build PROD con <meta robots noindex> — no subir a espacioamine.com así.');
}
if (MODE === 'preview' && !hasNoindex) {
  err('Build PREVIEW sin noindex — el subdominio quedaría indexable por Google.');
}

// ── Reporte ───────────────────────────────────────────────────────────
if (errors.length) {
  console.error(`\n✗ check-build (${MODE}): ${errors.length} problema(s):`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(
  `✓ check-build (${MODE}): OK — ${htmlFiles.length} páginas, refs y noindex consistentes.`,
);
