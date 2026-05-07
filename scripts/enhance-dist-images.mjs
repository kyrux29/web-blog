#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const DIST_DIR = path.resolve("dist");
const ASTRO_PREFIX = "/_astro/";

function walkHtml(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkHtml(full));
    else if (entry.isFile() && full.endsWith(".html")) out.push(full);
  }
  return out;
}

function parseAttrs(attrStr) {
  const attrs = {};
  const re = /([^\s=]+)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(attrStr)) !== null) attrs[m[1]] = m[2];
  return attrs;
}

function buildAttrString(attrs) {
  return Object.entries(attrs)
    .map(([k, v]) => `${k}="${String(v).replace(/"/g, "&quot;")}"`)
    .join(" ");
}

async function generateVariants(absSrcPath) {
  const image = sharp(absSrcPath);
  const meta = await image.metadata();
  const baseWidth = meta.width ?? 0;
  if (!baseWidth) return null;

  const widths = Array.from(new Set([Math.min(640, baseWidth), Math.min(1024, baseWidth), baseWidth])).sort(
    (a, b) => a - b
  );

  const dir = path.dirname(absSrcPath);
  const ext = path.extname(absSrcPath);
  const base = path.basename(absSrcPath, ext);

  const webpSet = [];
  const avifSet = [];

  for (const w of widths) {
    const webpName = `${base}.w${w}.webp`;
    const avifName = `${base}.w${w}.avif`;
    const webpPath = path.join(dir, webpName);
    const avifPath = path.join(dir, avifName);

    if (!fs.existsSync(webpPath)) {
      await sharp(absSrcPath).resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toFile(webpPath);
    }
    if (!fs.existsSync(avifPath)) {
      await sharp(absSrcPath).resize({ width: w, withoutEnlargement: true }).avif({ quality: 48 }).toFile(avifPath);
    }

    webpSet.push(`${ASTRO_PREFIX}${webpName} ${w}w`);
    avifSet.push(`${ASTRO_PREFIX}${avifName} ${w}w`);
  }

  return { widths, webpSet, avifSet };
}

async function main() {
  const htmlFiles = walkHtml(DIST_DIR);
  let rewritten = 0;
  let converted = 0;

  const imgRegex = /<img\b([^>]*?)src="([^"]*\/_astro\/[^"]+\.webp)"([^>]*)>/g;

  for (const htmlFile of htmlFiles) {
    let html = fs.readFileSync(htmlFile, "utf8");
    let changed = false;
    const replacements = [];

    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      const fullTag = match[0];
      const pre = match[1] ?? "";
      const src = match[2];
      const post = match[3] ?? "";

      const attrs = parseAttrs(`${pre} ${post}`);
      const absSrc = path.join(DIST_DIR, src.replace(/^\//, ""));
      if (!fs.existsSync(absSrc)) continue;

      const variants = await generateVariants(absSrc);
      if (!variants) continue;
      converted += 1;

      attrs.loading = attrs.loading || "lazy";
      attrs.decoding = attrs.decoding || "async";
      attrs.sizes = attrs.sizes || "(max-width: 1024px) 100vw, 1024px";
      const imgAttr = buildAttrString({ ...attrs, src });

      const picture = `<picture><source type="image/avif" srcset="${variants.avifSet.join(
        ", "
      )}" sizes="${attrs.sizes}"><source type="image/webp" srcset="${variants.webpSet.join(
        ", "
      )}" sizes="${attrs.sizes}"><img ${imgAttr}></picture>`;

      replacements.push([fullTag, picture]);
    }

    for (const [from, to] of replacements) {
      if (html.includes(from)) {
        html = html.replace(from, to);
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(htmlFile, html, "utf8");
      rewritten += 1;
    }
  }

  console.log(`Image enhancement complete. HTML rewritten: ${rewritten}, images processed: ${converted}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

