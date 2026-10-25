// Genera dist-figma/editorial.html: HTML autocontenido (CSS y imágenes en
// data URIs, sin scripts) para importarlo a Figma con html_to_figma.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';

const dist = 'dist';
let html = readFileSync(join(dist, 'index.html'), 'utf8');
const mime = { '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
const toData = (p) => `data:${mime[extname(p)]};base64,${readFileSync(join(dist, p)).toString('base64')}`;

html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) => `<style>${readFileSync(join(dist, href), 'utf8')}</style>`);
html = html.replace(/<script[\s\S]*?<\/script>/g, '');
html = html.replace(/\s(srcset|sizes)="[^"]*"/g, '');
html = html.replace(/src="(\/[^"]+)"/g, (_, src) => `src="${toData(src)}"`);
// Estado final de la frase y de las apariciones (sin JS).
html = html.replace(/class="tw( tw--accent)?"/g, (m, a) => `class="tw${a ?? ''} is-lit"`);
html = html.replace('<div class="menu" id="menu" data-menu hidden>', '<div class="menu" id="menu" data-menu hidden style="display:none">');
// El importador de Figma descarta los espacios entre spans: la frase va como
// texto corrido (solo los acentos en span) y el # lleva su espacio adentro.
html = html.replace(/<span class="tw is-lit">([^<]+)<\/span>/g, '$1');
html = html.replace(/(<span class="tw tw--accent is-lit">[^<]+)<\/span> /g, '$1 </span>');
html = html.replace(/service-hash">#<\/span>/g, 'service-hash">#&nbsp;</span>');
mkdirSync('dist-figma', { recursive: true });
writeFileSync('dist-figma/editorial.html', html);
console.log('OK', (html.length / 1024 / 1024).toFixed(2), 'MB');
