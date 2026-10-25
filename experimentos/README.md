# Experimentos de diseño

Versiones alternativas de espacioamine.com, con el mismo contenido y los mismos assets. Cada una es un proyecto Astro independiente (su propio `package.json`, `node_modules` y `dist/`) y se publica en su propio subdominio. Todas llevan `noindex, nofollow` (meta, cabecera en `.htaccess` y `robots.txt`) para no competir con el sitio principal en Google.

| Carpeta | Idea | Subdominio | Puerto local |
|---|---|---|---|
| `editorial/` | Amine como revista: capítulos numerados, portada a escala gigante | `editorial.espacioamine.com` | 4401 |
| `mesa/` | Scrapbook interactivo con objetos arrastrables (GSAP) + reel de Remotion en `reel/` | `mesa.espacioamine.com` | 4402 |
| `pliego/` | Fanzine risográfico que se despliega en 3D con el scroll (Three.js WebGPU) | `pliego.espacioamine.com` | 4403 |

## Uso

```bash
cd experimentos/<carpeta>
npm install
npm run dev -- --port 44xx
npm run build      # dist/ + check-build (verifica el noindex)
```

## Publicar en Hostinger

1. hPanel → Dominios → Subdominios: crear el subdominio (por ejemplo `pliego`) para `espacioamine.com`.
2. `npm run build` dentro de la carpeta del experimento.
3. Subir el **contenido** de su `dist/` (incluido `.htaccess`, que es oculto) a la carpeta que Hostinger creó para el subdominio.

No tienen relación con el `dist/` del sitio principal: nunca subir uno de estos a `public_html/`.
