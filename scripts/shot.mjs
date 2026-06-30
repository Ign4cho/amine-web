#!/usr/bin/env node
// Screenshot helper: lanza Edge headless, captura una URL y (opcional) recorta
// una banda vertical con sharp. Todo en un solo proceso `node` para que con
// una única regla de permiso (`Bash(node .../shot.mjs *)`) no haya que aprobar
// cada captura.
//
// Uso:
//   node scripts/shot.mjs --out <archivo.png> [--url http://localhost:4322/]
//        [--w 390] [--h 1200] [--scale 1] [--crop TOP:HEIGHT] [--wait 8000]
//
// Ejemplos:
//   node scripts/shot.mjs --out shot.png --w 390 --h 1150
//   node scripts/shot.mjs --out blog.png --w 390 --h 7200 --crop 5040:1290
//
// EDGE: se puede sobreescribir la ruta con la env var EDGE_PATH.

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { promisify } from 'node:util';
import sharp from 'sharp';

const run = promisify(execFile);

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const out = arg('out');
if (!out) {
  console.error('Falta --out <archivo.png>');
  process.exit(1);
}
const url = arg('url', 'http://localhost:4322/');
const w = parseInt(arg('w', '390'), 10);
const h = parseInt(arg('h', '1200'), 10);
const scale = arg('scale', '1');
const crop = arg('crop'); // "TOP:HEIGHT"
// Tiempo (ms) que el navegador "avanza" antes de capturar, para que las
// imágenes (PNGs pesados, lazy-load) terminen de cargar. Sin esto la captura
// dispara antes de tiempo y salen imágenes rotas.
const vtb = parseInt(arg('wait', '8000'), 10);

const EDGE_CANDIDATES = [
  process.env.EDGE_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].filter(Boolean);
const edge = EDGE_CANDIDATES.find((p) => existsSync(p));
if (!edge) {
  console.error('No encontré Edge/Chrome. Definí EDGE_PATH.');
  process.exit(1);
}

// Si se va a recortar, capturamos a un archivo temporal y luego recortamos.
const rawOut = crop ? out.replace(/\.png$/i, '') + '.raw.png' : out;

const flags = [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--hide-scrollbars',
  `--force-device-scale-factor=${scale}`,
  `--window-size=${w},${h}`,
  `--virtual-time-budget=${vtb}`,
  `--screenshot=${rawOut}`,
  url,
];

try {
  await run(edge, flags, { timeout: 60000 });
} catch (e) {
  // Edge a veces devuelve exit code != 0 por warnings aunque la captura salga bien.
  if (!existsSync(rawOut)) {
    console.error('Edge no generó la captura:', e.message);
    process.exit(1);
  }
}

if (crop) {
  const [top, height] = crop.split(':').map((n) => parseInt(n, 10));
  const meta = await sharp(rawOut).metadata();
  const t = Math.max(0, Math.min(top, meta.height - 1));
  const hh = Math.min(height, meta.height - t);
  await sharp(rawOut).extract({ left: 0, top: t, width: meta.width, height: hh }).toFile(out);
}

console.log('OK ->', out);
