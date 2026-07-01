# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

**v1.0 is live at [espacioamine.com](https://espacioamine.com)** (deployed via Hostinger File Manager from `dist/`). Ongoing work is small-detail tweaks per PO screenshots. Blogcito is feature-flagged off (`getStaticPaths() => []` on `[slug]` and `page/[page]`).

**Mobile-first rebuild** in progress on branch `mobile-redesign` (pushed to origin, not merged). Goal: rethink mobile with mobile-first patterns + clear tap affordances, deployed to a `preview.espacioamine.com` subdomain for review before merging. See "Mobile conventions" below.

**Pending (mobile-redesign):** (1) create the `preview.espacioamine.com` subdomain in Hostinger and upload the `build:preview` `dist/`; (2) designer review + iterate; (3) still-untouched mobile-first opportunities: Blogcito preview / section-tab affordances, plus whatever the designer wants bolder; (4) merge to `main` once approved. Affordance pattern already applied to aliados-preview, services CTA and `/aliados` portfolio links.

## Commands

```bash
npm run dev            # Dev server at localhost:4321
npm run build          # Build prod to ./dist/ (site = espacioamine.com); runs check-build after
npm run build:preview  # Build to ./dist/ with site = preview.espacioamine.com + noindex; runs check-build
npm run check          # Run the build-integrity check on ./dist/ standalone
npm run preview        # Preview production build locally
```

Deployment: run `npm run build`, then manually upload `dist/` to Hostinger `public_html/` via File Manager. No CI/CD — GitHub Actions FTP was attempted and abandoned.

**Preview subdomain:** `npm run build:preview` (uses `cross-env SITE_URL=…`) builds a `dist/` with `<meta robots noindex>` (via `Astro.site.hostname` starting with `preview.` — see both layouts). Create `preview.espacioamine.com` in Hostinger pointing to a folder and upload that `dist/` there. Prod `npm run build` has no noindex.

### Build integrity check (`scripts/check-build.mjs`)

Runs automatically after every build (npm `postbuild` / `postbuild:preview` hooks) and fails the build (exit 1) if `dist/` is inconsistent. Checks: all expected pages generated, no broken root-relative asset/link references (assets, `_astro`, favicons, CSS `url()`), each page has `<title>`/navbar/footer, and **noindex matches the mode** (prod must NOT have noindex; preview must). Run manually with `node scripts/check-build.mjs --mode prod|preview`.

### Screenshots for mobile testing (`scripts/shot.mjs`)

Uses CDP `Emulation.setDeviceMetricsOverride` to render at the **exact** viewport. **Critical:** on Windows, Edge/Chrome headless `--window-size` is clamped to the OS minimum (~500px), so the old `--screenshot` method rendered "mobile" captures at ~500px, not the requested width — the source of every headless-vs-device mismatch. Always use this script for mobile widths. Usage: `node scripts/shot.mjs --out x.png --url http://localhost:4321/ --w 390 --h 1200 [--mobile false for desktop] [--crop TOP:HEIGHT] [--wait ms]`. Allowlisted, so it doesn't prompt.

## Stack

- **Astro 5** — static site generator, file-based routing from `src/pages/`
- **Tailwind CSS 4** — via `@tailwindcss/vite` Vite plugin (config is v3-style in `tailwind.config.mjs` — this mismatch is known and works)
- **Alpine.js 3** — via `@astrojs/alpinejs` for client-side interactivity
- No backend, no linter. No unit/e2e test framework — instead a lightweight **build-integrity check** (`scripts/check-build.mjs`) runs on every build (see Commands).

## Architecture

### Content Collections (Astro 5)

- `src/content/blog/{slug}/` — `index.md` + `cover.svg/jpg` + `avatar.svg/jpg`
- `src/content/aliados/{name}/` — `data.yaml` + `avatar.svg/jpg` + optional `photo.png`, `paper.png`, `logo.png`
- Schema defined in `src/content.config.ts`
- **Aliados schema** accepts optional `photo`, `paper`, `logo` (all `image()`), `area` (string), `portfolio` (URL). Required: `name`, `avatar`, `description`, `services`, `contact`, `order`.
- **Critical:** In Astro 5, `entry.id` includes the file extension (e.g. `my-post/index.md`). Derive slugs via `post.id.split('/')[0]`, not `replace(/\/index$/, '')`.

### Layouts

- `src/layouts/Layout.astro` — base HTML layout for all non-blog pages (Google Fonts, global.css, `title` prop). Renders `<Navbar />` and `<Footer />` automatically.
- `src/layouts/BlogLayout.astro` — blog-only layout with SEO meta (title, description, og:image). Does **not** extend `Layout.astro` — keep them isolated. Also renders `<Navbar />` and `<Footer />` automatically.

### Blog Components

Blog components live exclusively in `src/components/blog/` — never mix with other site components. Content logic (`getCollection`) stays in page files; components receive typed props.

### Navbar

Active tab is detected server-side via `Astro.url.pathname` — no Alpine.js involved. Tab order: HOME `/`, ALIADOS `/aliados`, BLOGCITO `/blogcito`, CONTACTANOS! `/contactanos`. Active tab turns cream, inactive tabs are mustard.

`position: fixed` is enforced via `.navbar-root` in `src/styles/global.css` (with `!important`) to prevent Astro's scoped CSS from interfering. A `.navbar-spacer` div after `<nav>` compensates for the removed document flow.

**Mobile tabs:** 36px tall inside a 50px navbar. Same `18px 18px 0 0` border-radius as desktop. Gap between tabs: `margin: 0 4px` (8px gap, dark header bg shows through). Corner connectors: 8px × 8px `radial-gradient` pseudo-elements — must match or exceed gap size to fill the concave arc. Font: `clamp(0.62rem, 3vw, 0.9rem)`, left-aligned with `padding-left: 6px`.

**Do not add `<Navbar />` to individual pages** — it is rendered automatically by both layouts.

### Admin Page (`/admin`)

Frontend-only password gate via Alpine.js — stored in `src/constants.ts`. The team accepts this as sufficient security. Form generates Markdown frontmatter for copy-paste into `src/content/blog/`.

## Design Tokens

Custom Tailwind classes from `tailwind.config.mjs`:

| Token | Value | Usage |
|-------|-------|-------|
| `bg-cream` | `#F9F4EA` | Page background, active navbar tab |
| `bg-header` | `#2D2A29` | Navbar background |
| `bg-mustard` | `#F0C14B` | Inactive tabs, CTA buttons |
| `text-primary` | `#2D2A29` | Main text |
| `text-light` | `#5C5753` | Secondary text |
| `font-bebas` | Bebas Neue | Headings, navigation, CTA labels |
| `font-opensans` | Open Sans 300 | Subtitles, descriptors |

**Body/editorial fonts (loaded in `Layout.astro`):**
- `Courier Prime` — body text on Aliados (descriptions) and Contactanos (postit text)
- `Outfit` — stand-in for Glacial Indifference in Aliados paper cards (services list). Swap to a self-hosted `@font-face` when brand font asset arrives.

## Components

- `src/components/Navbar.astro` — fixed navbar (via global.css), tabs order: HOME / ALIADOS / BLOGCITO / CONTACTANOS!
- `src/components/Footer.astro` — footer with texture bg + 3 nav columns; included automatically in both layouts
- `src/components/blog/BlogGridCard.astro` — 3-column grid card for blogcito feed pages (image + title + expand toggle + link)
- `src/components/blog/PostCard.astro` — single-post page card (full content inline, Alpine toggle)

## Figma Assets (`public/assets/`)

Downloaded from Figma (expire in 7 days from download, re-download if needed):
`hero-brand.png`, `star.png`, `texture-bg.png`, `footer-bg.png`, `cta-note.png`, `aliados-card-bg.png`, `stroke-hero.png`, `icon-star.png`, `icon-camera.png`, `icon-arrow.png`, `icon-brush.png`, `stroke-services.png`, `stroke-aboutus.png`, `tab-blogcito.png`, `dot-teama.png`, `stroke-teama.png`, `tab-aliados.png`, `texture-aboutus.png`, `tab-nosotros.png`

To re-download, use the Figma MCP with `get_design_context` on node `1:2` (fileKey `MqAecRNylbU4Ei9khFb7dP`) which returns fresh asset URLs. See `figma-prompt.md` for the mapping.

## Page Patterns

### Aliados (`/aliados`)

Dark header + cream grid. Each aliado is an alternating-layout `<article>` (photo-left / info-left by index). Grid columns: `7fr 4fr` (photo/info, reversed to `4fr 7fr` on odd rows) with 1.5rem gap. Articles separated by a subtle bottom border (`rgba(45,42,41,0.18)`). Header has reduced bottom padding (`0 4rem 1.5rem`) and grid has reduced top padding (`1rem 4rem 3rem`) so polaroids start close to the subtitle.

- **Photo** is a clickable polaroid (`transform: rotate(-3deg)`, flips to `+3deg` on reverse rows) wrapped in an `<a href={portfolio}>`. Source images rendered at 900×1100 so they stay crisp as the fluid column scales.
- **Paper** (torn postit PNG per aliado) is absolutely-positioned bg, services list sits inside via `.aliado-paper-content`. Each aliado has slug-scoped CSS (`.aliado-paper-wrap--{slug}`) for width + padding since paper proportions differ.
- **Mobile (`max-width: 900px`)** — papers hide entirely; services render as a plain Courier Prime list below the photo (`.aliado-services-plain`, duplicated markup toggled via `display`).

### Contactanos (`/contactanos`)

Three CSS-only postits in yellow tones — `#FCE879` (butter) / `#F0C14B` (brand mustard) / `#E8B83D` (deeper amber) — built as `.postit-tape` (washi tape pseudo with jagged `clip-path`) + `.postit-corner` (folded-corner gradient). Per-card rotation (-2.5° / 1.5° / -1°) that straightens + lifts on hover. WhatsApp + Email cards are full-card `<a>` CTAs. Third card is "Redes Sociales" — a `<div>` (not anchor) containing two inline `<a>` links to IG (`@guadasancheznph`) and TikTok (`@espacio.amine`), since nested anchors aren't valid HTML. The social card overrides `.postit-text { flex: 0 0 auto }` so the tagline (not the description) is what gets pushed to the bottom.

### Home (`/`) — v2 redesign

Section order (in `src/pages/index.astro`): Hero → Services → About Us → Aliados Preview → Blogcito Preview.

- **Hero** — 2-column: left has the Amine logo (PNG, `.hero-logo-wrap` left-justified, *not* centered) + descriptor text (`clamp(1.25rem, 2.15vw, 1.95rem)` — reduced ~2pt from launch sizing) + `stroke-hero`. Right uses the composed PNG `hero-carpeta-foto.png` (carpeta + foto pre-compuesta en un solo asset) sized big and bled off the right edge via `.hero-right` `width: clamp(520px, 58vw, 900px)` + `margin-right: clamp(-380px, -22vw, -180px)` (overflow hidden on `.hero`). Decorative stars cluster sits above the folder. If a dynamic photo carousel is needed later, swap back to `hero-carpeta.png` + overlay photos (prior implementation kept in git history).
- **Services** — dark bg (`#2D2A29`), list on the left (Bebas Neue, `#` prefix, per-item icon), right column has a single composed CTA asset `cta-con-firma.png` (note + firma + "¡HACÉ TU CONSULTA!" baked in) wrapped in `<a class="cta-card" href={WHATSAPP_URL}>`. Earlier versions split note + `amine-firma.png` with negative margins; replaced with the composed PNG to keep alignment fixed.
- **About Us** (`id="nosotros"`) — dark bg with `home-footer-bg.png` rotated 180° + blur + grayscale overlay (`opacity: 0.38`). Left: "About us" title with `aboutus-redondeo.png` oval behind (percentages tuned to sit around the text) + star next to it, paragraph, `teama-logo.png` (also collapsed with negative margins due to PNG padding). Right: clipboard (`aboutus-photo.png` rotated 2.5° + `aboutus-gancho.png` clip overlay). Section uses `overflow: visible` so the photo exits the bottom (negative `margin-bottom`). Mobile flips to vertical margins to avoid overlap.
- **Aliados Preview** — 2 polaroids (`aliado-agus.png`, `aliado-nacho.png`) + carpeta (`aliado-carpeta.png`) superimposed with negative `margin-left` clamps. **Exception to the left-anchor convention**: this section's `.aliados-preview-inner` uses `margin: 0 auto` + `justify-content: center` because the cluster reads better centered. Mobile separates the three elements vertically (no overlap, `margin-top: 2.5rem` between each) since stacking polaroids on a phone produced visual confusion. Knobs documented inline in the CSS — PO iterates sizes/overlaps often. **PNG overlap calibration**: the polaroid/carpeta PNGs were re-exported without transparent borders mid-iteration, so margin-left clamps were tightened (`clamp(-8rem, -8vw, -3rem)` from `clamp(-14rem, -14vw, -6rem)`).
- **Blogcito Preview** — mirrors `/blogcito`: two-tone CSS bg + `pc-blogcito.png` + "proximamente" copy. Blogcito está deshabilitado en esta release (`[slug]` y `page/[page]` devuelven `getStaticPaths() => []`).

### Footer

Background: `home-footer-bg.png` with `grayscale(1) blur(4px)` + `opacity: 0.45` + `scale(1.05)`. Left column is a postit (`home-footer-postit.png`, rotated -3°) with IG + TikTok handles rendered as inline SVG icons + Georgia italic labels. Right column has 3 nav columns. Mobile reorders — postit goes below the nav via `order` on flex items.

**Social handles**: IG `@guadasancheznph` (constant `INSTAGRAM_URL`) + TikTok `@espacio.amine` (constant `TIKTOK_URL`). `espacio.amine` **does not exist on Instagram** — don't add it there.

## Design References (`design-refs/`)

Non-shipped folder holding PO/designer feedback: per-page `CHANGES.md` + PNG annotations + source assets in `{page}/assets/`. See `design-refs/guia-de-cambios.md` for the workflow. Master checklist: `design-refs/CHANGES.md`.

## Site-wide Config

All URLs, contact info, and the admin password live in `src/constants.ts` — import from there instead of hardcoding.

- WhatsApp: `wa.me/5492645827270`
- Email: `espacioamine@gmail.com`
- Instagram: `instagram.com/guadasancheznph`
- TikTok: `tiktok.com/@espacio.amine`
- Domain: `espacioamine.com`

## Working Conventions

- **Dev workflow**: `npm run dev` runs on :4321 (or :4322 if busy). The PO iterates heavily via screenshots — expect many small size/position tweaks per section.
- **Wide-monitor left-anchoring**: `.hero-layout`, `.services-inner`, `.aboutus-inner` all use `margin: 0` (NOT `margin: 0 auto`) so content stays pinned to the 4rem left edge on ultrawide displays. `.aliados-preview-inner` is the documented exception (centered).
- **PNG transparent padding**: Several brand assets (`amine-firma.png`, `teama-logo.png`, etc.) ship with large transparent space around the visible element. Collapse with negative margins — usually `margin-top: clamp(-14rem, -15vw, -7rem)` style fluid values so it scales. Do **not** crop the PNG.
- **Section bleed**: Use `overflow: visible` on a section + negative `margin-bottom` on the child to let elements exit the bottom (About Us photo), or `overflow: hidden` on the section + `width` + negative `margin-right` to bleed right (Hero carpeta).
- **Flex column wrapping**: `flex: 1 1 0; min-width: 0` on the text column + `&nbsp;` on short titles prevents content-driven min-width from pushing adjacent columns to wrap.
- **Design refs workflow**: PO drops annotated PNGs and source assets into `design-refs/{page}/`. Mark items `[x]` in the page's `CHANGES.md` as you ship them.

## Mobile conventions (branch `mobile-redesign`)

- **Tap affordance**: on mobile there is no hover, so anything that navigates needs an **explicit but subtle CTA** — text + `→` arrow + mustard underline (`border-bottom: 2px solid #F0C14B`, Bebas Neue), not a decorative element that only "looks" clickable. Implemented as `.preview-cta` (home: "Conocé a los aliados →", "Escribinos por WhatsApp →", mobile-only) and `.aliado-portfolio-cta` (`/aliados`: "Ver portfolio →", all sizes). Do **not** use loud solid pill buttons here — they compete with the scrapbook aesthetic.
- **Mobile viewport width & overflow**: `100vw` breaks if any element forces horizontal overflow (the layout viewport expands). Keep mobile sections from overflowing — sections use `overflow: hidden` on **both** axes on mobile. Note: mixing `overflow-x: hidden` with a base `overflow: visible` makes `overflow-y` compute to `auto` and creates an ugly internal scroll (this bit About Us — fix is `overflow: hidden` both axes).
- **Hero carpeta**: the designer wants it **cropped/bled** (large, left-anchored, bleeding right, clipped by the hero's `overflow: hidden`) — showing the left half with the photo, NOT the whole folder.
- **Footer**: on mobile the social postit is a footer column ("SEGUINOS" heading + postit) aligned with the others, pulled up with a negative `margin-top` to eat the PNG's transparent tape space — otherwise it floats disconnected. The heading is `display: none` on desktop.
- Verify mobile with `scripts/shot.mjs` at real widths (see Commands) — NOT the old `--screenshot` method (clamped to ~500px on Windows).
