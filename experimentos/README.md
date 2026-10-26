# Experimentos de diseño

Versiones alternativas de espacioamine.com, con el mismo contenido y los mismos assets. Cada una es un proyecto Astro independiente (su propio `package.json`, `node_modules` y `dist/`) y se publica en su propio subdominio. Todas llevan `noindex, nofollow` (meta y cabecera `X-Robots-Tag` en `.htaccess`) para no competir con el sitio principal en Google. El `robots.txt` no bloquea a propósito: si bloqueara, Google no podría leer el noindex y WhatsApp/LinkedIn no armarían la vista previa del link. Los archivos de `/_astro/` (con hash) se cachean un año (`public/_astro/.htaccess`).

| Carpeta | Idea | Online | Carpeta en Hostinger | Puerto local |
|---|---|---|---|---|
| `editorial/` | Amine como revista: capítulos numerados, portada a escala gigante | https://editorial.espacioamine.com | `public_html/editorial` | 4401 |
| `mesa/` | Scrapbook interactivo con objetos arrastrables (GSAP) + reel de Remotion en `reel/` | https://mesa.espacioamine.com | `public_html/mesa` | 4402 |
| `pliego/` | Fanzine risográfico que se despliega en 3D con el scroll (Three.js WebGPU) | https://fold.espacioamine.com | `public_html/fold` | 4403 |

Online desde el 2026-10-25.

## Uso

```bash
cd experimentos/<carpeta>
npm install
npm run dev -- --port 44xx
npm run build      # dist/ + check-build (verifica el noindex)
```

## Publicar en Hostinger

### Con SSH (lo normal)

```bash
cd experimentos/<carpeta>
npm run deploy     # build + check-build + subida + verificación (200 y X-Robots-Tag)
```

`deploy.mjs` sube `dist/` por SSH a `domains/espacioamine.com/public_html/<editorial|mesa|fold>`: lo extrae en una carpeta temporal y recién al final reemplaza la anterior, así que si algo falla queda online la versión previa. Solo acepta esas tres carpetas y exige que ya existan (nunca toca la raíz de `public_html`).

Configuración, una sola vez por PC: activar SSH en hPanel → Avanzado → Acceso SSH, cargar ahí la clave pública `~/.ssh/amine_hostinger.pub` y agregar a `~/.ssh/config`:

```
Host amine-hostinger
  HostName <IP de hPanel>
  Port 65002
  User <usuario de hPanel>
  IdentityFile ~/.ssh/amine_hostinger
  IdentitiesOnly yes
```

### A mano (si no hay SSH)

El DNS de espacioamine.com es el de Hostinger: al crear el subdominio se crea solo el registro, no hay que tocar DNS aparte.

1. hPanel → Dominios → Subdominios: crear el subdominio para `espacioamine.com`. Si se tilda «Custom folder», escribir el nombre de la carpeta (por ejemplo `editorial`, queda en `public_html/editorial`).
2. `npm run build` dentro de la carpeta del experimento.
3. Comprimir el **contenido** de `dist/` (no la carpeta) en un zip, incluido `.htaccess`. En Windows: `tar.exe -a -cf ../x.zip *` más `.htaccess`, o como se armaron en `Desktop/Webs/Amine/subir-hostinger/`.
4. Administrador de archivos → entrar a la carpeta del subdominio → subir el zip → clic derecho, Extract ahí mismo → borrar el zip. `index.html` tiene que quedar directo en la carpeta.
5. Para actualizar, repetir 2–4 sobrescribiendo. Nunca subir nada de esto a la raíz de `public_html/` (es espacioamine.com).

No tienen relación con el `dist/` del sitio principal: nunca subir uno de estos a `public_html/`.
