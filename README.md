# Kyrux Blog

> **Personal cybersecurity research blog & CTF archive.** Built with Astro, styled like a terminal, deployed to GitHub Pages.

[![Deploy to GitHub Pages](https://github.com/kyrux29/web-blog/actions/workflows/deploy.yml/badge.svg)](https://github.com/kyrux29/web-blog/actions/workflows/deploy.yml)
![Astro](https://img.shields.io/badge/Astro-6.1-cyan?logo=astro)
![Tailwind](https://img.shields.io/badge/Tailwind-4.2-06b6d4?logo=tailwindcss)
![Node](https://img.shields.io/badge/Node-%3E%3D22.12-339933?logo=nodedotjs)

---

## 📡 Overview

Kyrux Blog is a static-site blog focused on **web exploitation**, **CTF write-ups**, and **offensive security research**. Every post follows a structured "Attacker's View" format: root cause analysis → defensive barriers → exploit chain → master payload breakdown.

| Metric | |
|---|---|
| **Pages** | 20 (static generation) |
| **Collections** | `ctf` (write-ups) + `blog` (research) |
| **CTF Write-ups** | 8+ (HTB, custom) |
| **Framework** | Astro 6.1.9 (SSG) |
| **Styling** | TailwindCSS 4.2 + `neutral` dark palette |

---

## 🏗️ Architecture

```
kyrux_blog/
├── src/
│   ├── content/               # Astro Content Collections
│   │   ├── ctf/               # CTF write-ups (.md)
│   │   └── blog/              # Research posts (.md)
│   ├── content.config.ts      # Zod schemas for both collections
│   ├── lib/content.ts         # Centralized data-fetching layer
│   ├── layouts/
│   │   ├── BaseLayout.astro   # Root shell (nav, footer, islands, easter eggs)
│   │   └── PostLayout.astro   # Post shell (header, TOC, JSON-LD, reading time)
│   ├── components/
│   │   ├── CommandPalette.astro  # Cmd+K full-text search (pagefind)
│   │   ├── Terminal.astro        # Interactive pseudo-filesystem modal
│   │   ├── CommandCard.astro     # TL;DR / exploit summary card
│   │   ├── KillChain.astro       # Mermaid attack kill-chain renderer
│   │   ├── ImageLightbox.astro   # Click-to-zoom image viewer
│   │   ├── CopyButton.astro      # Code block copy button
│   │   ├── ThemeToggle.astro     # Dark/dim theme switcher
│   │   └── BackToTop.astro       # Scroll-to-top button
│   ├── pages/
│   │   ├── index.astro           # Homepage (terminal hero + stats + quotes)
│   │   ├── about/index.astro     # About page (skills, tools, links)
│   │   ├── 404.astro             # Terminal-themed 404
│   │   ├── blog/[slug].astro     # Blog post detail
│   │   ├── blog/index.astro      # Blog listing + search
│   │   ├── ctf/[slug].astro      # CTF write-up detail
│   │   ├── ctf/index.astro       # CTF listing + filters
│   │   ├── tags/[tag].astro      # Posts by tag
│   │   ├── tags/index.astro      # All tags
│   │   ├── search/index.astro    # Full-text search page
│   │   ├── robots.txt.ts         # Dynamic robots.txt
│   │   ├── rss.xml.js            # RSS feed
│   │   └── og.svg.ts             # Dynamic OG image generator
│   ├── styles/global.css         # Theme, animations, prose, CmdK styles
│   └── utils.ts                  # Helpers (reading time, difficulty chips, etc.)
├── scripts/
│   ├── import_obsidian.py        # Obsidian vault → Astro collections importer
│   ├── encrypt-posts.js          # staticrypt wrapper for password-protected posts
│   ├── check-internal-links.mjs  # Internal link validator
│   └── enhance-dist-images.mjs   # Post-build image optimization
├── astro.config.mjs
├── package.json
└── .github/workflows/deploy.yml  # CI/CD: lint → check → build → deploy
```

---

## 🎨 Design Philosophy

The blog deliberately avoids the "AI-generated" aesthetic. Key design decisions:

| Anti-pattern | Replaced with |
|---|---|
| Glassmorphism (`backdrop-blur`) | Solid `neutral-900` panels |
| Radial gradient backgrounds | Flat `neutral-950` |
| Box-shadow cyan glow | Subtle border-color transitions |
| Uppercase monospace chips everywhere | Minimal, contextual chips |
| Mixed slate/zinc palette | Unified `neutral` palette |
| Generic hero text | Terminal-prompt style (`[kyrux@labs ~]$ whoami`) |

### Visual Signature

- **Glitch selection** — `::selection` triggers a 300ms jitter animation
- **Custom scrollbar** — Thin cyan-themed (Webkit + Firefox)
- **Watermark** — Subtle "K" SVG at bottom-right
- **ASCII divider** — `.ascii-divider` class for markdown content
- **Terminal motif** — Monospace stats (`$ ls ctf/ | wc -l`), path-style headers (`~/ctf/`)

---

## ⚡ Features

### Content & Search

| Feature | Implementation |
|---|---|
| **Cmd+K Command Palette** | Modal search via pagefind full-text index, keyboard nav (↑↓/Enter/Esc) |
| **Quick filters** | CTF page: platform, difficulty, sort (newest/oldest/easy→hard) |
| **Tag system** | Auto-generated tag pages with cross-collection counts |
| **RSS feed** | `/rss.xml` — both collections |
| **OG images** | Dynamic SVG generation per page via `/og.svg` |
| **JSON-LD** | Structured data on every post (BlogPosting schema) |

### Motion & Polish

| Feature | Detail |
|---|---|
| **Scroll-reveal** | `fade-up` animation via IntersectionObserver (below-fold only) |
| **Card lift** | `.card-lift`: 2px translateY + box-shadow on hover |
| **Reading progress bar** | Fixed 0.5px cyan bar at page top |
| **Back-to-top** | Appears after 300px scroll, smooth scroll |
| **Active nav indicator** | `::after` cyan underline on current page |
| **Smooth scroll** | `scroll-behavior: smooth` + `scroll-margin-top` for heading anchors |
| **TOC scroll-spy** | IntersectionObserver highlights current section in sidebar |

### Metadata

| Field | Description |
|---|---|
| **Reading time** | `estimateReadingTime()` — 200 wpm, shown on post pages |
| **Dynamic chip** | `"CTF Write-up"` / `"Research"` based on collection |
| **Last modified** | Optional `lastModified` field (shows "updated YYYY-MM-DD") |

### Security

| Feature | Detail |
|---|---|
| **CSP** | `Content-Security-Policy` meta tag (self-origin + Cloudflare analytics) |
| **`security.txt`** | RFC 9116 at `/.well-known/security.txt` |
| **`robots.txt`** | Dynamic, auto-points to sitemap |
| **Post encryption** | Optional password-protected posts via staticrypt |
| **Canonical URLs** | Every page gets explicit canonical + OG URL |

### Easter Eggs

| Trigger | Effect |
|---|---|
| **Konami Code** (`↑↑↓↓←→←→BA`) | 200ms hue-rotate(180deg) body flash + console.log Sun Tzu quote |
| **Logo hover** | Random 3px jitter for 300ms (glitch effect) |
| **Terminal** | `>_` button in nav opens pseudo-filesystem with `ls`, `cd`, `cat`, `search`, `tree` |
| **404 page** | Simulated bash session: `$ open /page-not-found` → `bash: command not found` |
| **Random quote** | Homepage shows rotating cybersecurity quotes (Mitnick, Sun Tzu, Kyrux, etc.) |

---

## 📦 Content Collections

Two Astro Content Collections with strict Zod schemas:

### CTF Collection (`src/content/ctf/`)

```ts
schema: z.object({
  title: z.string(),
  date: z.coerce.date(),
  platform: z.string(),                     // e.g. "HackTheBox", "CTFtime"
  vulnerability_type: z.string().optional(), // e.g. "SSRF", "Prototype Pollution"
  category: z.string().optional(),
  difficulty: z.string().optional(),         // "easy" | "medium" | "hard" | "insane"
  tags: z.array(z.string()).default([]),
  public: z.boolean().default(false),         // false = encrypted with KYRUX_POST_PASSWORD
  password: z.string().optional(),           // staticrypt password
  password_env: z.string().optional(),       // env var for password
  draft: z.boolean().default(false)
})
```

### Blog Collection (`src/content/blog/`)

```ts
schema: z.object({
  title: z.string(),
  date: z.coerce.date(),
  description: z.string(),
  tags: z.array(z.string()).default([]),
  password: z.string().optional(),
  password_env: z.string().optional(),
  draft: z.boolean().default(false)
})
```

---

## 🚀 Local Development

### Prerequisites

- **Node.js** ≥ 22.12.0
- **pnpm** 11.0.8

### Setup

```sh
# Install dependencies
pnpm install

# Start dev server (hot reload)
pnpm run dev

# Type-check + lint
pnpm run check
pnpm run lint

# Production build
pnpm run build

# Preview production build locally
pnpm run preview
```

### Post-build pipeline

```sh
pnpm run postbuild
# Runs:
#  1. enhance:images   — optimize images in dist/
#  2. encrypt          — encrypt private/protected posts
#  3. pagefind         — index the encrypted output, never private plaintext
```

---

## 📝 Obsidian → Astro Workflow

Kyrux drafts content in **Obsidian** and imports it via a Python script.

```sh
python3 scripts/import_obsidian.py \
  --source ~/vault/ctf-notes/htb-challenge-name \
  --collection ctf \
  --date 2026-05-01
```

The script handles:

- Wiki-link conversion (`![[image.png]]` → `![](./images/image.png)`)
- Markdown image link normalization
- Frontmatter generation from source metadata
- Auto-detection of platform, difficulty, vulnerability type

### Folder Convention (Obsidian)

```
vault/ctf-notes/
└── htb-web-batchcraft-potions/
    ├── index.md            # Main write-up
    ├── images/             # Screenshots
    │   ├── Pasted image 20260503231037.png
    │   └── ...
    └── metadata.yaml       # { platform, difficulty, vuln_type, tags }
```

---

## 🔐 Password-Protected Posts

CTF write-ups are private by default and encrypted with
`KYRUX_POST_PASSWORD` using [staticrypt](https://github.com/robinmoisson/staticrypt)
during post-build. To publish one write-up without a passphrase, opt in explicitly:

```yaml
---
title: "Public Write-up"
public: true
---
```

Blog posts remain public by default. A Blog post can still be protected
individually with `password_env: "KYRUX_POST_PASSWORD"` (preferred) or
`password: "..."`.

Keep the shared CTF passphrase outside source control:

```sh
cp .env.example .env
# edit KYRUX_POST_PASSWORD in .env
npm run build
npm run preview
```

The password screen is generated in `dist/` during `postbuild`; `npm run dev`
continues to render source content directly for authoring. Encryption runs before
Pagefind, so private write-up plaintext is not copied into the search index.

For GitHub Pages, add the same value under
**Settings → Secrets and variables → Actions → New repository secret** with the
name `KYRUX_POST_PASSWORD`. Production deploys fail closed when this secret is
missing, preventing an accidentally unencrypted release.

Staticrypt encrypts the generated HTML and decrypts it locally in the browser.
Use a long, unique passphrase; this is client-side protection, not server-side
authentication.

---

## 🌐 Deployment (GitHub Pages)

Deployment is fully automated via GitHub Actions (`.github/workflows/deploy.yml`).

### Pipeline

1. **Lint** — `pnpm run lint` (astro check)
2. **Typecheck** — `pnpm run check`
3. **Build** — `pnpm run build` for `https://kyrux.xyz/`
4. **Link check** — lychee scans all internal links in `dist/`
5. **Deploy** — `actions/deploy-pages@v4`

### Setup

1. Push to `main` branch on GitHub
2. In repo **Settings → Pages**, set **Source** to **GitHub Actions**
3. Every push to `main` deploys automatically

The workflow deploys to the custom domain root:
- `SITE_URL=https://kyrux.xyz`
- `BASE_PATH=/`
- `public/CNAME` keeps the custom domain in the published artifact

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Astro 6.1](https://astro.build) |
| **Styling** | [TailwindCSS 4.2](https://tailwindcss.com) + `@tailwindcss/typography` |
| **Content** | Astro Content Collections + MDX |
| **Syntax Highlight** | Shiki (`github-dark` theme) |
| **Search** | [Pagefind](https://pagefind.app) (static full-text) |
| **Diagrams** | Mermaid.js (via `KillChain.astro`) |
| **Encryption** | [staticrypt](https://github.com/robinmoisson/staticrypt) |
| **Image Optimization** | sharp + Astro `getImage()` |
| **Deployment** | GitHub Pages + GitHub Actions |
| **Package Manager** | pnpm 11 |
| **TypeScript** | 6.0 |
| **Fonts** | JetBrains Mono + Geist Sans (self-hosted woff2) |

---

## 👤 Author

**Kyrux** (Vu Trong Quoc Khanh)

- GitHub: [@kyrux29](https://github.com/kyrux29)
- HackTheBox: [kyrux29](https://app.hackthebox.com/users/kyrux29)
- Contact: `vutrongquockhanh29@gmail.com`

> *"Every defensive measure is just an offensive measure waiting to be reversed."*
