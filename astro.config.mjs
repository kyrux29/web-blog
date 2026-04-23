// @ts-check
/// <reference types="node" />
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';

const base = process.env.BASE_PATH ?? '/';

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://kyrux29.github.io',
  base,
  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [mdx()],
  markdown: {
    syntaxHighlight: 'shiki',
    shikiConfig: {
      theme: 'github-dark',
      wrap: true
    }
  }
});