#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const DIST_ROOT = path.resolve("dist");

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && full.endsWith(".html")) out.push(full);
  }
  return out;
}

function isIgnorableHref(href) {
  return (
    !href ||
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("javascript:") ||
    /^https?:\/\//i.test(href)
  );
}

function resolveTargetFile(href, htmlFile) {
  const clean = href.split("#")[0].split("?")[0];
  if (!clean) return null;

  const absolutePath = clean.startsWith("/")
    ? path.join(DIST_ROOT, clean)
    : path.resolve(path.dirname(htmlFile), clean);

  const candidates = [
    absolutePath,
    `${absolutePath}.html`,
    path.join(absolutePath, "index.html"),
    absolutePath.endsWith(".html") ? absolutePath : null
  ].filter(Boolean);

  return candidates.find((c) => fs.existsSync(c)) ?? null;
}

function main() {
  const htmlFiles = walk(DIST_ROOT);
  const broken = [];
  const hrefRegex = /href\s*=\s*"([^"]+)"/gi;

  for (const htmlFile of htmlFiles) {
    const content = fs.readFileSync(htmlFile, "utf8");
    let match;
    while ((match = hrefRegex.exec(content)) !== null) {
      const href = match[1];
      if (isIgnorableHref(href)) continue;
      const resolved = resolveTargetFile(href, htmlFile);
      if (!resolved) {
        broken.push({
          file: path.relative(DIST_ROOT, htmlFile),
          href
        });
      }
    }
  }

  if (broken.length > 0) {
    console.error(`Found ${broken.length} broken internal links:`);
    for (const item of broken) {
      console.error(`- ${item.file}: ${item.href}`);
    }
    process.exit(1);
  }

  console.log(`Internal link check passed (${htmlFiles.length} HTML files).`);
}

main();

