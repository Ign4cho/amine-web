// Sube el dist/ de un experimento a su carpeta en Hostinger por SSH.
// Uso (desde la carpeta del experimento): npm run deploy  →  node ../deploy.mjs <carpeta-remota>
// Necesita el alias "amine-hostinger" en ~/.ssh/config (ver README).
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const HOST = process.env.AMINE_SSH_HOST || 'amine-hostinger';
const BASE = 'domains/espacioamine.com/public_html';
// Solo estas carpetas: nunca la raíz de public_html (es espacioamine.com).
const ALLOWED = ['editorial', 'mesa', 'fold'];

const fail = (msg) => { console.error(`✗ ${msg}`); process.exit(1); };

const target = process.argv[2];
if (!ALLOWED.includes(target)) fail(`carpeta remota inválida: "${target}". Opciones: ${ALLOWED.join(', ')}`);
if (!existsSync('dist/index.html')) fail('no hay dist/index.html: corré npm run build antes');

// La carpeta del subdominio tiene que existir: si no, el subdominio no está creado o el nombre está mal.
const check = spawnSync('ssh', [HOST, `test -d ${BASE}/${target}`], { stdio: 'inherit' });
if (check.status !== 0) fail(`no existe ${BASE}/${target} en el servidor (o falló la conexión SSH)`);

// Se extrae en una carpeta temporal y se cambia de lugar al final: la web nunca queda a medio subir
// y los archivos viejos de _astro/ no se acumulan.
const tmp = `$HOME/.deploy-${target}`;
const remote = [
  'set -e',
  `rm -rf ${tmp} ${tmp}-viejo`,
  `mkdir -p ${tmp}`,
  `tar -xzf - -C ${tmp}`,
  `test -f ${tmp}/index.html`,
  `mv ${BASE}/${target} ${tmp}-viejo`,
  `mv ${tmp} ${BASE}/${target}`,
  `rm -rf ${tmp}-viejo`,
].join(' && ');

console.log(`→ subiendo dist/ a ${HOST}:${BASE}/${target}`);
const tar = spawn('tar', ['-czf', '-', '-C', 'dist', '.'], { stdio: ['ignore', 'pipe', 'inherit'] });
const ssh = spawn('ssh', [HOST, remote], { stdio: ['pipe', 'inherit', 'inherit'] });
tar.stdout.pipe(ssh.stdin);

const code = await new Promise((resolve) => ssh.on('close', resolve));
if (code !== 0) fail(`la subida falló (ssh salió con ${code}); la versión anterior sigue online`);

const url = `https://${target}.espacioamine.com/`;
const res = await fetch(url, { cache: 'no-store' });
const robots = res.headers.get('x-robots-tag');
console.log(`✓ ${url} → ${res.status}, X-Robots-Tag: ${robots ?? 'FALTA'}`);
if (res.status !== 200 || !robots?.includes('noindex')) fail('revisá la web: la respuesta no es la esperada');
