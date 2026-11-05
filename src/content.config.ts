import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      tag: z.string().default('Cocina'),
      readingTime: z.string().default('3 min'),
      draft: z.boolean().default(false),
    }),
});

export const collections = { blog };
