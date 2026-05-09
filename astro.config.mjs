// @ts-check
/// <reference types="node" />
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

const base = process.env.BASE_PATH ?? '/';

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://kyrux29.github.io',
  base,
  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [mdx(), sitemap()],
  markdown: {
    syntaxHighlight: 'shiki',
    shikiConfig: {
      // Sync with blog dark/dim theme (proposal 14)
      theme: 'material-theme-darker',
      wrap: true,
      themes: {
        light: 'github-light',
        dark: 'material-theme-darker',
      }
    }
  }
});