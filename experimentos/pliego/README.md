# Amine · Pliego n.º 1

Experimento del sitio de Amine: la home es un fanzine impreso en dos tintas (mostaza y negro, estilo risografía) que se despliega en 3D con el scroll. Al final se vuelve a plegar y sale volando como avión de papel hacia el contacto. Online en https://fold.espacioamine.com (carpeta `public_html/fold` en Hostinger).

- Astro 5 + Three.js 0.186 (`WebGPURenderer`: WebGPU, o WebGL2 si el navegador no lo tiene) + Lenis.
- Los paneles se **imprimen en el navegador** (`src/scripts/print.ts`): cada uno se dibuja en canvas como dos planchas (mostaza y tinta), con trama de puntos para las fotos. El shader (TSL) combina las planchas sobre el papel y las desfasa según la velocidad del scroll.
- La luz sigue al cursor en desktop y a la inclinación del teléfono en mobile (en iPhone pide permiso con el botón «Encender la luz»). Sin entrada, la luz se mueve sola.
- Desktop: el pliego se abre en horizontal y el texto va al costado. Mobile y tablet vertical: se abre hacia abajo y el texto va debajo.
- Todo el texto es HTML real (lectores de pantalla, teclado, buscar en la página). Con «reducir movimiento» o sin WebGL se muestra el pliego abierto y quieto, panel por panel.
- Línea de tiempo del scroll: función `timeline` en `src/scripts/pliego.ts`. Contenido: `src/data/site.ts` (copiado de `amine-editorial`).

## Comandos

```bash
npm run dev
npm run build      # dist/ + check-build
npm run preview -- --port 4403

# capturas en distintos puntos del recorrido (con preview levantado en 4403)
WAIT=4000 bash scripts/shots-p.sh 1440 900 d 0 1.2 3.2 5.2 6.6
node scripts/shot.mjs --url http://localhost:4403/ --w 390 --h 844 --gpu real --out shots/x.png   # GPU real + WebGPU
node scripts/shot.mjs --url http://localhost:4403/ --w 1440 --h 900 --reduced true --full true --out shots/flat.png
```

Peso: unos 250 KB de JS comprimido (Three.js con WebGPU es la mayor parte) y 160 KB de imágenes.

## Publicar en Hostinger

1. hPanel → Dominios → Subdominios: crear `pliego` para `espacioamine.com`.
2. `npm run build`.
3. Subir el **contenido** de `dist/` (incluido `.htaccess`) a la carpeta del subdominio.

Todo el sitio lleva `noindex, nofollow` (meta, cabecera y `robots.txt`).
