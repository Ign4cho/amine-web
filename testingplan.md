# Testing Plan — Amine Social Media Website

## Objetivo

Garantizar que el sitio sea robusto antes de cada deploy a Hostinger:
que todas las páginas rendericen, los links funcionen, la interactividad
de Alpine.js responda y el sitio sea accesible y performante.

---

## Herramientas recomendadas

| Herramienta | Propósito | Instalación |
|---|---|---|
| `astro check` | TypeScript + tipos de Content Collections | ya incluido en Astro |
| **Playwright** | Tests end-to-end (UI + interactividad Alpine.js) | `npm i -D @playwright/test` |
| **axe-playwright** | Accesibilidad automatizada | `npm i -D axe-playwright` |
| **Lighthouse CI** | Performance, SEO, best practices | `npm i -D @lhci/cli` |

---

## Nivel 1 — Verificación de build (correr siempre)

Estos checks son gratuitos y ya están disponibles. Correrlos antes de cada deploy.

### 1.1 Build limpio

```bash
npm run build
```

**Qué verifica:** que todos los archivos Astro compilan sin errores, que las
Content Collections son válidas (schema + imágenes existen), que no hay
imports rotos.

**Criterio de éxito:** termina con `[build] Complete!` sin errores en rojo.

### 1.2 Type checking

```bash
npx astro check
```

**Qué verifica:** errores de TypeScript en componentes `.astro`, tipos
correctos en props, imports válidos.

**Criterio de éxito:** 0 errors.

---

## Nivel 2 — Tests end-to-end con Playwright

Playwright levanta un navegador real y verifica que el sitio funciona
como lo vería un usuario.

### Setup inicial (una sola vez)

```bash
npm i -D @playwright/test
npx playwright install chromium
```

Crear el archivo de configuración `playwright.config.ts` en la raíz del proyecto:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:4321',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
  },
});
```

Agregar el script al `package.json`:

```json
"test": "playwright test",
"test:ui": "playwright test --ui"
```

### Estructura de archivos de test

```
tests/
├── home.spec.ts
├── blogcito.spec.ts
├── aliados.spec.ts
├── contactanos.spec.ts
└── admin.spec.ts
```

---

### 2.1 Homepage (`tests/home.spec.ts`)

```ts
import { test, expect } from '@playwright/test';

test('homepage carga correctamente', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Amine Social Media/);
});

test('navbar visible y sticky', async ({ page }) => {
  await page.goto('/');
  const nav = page.locator('nav');
  await expect(nav).toBeVisible();
  // verificar que sigue visible después de hacer scroll
  await page.evaluate(() => window.scrollTo(0, 1000));
  await expect(nav).toBeVisible();
});

test('links del navbar navegan correctamente', async ({ page }) => {
  await page.goto('/');
  await page.click('text=BLOGCITO');
  await expect(page).toHaveURL('/blogcito');

  await page.click('text=ALIADOS');
  await expect(page).toHaveURL('/aliados');

  await page.click('text=CONTACTANOS');
  await expect(page).toHaveURL('/contactanos');
});

test('sección de servicios visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#servicios')).toBeVisible();
  // verificar que hay al menos 6 service cards
  await expect(page.locator('.service-card')).toHaveCount(6);
});

test('preview del blog muestra 3 posts', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.blog-preview-card')).toHaveCount(3);
});

test('botón de WhatsApp en CTA tiene href correcto', async ({ page }) => {
  await page.goto('/');
  const ctaBtn = page.locator('.cta-btn');
  await expect(ctaBtn).toHaveAttribute('href', 'https://wa.me/5492645827270');
});
```

---

### 2.2 Blog (`tests/blogcito.spec.ts`)

```ts
import { test, expect } from '@playwright/test';

test('feed del blog carga con posts', async ({ page }) => {
  await page.goto('/blogcito');
  await expect(page.locator('.post-card')).toHaveCount(4); // ajustar al nro real de posts
});

test('toggle ver más / ver menos funciona', async ({ page }) => {
  await page.goto('/blogcito');
  const firstCard = page.locator('.post-card').first();

  // el contenido completo debe estar oculto al inicio
  await expect(firstCard.locator('.post-full-content')).toBeHidden();

  // click en "ver más"
  await firstCard.locator('.btn-toggle').click();
  await expect(firstCard.locator('.post-full-content')).toBeVisible();
  await expect(firstCard.locator('.btn-toggle')).toHaveText('ver menos');

  // click en "ver menos"
  await firstCard.locator('.btn-toggle').click();
  await expect(firstCard.locator('.post-full-content')).toBeHidden();
  await expect(firstCard.locator('.btn-toggle')).toHaveText('ver más');
});

test('link "Ver post completo" navega al post individual', async ({ page }) => {
  await page.goto('/blogcito');
  const firstLink = page.locator('.btn-full-post').first();
  const href = await firstLink.getAttribute('href');
  await firstLink.click();
  await expect(page).toHaveURL(href!);
  // el post individual debe tener un h1
  await expect(page.locator('h1.post-title')).toBeVisible();
});

test('botón volver al blog navega de vuelta', async ({ page }) => {
  await page.goto('/blogcito/branding-personal');
  await page.click('text=Volver al blog');
  await expect(page).toHaveURL('/blogcito');
});
```

---

### 2.3 Aliados (`tests/aliados.spec.ts`)

```ts
import { test, expect } from '@playwright/test';

