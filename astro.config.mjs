// @ts-check
/// <reference types="node" />
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // 1. Cập nhật `site` thành tên miền gốc của bạn
  site: 'https://kyrux.xyz',
  
  // 2. Fix cứng `base` là '/' để loại bỏ hoàn toàn dính dáng đến '/web-blog'
  base: '/',
  
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