#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseEnv } from "node:util";
import matter from "gray-matter";

const CONTENT_ROOTS = [
  { dir: path.resolve("src/content/ctf"), routeBase: "ctf" },
  { dir: path.resolve("src/content/blog"), routeBase: "blog" }
];

const DIST_ROOT = path.resolve("dist");

function loadLocalEnvironment() {
  const loaded = {};
  const candidates = [
    ".env",
    ".env.local",
    ".env.production",
    ".env.production.local"
  ];

  for (const candidate of candidates) {
    const envPath = path.resolve(candidate);
    if (!fs.existsSync(envPath)) continue;
    Object.assign(loaded, parseEnv(fs.readFileSync(envPath, "utf8")));
  }

  for (const [key, value] of Object.entries(loaded)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function walkMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkMarkdownFiles(fullPath));
      continue;
    }
    if (entry.isFile() && (fullPath.endsWith(".md") || fullPath.endsWith(".mdx"))) {
      files.push(fullPath);
    }
  }

  return files;
}

function toOutputHtmlPath(markdownPath, contentDir, routeBase) {
  const relative = path.relative(contentDir, markdownPath);
  const parsed = path.parse(relative);
  const relativeNoExt = path.join(parsed.dir, parsed.name);

  const slugPath =
    parsed.name.toLowerCase() === "index" ? parsed.dir : relativeNoExt;

  return path.join(DIST_ROOT, routeBase, slugPath, "index.html");
}

function resolvePassword(frontmatter, filePath, defaultPasswordEnv = null) {
  const rawPassword = frontmatter?.password;
  const passwordEnv = frontmatter?.password_env;

  if (typeof passwordEnv === "string" && passwordEnv.trim().length > 0) {
    const envKey = passwordEnv.trim();
    const envVal = process.env[envKey];
    if (!envVal) {
      throw new Error(
        `Missing env var ${envKey} for protected post: ${filePath}`
      );
    }
    return String(envVal);
  }

  if (typeof rawPassword === "string" && rawPassword.trim().length > 0) {
    const trimmed = rawPassword.trim();
    if (/^env:/i.test(trimmed)) {
      const envKey = trimmed.slice(4).trim();
      const envVal = process.env[envKey];
      if (!envVal) {
        throw new Error(
          `Missing env var ${envKey} (from password: env:...) for protected post: ${filePath}`
        );
      }
      return String(envVal);
    }
    return trimmed;
  }

  if (defaultPasswordEnv) {
    const envVal = process.env[defaultPasswordEnv];
    if (!envVal) {
      throw new Error(
        `Missing env var ${defaultPasswordEnv} for private write-up: ${filePath}`
      );
    }
    return String(envVal);
  }

  return null;
}

function encryptHtmlFile(htmlPath, password) {
  const htmlDir = path.dirname(htmlPath);
  const htmlFile = path.basename(htmlPath);
  const tempOutputDir = "__staticrypt_encrypted__";
  const templatePath = path.resolve("scripts/staticrypt-password-template.html");

  const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(
    cmd,
    [
      "staticrypt",
      htmlFile,
      "--password",
      String(password),
      "--short",
      "--template",
      templatePath,
      "--template-title",
      "KYRUX // Cổng mã hóa",
      "--template-instructions",
      "Nội dung đã được mã hóa. Nhập passphrase để mở bài ngay trên trình duyệt.",
      "--template-placeholder",
      "Nhập passphrase",
      "--template-button",
      "MỞ CỬA",
      "--template-error",
      "Passphrase không đúng. Hãy kiểm tra và thử lại.",
      "--template-toggle-show",
      "Hiện passphrase",
      "--template-toggle-hide",
      "Ẩn passphrase",
      "--remember",
      "false",
      "--directory",
      tempOutputDir
    ],
    {
      cwd: htmlDir,
      encoding: "utf8"
    }
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "staticrypt failed");
  }

  const encryptedHtmlPath = path.join(htmlDir, tempOutputDir, htmlFile);
  if (!fs.existsSync(encryptedHtmlPath)) {
    throw new Error(`Encrypted output not found: ${encryptedHtmlPath}`);
  }

  fs.copyFileSync(encryptedHtmlPath, htmlPath);
  fs.rmSync(path.join(htmlDir, tempOutputDir), { recursive: true, force: true });
}

function main() {
  loadLocalEnvironment();

  let encryptedCount = 0;
  let protectedCount = 0;
  let skippedCount = 0;

  for (const root of CONTENT_ROOTS) {
    const markdownFiles = walkMarkdownFiles(root.dir);

    for (const filePath of markdownFiles) {
      const raw = fs.readFileSync(filePath, "utf8");
      const { data } = matter(raw);
      const defaultPasswordEnv =
        root.routeBase === "ctf" && data.public !== true
          ? "KYRUX_POST_PASSWORD"
          : null;
      const password = resolvePassword(data, filePath, defaultPasswordEnv);

      if (!password) continue;
      protectedCount += 1;

      const htmlPath = toOutputHtmlPath(filePath, root.dir, root.routeBase);
      if (!fs.existsSync(htmlPath)) {
        console.warn(`Skipping missing HTML: ${htmlPath}`);
        skippedCount += 1;
        continue;
      }

      encryptHtmlFile(htmlPath, password);
      encryptedCount += 1;
      console.log(`Encrypted: ${htmlPath}`);
    }
  }

  console.log(`Protected posts detected: ${protectedCount}`);
  console.log(`HTML files encrypted: ${encryptedCount}`);
  console.log(`Encrypted skipped (missing HTML): ${skippedCount}`);
}

main();
