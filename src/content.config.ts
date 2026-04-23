import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const ctf = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/ctf" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    platform: z.string(),
    vulnerability_type: z.string().optional(),
    category: z.string().optional(),
    difficulty: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false)
  })
});

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false)
  })
});

export const collections = {
  ctf,
  blog
};
