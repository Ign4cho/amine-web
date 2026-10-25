# Amine · Edición editorial

Experimento de diseño del sitio de Amine: el contenido del sitio original contado como una revista (capítulos numerados, tipografía grande, aliados como casos). Destino: `editorial.espacioamine.com`.

- Astro 5, CSS propio, sin frameworks de UI. Imágenes optimizadas a WebP por `astro:assets`.
- Contenido en `src/data/site.ts` y `src/data/blogcito.json` (copiados de `amine-web`).
- Reglas de diseño: skill `landing-page-design` (Elaya) en `.claude/skills/`, con la tipografía de la marca (Bebas Neue, Outfit, Courier Prime).
- Versión en Figma: https://www.figma.com/design/xp7xPvp1nqV1wmSMVKAYiP (se regenera con `node scripts/inline-for-figma.mjs` + `html_to_figma`).

## Comandos

```bash
npm run dev        # localhost:4321
npm run build      # dist/ + check-build (noindex, robots, referencias rotas)
npm run preview
node scripts/shot.mjs --out shots/x.png --url http://localhost:4321/ --w 390 --h 844 [--full true --hide "[data-masthead]"]
```

## Publicar en Hostinger

1. En hPanel → Dominios → Subdominios, crear `editorial` para `espacioamine.com` (carpeta `public_html/editorial` o la que asigne).
2. `npm run build`.
3. Subir el **contenido** de `dist/` (incluido `.htaccess`) a esa carpeta con el File Manager.

Todo el sitio lleva `noindex, nofollow` (meta, cabecera y `robots.txt`) para no competir con espacioamine.com en Google.
