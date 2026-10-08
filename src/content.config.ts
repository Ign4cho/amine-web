import { defineCollection, z } from 'astro:content';
import { file } from 'astro/loaders';

// Blogcito v2: un único JSON con todas las notas, editable desde /admin.
// No usa markdown ni una carpeta por post a propósito: el panel de admin
// exporta este archivo completo, así la owner puede autogestionar el feed
// sin tocar la estructura del repo. Las imágenes viven en `public/blogcito/`
// (ruta pública, no `image()`), para que se puedan subir por File Manager.
const blogcito = defineCollection({
  loader: file('src/data/blogcito.json'),
  schema: z.object({
    title: z.string(),
    date: z.string(), // ISO corta: YYYY-MM-DD
    tag: z.string().optional(),
    image: z.string(), // ruta pública, ej: /blogcito/cover-1.svg
    excerpt: z.string(), // visible siempre, antes de "Leer más"
    body: z.string(), // párrafos separados por \n\n, se revela al expandir
    order: z.number(),
    published: z.boolean().default(true),
  }),
});

const aliados = defineCollection({
  type: 'data',
  schema: ({ image }) => z.object({
    name: z.string(),
    avatar: image(),
    photo: image().optional(),
    paper: image().optional(),
    logo: image().optional(),
    description: z.string(),
    services: z.array(z.string()),
    contact: z.object({
      type: z.enum(['whatsapp', 'email']),
      value: z.string(),
    }),
    portfolio: z.string().url().optional(),
    area: z.string().optional(),
    order: z.number(),
  }),
});

export const collections = { blogcito, aliados };
