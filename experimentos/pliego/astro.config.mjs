// @ts-check
import { defineConfig } from 'astro/config';

// Experimento de diseño para Amine, publicado en un subdominio con noindex
// (no compite en Google con espacioamine.com).
export default defineConfig({
  site: 'https://fold.espacioamine.com',
  build: { format: 'directory' },
});
