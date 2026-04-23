#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function getArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function toTitleCase(value) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function platformPrefix(platform) {
  const normalized = platform.toLowerCase();
  if (normalized.includes("hackthebox")) return "htb";
  if (normalized.includes("portswigger")) return "portswigger";
  return slugify(platform);
}

function normalizeImagePath(rawTarget) {
  const cleaned = rawTarget.trim().replace(/^["']|["']$/g, "");
  if (
    cleaned.startsWith("http://") ||
    cleaned.startsWith("https://") ||
    cleaned.startsWith("data:") ||
    cleaned.startsWith("#")
  ) {
    return cleaned;
  }

  const noDotPrefix = cleaned.replace(/^\.\//, "");
  if (noDotPrefix.startsWith("images/")) return `./${noDotPrefix}`;

  if (!noDotPrefix.includes("/")) return `./images/${noDotPrefix}`;

  return `./${noDotPrefix}`;
}

function fixImageLinks(content) {
  const wikiFixed = content.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, alt) => {
    const finalTarget = normalizeImagePath(target);
    const finalAlt = (alt ?? path.basename(target)).replace(/\.[^.]+$/, "");
    return `![${finalAlt}](${finalTarget})`;
  });

  return wikiFixed.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, target) => {
    return `![${alt}](${normalizeImagePath(target)})`;
  });
}

function ensureDir(targetPath) {
  if (!fs.existsSync(targetPath)) fs.mkdirSync(targetPath, { recursive: true });
}

function parseSourceMetadata(sourceDir) {
  const parts = sourceDir.split(path.sep);
  const challenge = parts[parts.length - 1];
  const category = parts[parts.length - 2];
  const challengesFolder = parts[parts.length - 3] ?? "";
  const platform = challengesFolder.replace(/\s*challenges\s*$/i, "") || "Unknown";
  return {
    title: challenge,
    categoryRaw: category,
    category: toTitleCase(category),
    platform
  };
}

function frontmatterBlock(meta, date) {
  return [
    "---",
    `title: "${meta.title}"`,
    `date: ${date}`,
    `platform: "${meta.platform}"`,
    `category: "${meta.category}"`,
    'difficulty: "Medium"',
    `tags: ["${slugify(meta.categoryRaw)}", "${slugify(meta.platform)}"]`,
    "draft: false",
    "---",
    ""
  ].join("\n");
}

function findChallengeDirs(rootDir) {
  const found = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || !fs.existsSync(current)) continue;

    const readmePath = path.join(current, "README.md");
    if (fs.existsSync(readmePath)) {
      found.push(current);
      continue;
    }

    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith(".")) continue;
      stack.push(path.join(current, entry.name));
    }
  }

  return found.sort((a, b) => a.localeCompare(b));
}

function importOne(sourceDir, { outRoot, date, overwrite }) {
  const absSource = path.resolve(sourceDir);
  const readmePath = path.join(absSource, "README.md");
  const imagesPath = path.join(absSource, "images");

  if (!fs.existsSync(readmePath)) {
    throw new Error(`README.md not found at: ${readmePath}`);
  }

  const meta = parseSourceMetadata(absSource);
  const bundleSlug = `${platformPrefix(meta.platform)}-${slugify(meta.categoryRaw)}-${slugify(meta.title)}`;
  const absOutRoot = path.resolve(outRoot);
  const bundleDir = path.join(absOutRoot, bundleSlug);
  const indexPath = path.join(bundleDir, "index.mdx");
  const outImagesPath = path.join(bundleDir, "images");

  if (fs.existsSync(bundleDir)) {
    if (!overwrite) {
      return { skipped: true, source: absSource, bundle: bundleDir };
    }
    fs.rmSync(bundleDir, { recursive: true, force: true });
  }

  ensureDir(bundleDir);

  if (fs.existsSync(imagesPath)) {
    fs.cpSync(imagesPath, outImagesPath, { recursive: true });
  }

  let content = fs.readFileSync(readmePath, "utf8");
  content = fixImageLinks(content);

  if (!content.trimStart().startsWith("---")) {
    content = `${frontmatterBlock(meta, date)}\n${content}`;
  }

  fs.writeFileSync(indexPath, content, "utf8");
  return { skipped: false, source: absSource, bundle: bundleDir, index: indexPath };
}

function main() {
  const sourceDir = getArg("source");
  const outRoot = getArg("out") ?? "src/content/ctf";
  const date = getArg("date") ?? new Date().toISOString().slice(0, 10);
  const overwrite = process.argv.includes("--overwrite");
  const bulk = process.argv.includes("--bulk");

  if (!sourceDir) {
    console.error("Missing required argument: --source <path-to-challenge-folder-or-root>");
    process.exit(1);
  }

  const absSource = path.resolve(sourceDir);
  if (!fs.existsSync(absSource)) {
    console.error(`Source path does not exist: ${absSource}`);
    process.exit(1);
  }

  if (!bulk) {
    const result = importOne(absSource, { outRoot, date, overwrite });
    if (result.skipped) {
      console.log(`Skipped (exists): ${result.bundle}`);
      return;
    }
    console.log(`Imported: ${result.source}`);
    console.log(`Bundle: ${result.bundle}`);
    console.log(`Entry: ${result.index}`);
    return;
  }

  const challengeDirs = findChallengeDirs(absSource);
  if (challengeDirs.length === 0) {
    console.error(`No README.md challenge folders found under: ${absSource}`);
    process.exit(1);
  }

  let imported = 0;
  let skipped = 0;
  for (const dir of challengeDirs) {
    try {
      const result = importOne(dir, { outRoot, date, overwrite });
      if (result.skipped) {
        skipped += 1;
        console.log(`Skipped: ${result.bundle}`);
      } else {
        imported += 1;
        console.log(`Imported: ${result.bundle}`);
      }
    } catch (error) {
      console.error(`Failed: ${dir}`);
      console.error(error instanceof Error ? error.message : String(error));
    }
  }

  console.log(`Done. Imported: ${imported}, Skipped: ${skipped}, Total: ${challengeDirs.length}`);
}

main();
