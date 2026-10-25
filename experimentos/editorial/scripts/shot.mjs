#!/usr/bin/env node
// Captura con viewport exacto vía CDP (basado en amine-web/scripts/shot.mjs).
// Extras: --full recorre la página para disparar las apariciones y captura
// todo el alto; --eval ejecuta JS en la página antes de capturar.
//
//   node scripts/shot.mjs --out x.png --url http://localhost:4321/ --w 390 --h 844
//        [--full true] [--eval "js"] [--wait 1500] [--mobile true|false]

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const out = arg('out');
if (!out) { console.error('Falta --out <archivo.png>'); process.exit(1); }
const url = arg('url', 'http://localhost:4321/');
const w = parseInt(arg('w', '390'), 10);
const h = parseInt(arg('h', '844'), 10);
const waitMs = parseInt(arg('wait', '1500'), 10);
const mobile = arg('mobile', w < 800 ? 'true' : 'false') !== 'false';
const full = arg('full', 'false') === 'true';
const evalJs = arg('eval');
const hide = arg('hide'); // selector de elementos fijos a ocultar después del primer tramo

const browser = [
  process.env.EDGE_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].filter(Boolean).find((p) => existsSync(p));
if (!browser) { console.error('No encontré Edge/Chrome. Definí EDGE_PATH.'); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9200 + Math.floor(Math.random() * 700);
const proc = spawn(browser, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--no-first-run',
  '--disable-extensions', '--autoplay-policy=no-user-gesture-required',
  `--user-data-dir=${join(tmpdir(), `cdp-shot-${port}`)}`, `--remote-debugging-port=${port}`, 'about:blank',
], { stdio: 'ignore' });

let msgId = 0;
function cmd(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    const onMsg = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id !== id) return;
      ws.removeEventListener('message', onMsg);
      m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result);
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify({ id, method, params }));
  });
}
const evaluate = async (ws, expression) =>
  (await cmd(ws, 'Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.value;

let failed = false;
try {
  let wsUrl;
  for (let i = 0; i < 60 && !wsUrl; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
      if (r.ok) wsUrl = (await r.json()).webSocketDebuggerUrl;
    } catch { /* todavía no levantó */ }
    if (!wsUrl) await sleep(200);
  }
  if (!wsUrl) throw new Error('CDP no respondió');
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });

  const errors = [];
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.exception?.description || 'exception');
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value).join(' '));
  });
  await cmd(ws, 'Page.enable');
  await cmd(ws, 'Runtime.enable');
  await cmd(ws, 'Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile, screenWidth: w, screenHeight: h });
  if (mobile) await cmd(ws, 'Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

  const loaded = new Promise((res) => {
    const t = setTimeout(res, 30000);
    ws.addEventListener('message', (ev) => { if (JSON.parse(ev.data).method === 'Page.loadEventFired') { clearTimeout(t); res(); } });
  });
  await cmd(ws, 'Page.navigate', { url });
  await loaded;
  await evaluate(ws, 'document.fonts.ready.then(() => true)');
  await sleep(waitMs);

  let height = h;
  if (full) {
    height = await evaluate(ws, 'document.documentElement.scrollHeight');
    for (let y = 0; y < height; y += Math.round(h * 0.6)) { await evaluate(ws, `window.scrollTo(0, ${y})`); await sleep(160); }
    await evaluate(ws, 'window.scrollTo(0, 0)');
    await sleep(900);
    height = await evaluate(ws, 'document.documentElement.scrollHeight');
  }
  if (evalJs) { console.log('eval ->', JSON.stringify(await evaluate(ws, evalJs))); await sleep(waitMs); }

  const overflow = await evaluate(ws, 'document.documentElement.scrollWidth - window.innerWidth');
  if (overflow > 0) console.log(`AVISO: overflow horizontal de ${overflow}px`);
  if (errors.length) console.log('Errores de consola:', errors);

  if (!full) {
    const { data } = await cmd(ws, 'Page.captureScreenshot', { format: 'png' });
    await writeFile(out, Buffer.from(data, 'base64'));
  } else {
    // Captura por tramos del alto del viewport y los une: captureBeyondViewport
    // agranda el viewport y rompe todo lo que usa vh.
    const sharp = (await import('sharp')).default;
    const parts = [];
    for (let y = 0; y < height; y += h) {
      await evaluate(ws, `window.scrollTo(0, ${y})`);
      await sleep(700);
      if (y > 0 && hide) await evaluate(ws, `document.querySelectorAll(${JSON.stringify(hide)}).forEach(e => e.style.visibility = 'hidden')`);
      const realY = await evaluate(ws, 'window.scrollY');
      const { data } = await cmd(ws, 'Page.captureScreenshot', { format: 'png' });
      parts.push({ input: Buffer.from(data, 'base64'), top: realY, left: 0 });
    }
    await sharp({ create: { width: w, height, channels: 3, background: '#ffffff' } })
      .composite(parts.map((p) => ({ ...p, input: p.input })))
      .png().toFile(out);
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