test('página de aliados carga los partners', async ({ page }) => {
  await page.goto('/aliados');
  await expect(page.locator('.aliado-card')).toHaveCount(2); // ajustar al nro real
});

test('botón de contacto WhatsApp tiene href correcto', async ({ page }) => {
  await page.goto('/aliados');
  const whatsappBtn = page.locator('.contact-btn--whatsapp').first();
  const href = await whatsappBtn.getAttribute('href');
  expect(href).toMatch(/^https:\/\/wa\.me\//);
});
```

---

### 2.4 Contactanos (`tests/contactanos.spec.ts`)

```ts
import { test, expect } from '@playwright/test';

test('página de contacto carga con los 3 canales', async ({ page }) => {
  await page.goto('/contactanos');
  await expect(page.locator('.contact-card')).toHaveCount(3);
});

test('botón de WhatsApp correcto', async ({ page }) => {
  await page.goto('/contactanos');
  const btn = page.locator('a:has-text("Escribinos por WhatsApp")');
  await expect(btn).toHaveAttribute('href', 'https://wa.me/5492645827270');
});

test('botón de email correcto', async ({ page }) => {
  await page.goto('/contactanos');
  const btn = page.locator('a:has-text("Mandanos un mail")');
  await expect(btn).toHaveAttribute('href', 'mailto:espacioamine@gmail.com');
});
```

---

### 2.5 Admin (`tests/admin.spec.ts`)

```ts
import { test, expect } from '@playwright/test';

test('muestra formulario de contraseña al entrar', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.locator('.login-card')).toBeVisible();
  await expect(page.locator('.admin-panel')).toBeHidden();
});

test('contraseña incorrecta muestra error', async ({ page }) => {
  await page.goto('/admin');
  await page.fill('#admin-password', 'contraseñaerronea');
  await page.click('button:has-text("Ingresar")');
  await expect(page.locator('.error-msg')).toBeVisible();
  await expect(page.locator('.admin-panel')).toBeHidden();
});

test('contraseña correcta muestra el panel', async ({ page }) => {
  await page.goto('/admin');
  await page.fill('#admin-password', 'Espacio1234');
  await page.click('button:has-text("Ingresar")');
  await expect(page.locator('.admin-panel')).toBeVisible();
  await expect(page.locator('.login-card')).toBeHidden();
});

test('formulario genera el contenido del post', async ({ page }) => {
  await page.goto('/admin');
  await page.fill('#admin-password', 'Espacio1234');
  await page.click('button:has-text("Ingresar")');

  await page.fill('input[placeholder="Título del post"]', 'Post de prueba');
  await page.fill('input[placeholder="Ej: Guada Sanchez"]', 'Guada Sanchez');
  await page.fill('textarea[placeholder*="Descripción"]', 'Descripción de prueba');
  await page.fill('textarea[placeholder*="Markdown"]', 'Contenido del post.');
  await page.click('button:has-text("Generar archivo")');

  await expect(page.locator('.output-code')).toBeVisible();
  await expect(page.locator('.output-code')).toContainText('title: "Post de prueba"');
});
```

### Correr los tests

```bash
# todos los tests
npm test

# solo un archivo
npx playwright test tests/blogcito.spec.ts

# con interfaz visual (útil para debuggear)
npm run test:ui

# generar reporte HTML
npx playwright test --reporter=html
```

---

## Nivel 3 — Accesibilidad con axe

```bash
npm i -D axe-playwright
```

Agregar a cualquier test existente o crear `tests/a11y.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = ['/', '/blogcito', '/aliados', '/contactanos'];

for (const url of pages) {
  test(`no hay violaciones de accesibilidad en ${url}`, async ({ page }) => {
    await page.goto(url);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}
```

---

## Nivel 4 — Performance con Lighthouse CI

Útil correrlo antes de un deploy importante para detectar regresiones.

```bash
npm i -D @lhci/cli
npm run build
npx lhci autorun --collect.staticDistDir=./dist
```

Crear `lighthouserc.js` en la raíz:

```js
module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.85 }],
        'categories:accessibility': ['error', { minScore: 0.90 }],
        'categories:seo': ['warn', { minScore: 0.90 }],
      },
    },
  },
};
```

---

## Flujo de trabajo recomendado

### Antes de cada deploy

```bash
# 1. Build limpio
npm run build

# 2. Type check
npx astro check

# 3. Tests E2E
npm test
```

### Antes de un deploy importante (nuevo feature grande)

```bash
# Todo lo anterior, más:

# 4. Accesibilidad
npx playwright test tests/a11y.spec.ts

# 5. Lighthouse
npx lhci autorun --collect.staticDistDir=./dist
```

---

## Cuándo actualizar los tests

| Evento | Acción |
|---|---|
| Se agrega una nueva página | Agregar un `.spec.ts` para esa ruta |
| Se agrega un componente con interactividad Alpine.js | Agregar test del toggle/comportamiento |
| Se cambia un href o texto de botón | Actualizar el test correspondiente |
| Se cambia la contraseña del admin | Actualizar `admin.spec.ts` |
| Se agrega un nuevo aliado o post real | Actualizar los `toHaveCount()` |
