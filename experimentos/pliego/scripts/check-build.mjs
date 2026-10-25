// Chequeo post-build: noindex presente, robots.txt bloqueando y ninguna
// referencia root-relative rota dentro de dist/.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const errors = [];
const files = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : [p];
});
const pages = files(dist).filter((f) => f.endsWith('.html'));
const refs = new Set();

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  if (!html.includes('name="robots" content="noindex, nofollow"')) errors.push(`${page}: falta noindex`);
  if (!/<title>[^<]+<\/title>/.test(html)) errors.push(`${page}: falta <title>`);
  for (const [, url] of html.matchAll(/(?:src|href|poster)="(\/[^"#?]*)"/g)) refs.add(url);
  for (const [, list] of html.matchAll(/srcset="([^"]+)"/g)) list.split(',').forEach((s) => refs.add(s.trim().split(' ')[0]));
}
for (const css of files(dist).filter((f) => f.endsWith('.css'))) {
  for (const [, url] of readFileSync(css, 'utf8').matchAll(/url\((\/[^)"']+)\)/g)) refs.add(url);
}
for (const url of refs) {
  if (!url.startsWith('/') || url.startsWith('//')) continue;
  const target = join(dist, decodeURIComponent(url));
  if (!existsSync(target) && !existsSync(join(target, 'index.html'))) errors.push(`referencia rota: ${url}`);
}
if (!readFileSync(join(dist, 'robots.txt'), 'utf8').includes('Disallow: /')) errors.push('robots.txt no bloquea');

if (errors.length) { console.error('✗ check-build\n' + errors.join('\n')); process.exit(1); }
console.log(`✓ check-build: ${pages.length} páginas, ${refs.size} referencias OK, noindex en todas`);
