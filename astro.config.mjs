// @ts-check
/// <reference types="node" />
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE_URL ?? 'https://kyrux.xyz';
const base = process.env.BASE_PATH ?? '/';
const normalizedBase = base.startsWith('/') ? base : `/${base}`;

// https://astro.build/config
export default defineConfig({
  site,
  base: normalizedBase.endsWith('/') ? normalizedBase : `${normalizedBase}/`,
  
  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [mdx(), sitemap()],
  markdown: {
    syntaxHighlight: 'shiki',
    shikiConfig: {
      theme: 'material-theme-darker',
      wrap: true,
    }
  }
});
