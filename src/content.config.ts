import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    title: z.string(),
    date: z.date(),
    image: image(),
    description: z.string(),
    author: z.object({
      name: z.string(),
      avatar: image(),
    }),
  }),
});

const aliados = defineCollection({
  type: 'data',
  schema: ({ image }) => z.object({
    name: z.string(),
    avatar: image(),
    description: z.string(),
    services: z.array(z.string()),
    contact: z.object({
      type: z.enum(['whatsapp', 'email']),
      value: z.string(),
    }),
    order: z.number(),
  }),
});

export const collections = { blog, aliados };
