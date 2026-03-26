# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Dev server at localhost:4321
npm run build     # Build to ./dist/ (static output)
npm run preview   # Preview production build locally
```

Deployment: run `npm run build`, then manually upload `dist/` to Hostinger `public_html/` via File Manager. No CI/CD — GitHub Actions FTP was attempted and abandoned.

## Stack

- **Astro 5** — static site generator, file-based routing from `src/pages/`
- **Tailwind CSS 4** — via `@tailwindcss/vite` Vite plugin (config is v3-style in `tailwind.config.mjs` — this mismatch is known and works)
- **Alpine.js 3** — via `@astrojs/alpinejs` for client-side interactivity
- No backend, no tests, no linter configured

## Architecture

### Content Collections (Astro 5)

- `src/content/blog/{slug}/` — `index.md` + `cover.svg/jpg` + `avatar.svg/jpg`
- `src/content/aliados/{name}/` — `data.yaml` + `avatar.svg/jpg`
- Schema defined in `src/content.config.ts`
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
| `font-bebas` | Bebas Neue | Headings, navigation |
| `font-opensans` | Open Sans 300 | Body text |

## Components

- `src/components/Navbar.astro` — fixed navbar (via global.css), tabs order: HOME / ALIADOS / BLOGCITO / CONTACTANOS!
- `src/components/Footer.astro` — footer with texture bg + 3 nav columns; included automatically in both layouts
- `src/components/blog/BlogGridCard.astro` — 3-column grid card for blogcito feed pages (image + title + expand toggle + link)
- `src/components/blog/PostCard.astro` — single-post page card (full content inline, Alpine toggle)

## Figma Assets (`public/assets/`)

Downloaded from Figma (expire in 7 days from download, re-download if needed):
`hero-brand.png`, `star.png`, `texture-bg.png`, `footer-bg.png`, `cta-note.png`, `aliados-card-bg.png`, `stroke-hero.png`, `icon-star.png`, `icon-camera.png`, `icon-arrow.png`, `icon-brush.png`, `stroke-services.png`, `stroke-aboutus.png`, `tab-blogcito.png`, `dot-teama.png`, `stroke-teama.png`, `tab-aliados.png`, `texture-aboutus.png`, `tab-nosotros.png`

To re-download, use the Figma MCP with `get_design_context` on node `1:2` (fileKey `MqAecRNylbU4Ei9khFb7dP`) which returns fresh asset URLs. See `figma-prompt.md` for the mapping.

## Site-wide Config

All URLs, contact info, and the admin password live in `src/constants.ts` — import from there instead of hardcoding.

- WhatsApp: `wa.me/5492645827270`
- Email: `espacioamine@gmail.com`
- Instagram: `instagram.com/guadasancheznph`
- Domain: `espacioamine.com`
