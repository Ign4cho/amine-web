#!/usr/bin/env node
// Screenshot helper (CDP). Lanza Edge/Chrome headless con remote-debugging y usa
// Emulation.setDeviceMetricsOverride para forzar el viewport EXACTO (ancho/alto),
// independiente del tamaño de ventana. Esto es clave en Windows: `--window-size`
// se clampea al mínimo de ventana del SO (~500px), así que un "--w 390" con el
// método viejo (--screenshot) renderizaba en realidad a ~500px. Con CDP el
// viewport es el que pedimos → las capturas mobile coinciden con el dispositivo real.
//
// Uso:
//   node scripts/shot.mjs --out <archivo.png> [--url http://localhost:4321/]
//        [--w 390] [--h 1200] [--scale 1] [--crop TOP:HEIGHT] [--wait 2500] [--mobile true]
//
// EDGE: se puede sobreescribir la ruta con la env var EDGE_PATH.

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const out = arg('out');
if (!out) {
  console.error('Falta --out <archivo.png>');
  process.exit(1);
}
const url = arg('url', 'http://localhost:4321/');
const w = parseInt(arg('w', '390'), 10);
const h = parseInt(arg('h', '1200'), 10);
const scale = parseFloat(arg('scale', '1')); // deviceScaleFactor (DPR)
const crop = arg('crop'); // "TOP:HEIGHT"
const waitMs = parseInt(arg('wait', '2500'), 10); // espera tras load para imágenes
const mobile = arg('mobile', 'true') !== 'false';

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9200 + Math.floor(Math.random() * 700);
const userDir = join(tmpdir(), `cdp-shot-${port}`);

const proc = spawn(
  edge,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--no-first-run',
    '--disable-extensions',
    `--user-data-dir=${userDir}`,
    `--remote-debugging-port=${port}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);

// CDP request/response sobre el WebSocket nativo (Node 22+).
let msgId = 0;
function cmd(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    const onMsg = (ev) => {
      let m;
      try { m = JSON.parse(ev.data); } catch { return; }
      if (m.id === id) {
        ws.removeEventListener('message', onMsg);
        m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result);
      }
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

function waitForEvent(ws, eventName, timeoutMs) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => { ws.removeEventListener('message', onMsg); resolve(false); }, timeoutMs);
    const onMsg = (ev) => {
      let m;
      try { m = JSON.parse(ev.data); } catch { return; }
      if (m.method === eventName) {
        clearTimeout(timer);
        ws.removeEventListener('message', onMsg);
        resolve(true);
      }
    };
    ws.addEventListener('message', onMsg);
  });
}

async function newTargetWs() {
  // Crea una pestaña y devuelve su webSocketDebuggerUrl (target-level, sin sessionId).
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
      if (r.ok) {
        const j = await r.json();
        if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
      }
    } catch { /* aún no levantó */ }
    await sleep(200);
  }
  throw new Error('CDP no respondió a tiempo');
}

let failed = false;
try {
  const wsUrl = await newTargetWs();
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', () => rej(new Error('WS error')), { once: true });
  });

  await cmd(ws, 'Page.enable');
  await cmd(ws, 'Emulation.setDeviceMetricsOverride', {
    width: w,
    height: h,
    deviceScaleFactor: scale,
    mobile,
    screenWidth: w,
    screenHeight: h,
  });

  const loaded = waitForEvent(ws, 'Page.loadEventFired', 30000);
  await cmd(ws, 'Page.navigate', { url });
  await loaded;
  await sleep(waitMs);

  const { data } = await cmd(ws, 'Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: w, height: h, scale: 1 },
  });

  const buf = Buffer.from(data, 'base64');
  if (crop) {
    const [top, height] = crop.split(':').map((n) => parseInt(n, 10));
    const meta = await sharp(buf).metadata();
    const t = Math.max(0, Math.min(top, meta.height - 1));
    const hh = Math.min(height, meta.height - t);
    await sharp(buf).extract({ left: 0, top: t, width: meta.width, height: hh }).toFile(out);
  } else {
    await writeFile(out, buf);
  }
  ws.close();
} catch (e) {
  console.error('Error de captura:', e.message);
  failed = true;
} finally {
  try { proc.kill(); } catch {}
}

if (failed) process.exit(1);
console.log('OK ->', out);
