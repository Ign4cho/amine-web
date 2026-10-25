# Amine · La mesa

Experimento interactivo del sitio de Amine: la home es una mesa de trabajo con los objetos de la marca (polaroids, carpeta, planilla, post-its, la compu del Blogcito) que se arrastran y se abren. Destino: `mesa.espacioamine.com`.

- Astro 5 + GSAP 3 (Draggable + InertiaPlugin, gratuitos desde 3.13).
- Cada objeto abre un `<dialog>` con su contenido; debajo de la mesa está la **versión en lista** con lo mismo, para teclado, lectores de pantalla y quien prefiera leer de corrido.
- Las posiciones se guardan en `localStorage` de cada visitante; "Ordenar la mesa" las resetea.
- Posición de cada objeto (desktop y mobile): array `items` en `src/pages/index.astro`.
- `reel/`: proyecto Remotion con el video de la carpeta (`public/reel.mp4`, 1080×1080, 9,5 s, sin audio).

## Comandos

```bash
npm run dev
npm run build      # dist/ + check-build
cd reel && npm run dev                                                      # Remotion Studio
cd reel && npx remotion render AmineReel ../public/reel.mp4 --codec=h264 --crf=26 --muted
cd reel && npx remotion still AmineReel ../public/reel-poster.jpg --frame=40 --image-format=jpeg
```

Remotion es gratis para equipos de hasta 3 personas; si Amine lo adopta como empresa, revisar https://www.remotion.pro/license.

## Publicar en Hostinger

1. hPanel → Dominios → Subdominios: crear `mesa` para `espacioamine.com`.
2. `npm run build`.
3. Subir el **contenido** de `dist/` (incluido `.htaccess`) a la carpeta del subdominio.

Todo el sitio lleva `noindex, nofollow` (meta, cabecera y `robots.txt`).
