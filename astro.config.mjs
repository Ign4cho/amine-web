// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import alpinejs from '@astrojs/alpinejs';

// https://astro.build/config
export default defineConfig({
  // Prod usa el default; el build de preview lo overridea con
  // SITE_URL=https://preview.espacioamine.com (ver script build:preview).
  site: process.env.SITE_URL || 'https://espacioamine.com',

  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [alpinejs()]
});