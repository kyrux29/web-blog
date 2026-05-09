# Master Plan: 19 Đề Xuất - Kyrux Blog Cybersecurity Rebrand

## Tổng quan
Kế hoạch chi tiết để triển khai **19 đề xuất** nhằm nâng cấp blog cybersecurity/hacker Kyrux. 

**Mục tiêu chính**: 
- Sửa toàn bộ bugs hiện tại (ưu tiên cao)
- Xây dựng "visual signature" hacker mạnh mẽ (ASCII, glitch, CRT, cursor, PGP)
- Nâng cấp Terminal thành công cụ thực thụ với fortune, matrix, neofetch, smart completion
- Cải thiện content & features (related posts, shiki sync, draft preview, print CSS)
- Polish & tích hợp các component chết (KillChain, CommandCard) + redesign About page

**Thứ tự ưu tiên**: Nhóm 1 (Fix Bugs) → Nhóm 2 (Visual Signature) → Nhóm 3 (Terminal Nâng Cấp) → Nhóm 4 (Content & Features) → Nhóm 5 (Polish & Integration).

Dự án sử dụng **Astro 6 + Tailwind 4 + Terminal pseudo-filesystem + Content Collections + staticrypt + pagefind**. Codebase đã có dark/dim theme, glitch selection, Konami easter egg.

---

## Nhóm 1: Fix Bugs

### 1. Fix Ctrl+` terminal bug
- **Mục tiêu**: Sửa lỗi toggle Terminal panel bằng phím tắt `Ctrl+`` (backtick). Hiện tại chỉ hoạt động qua button click, keyboard handler chưa được implement đầy đủ.
- **Files liên quan**: [`src/components/Terminal.astro`](src/components/Terminal.astro:416), [`src/layouts/BaseLayout.astro`](src/layouts/BaseLayout.astro:146), [`src/layouts/BaseLayout.astro`](src/layouts/BaseLayout.astro:312)
- **Cách tiếp cận kỹ thuật**: 
  1. Thêm global `keydown` listener trong BaseLayout.astro (inline script) hoặc Terminal.astro.
  2. Detect `event.ctrlKey && event.key === '`'` (grave accent).
  3. Toggle `#terminal-modal` class `hidden`/`flex`, focus input.
  4. Prevent default để tránh conflict.
  5. Cập nhật button title và aria.
- **Dependencies**: Không có.
- **Rủi ro/Chú ý**: Conflict với devtools (Ctrl+Shift+`), khác biệt keyboard layout (US vs VN), accessibility (screen reader).

### 2. Fix pagefind-body
- **Mục tiêu**: Pagefind không index đúng nội dung body của post, dẫn đến search kém. Cần thêm `data-pagefind-body` attribute đúng chỗ.
- **Files liên quan**: [`src/layouts/PostLayout.astro`](src/layouts/PostLayout.astro:71), [`src/layouts/BaseLayout.astro`](src/layouts/BaseLayout.astro:156), [`src/pages/search/index.astro`](src/pages/search/index.astro)
- **Cách tiếp cận kỹ thuật**: 
  1. Thêm `data-pagefind-body` vào `<main id="content">` hoặc div chứa article body trong PostLayout.
  2. Loại trừ nav, footer, terminal, sidebar bằng `data-pagefind-ignore`.
  3. Rebuild index sau khi sửa (`npm run build`).
  4. Test với `pagefind --serve`.
- **Dependencies**: Không có.
- **Rủi ro/Chú ý**: Có thể index nhầm terminal output hoặc JSON-LD; cần test search accuracy sau khi sửa.

### 3. Clean dead code
- **Mục tiêu**: Xóa hoặc tích hợp [`src/components/CommandCard.astro`](src/components/CommandCard.astro) và [`src/components/KillChain.astro`](src/components/KillChain.astro) đang không được sử dụng ở bất kỳ đâu.
- **Files liên quan**: [`src/components/CommandCard.astro`](src/components/CommandCard.astro), [`src/components/KillChain.astro`](src/components/KillChain.astro), [`src/pages/blog/[slug].astro`](src/pages/blog/[slug].astro), [`src/pages/ctf/[slug].astro`](src/pages/ctf/[slug].astro)
- **Cách tiếp cận kỹ thuật**: Quyết định tích hợp vào proposal 17 & 18 (ưu tiên integrate hơn xóa). Scan toàn codebase bằng regex để confirm dead code.
- **Dependencies**: Phụ thuộc proposal 17, 18.
- **Rủi ro/Chú ý**: Mất component nếu xóa vội; cần backup trước.

## Nhóm 2: Visual Signature (tạo chất riêng hacker)

### 4. ASCII banner homepage
- **Mục tiêu**: Thêm ASCII art cyberpunk/hacker banner (figlet/toilet style) lên trang chủ để tạo ấn tượng đầu tiên mạnh mẽ.
- **Files liên quan**: [`src/pages/index.astro`](src/pages/index.astro), [`src/styles/global.css`](src/styles/global.css), new file `src/components/AsciiBanner.astro`
- **Cách tiếp cận kỹ thuật**: Sử dụng pre-generated ASCII (tool như `figlet -f slant "KYRUX"`), wrap trong `<pre class="ascii-banner">`, thêm CSS animation subtle flicker. Responsive scaling.
- **Dependencies**: Nhóm 1 hoàn tất.
- **Rủi ro/Chú ý**: Mobile overflow, load time, accessibility (screen reader skip).

### 5. Glitch text effect
- **Mục tiêu**: Áp dụng hiệu ứng glitch lên headings, titles, tên blog để tăng cảm giác "hacked".
- **Files liên quan**: [`src/styles/global.css`](src/styles/global.css:1), [`src/pages/index.astro`](src/pages/index.astro), [`src/layouts/BaseLayout.astro`](src/layouts/BaseLayout.astro:119)
- **Cách tiếp cận kỹ thuật**: Tạo `@keyframes glitch, glitch-anim` sử dụng `clip-path`, `transform`, `text-shadow` multi-layer (cyan/red). Thêm class `.glitch` với `data-text` attribute. Trigger on hover/load.
- **Dependencies**: Nhóm 1.
- **Rủi ro/Chú ý**: Performance trên mobile, epilepsy trigger (có thể thêm reduced-motion media query).

### 6. CRT scanlines theme
- **Mục tiêu**: Thêm overlay CRT monitor effect (scanlines, flicker, vignette, chromatic aberration) có thể toggle.
- **Files liên quan**: [`src/styles/global.css`](src/styles/global.css), [`src/components/ThemeToggle.astro`](src/components/ThemeToggle.astro), new `src/components/CrtOverlay.astro`
- **Cách tiếp cận kỹ thuật**: Sử dụng multiple background linear-gradient cho scanlines + CSS animation `flicker`. Thêm CSS variables `--crt-opacity`. Integrate với existing dark/dim theme toggle.
- **Dependencies**: 5 (glitch).
- **Rủi ro/Chú ý**: Performance (will-change: transform), toggle state persistence (localStorage).

### 7. Cursor trail effect
- **Mục tiêu**: Custom cursor với matrix-style particle trail theo chuột.
- **Files liên quan**: [`src/styles/global.css`](src/styles/global.css), [`src/layouts/BaseLayout.astro`](src/layouts/BaseLayout.astro:102), new JS island `src/components/CursorTrail.astro`
- **Cách tiếp cận kỹ thuật**: Canvas element follow mouse, emit particles với requestAnimationFrame. Style cursor: none. Fallback cho touch devices.
- **Dependencies**: 6.
- **Rủi ro/Chú ý**: High CPU usage, mobile compatibility, z-index conflict với terminal.

### 8. PGP public key block
- **Mục tiêu**: Hiển thị PGP key fingerprint + copyable block trên about page/footer.
- **Files liên quan**: [`src/pages/about/index.astro`](src/pages/about/index.astro), [`src/components/CopyButton.astro`](src/components/CopyButton.astro), new `public/pgp-key.asc`
- **Cách tiếp cận kỹ thuật**: Sử dụng `<pre><code>` với fingerprint highlight, integrate CopyButton. Thêm link download key.
- **Dependencies**: Không.
- **Rủi ro/Chú ý**: Key security, update key khi expire.

## Nhóm 3: Terminal Nâng Cấp

### 9. fortune command
- **Mục tiêu**: Lệnh `fortune` hiển thị random hacker wisdom, cyber tips, fun facts.
- **Files liên quan**: [`src/components/Terminal.astro`](src/components/Terminal.astro:243), new quotes array in script or JSON.
- **Cách tiếp cận kỹ thuật**: Thêm case trong `runCommand()`, array quotes ~20 items, random select + print with color.
- **Dependencies**: 1 (terminal bug fix).
- **Rủi ro/Chú ý**: Quotes phải phù hợp tone hacker.

### 10. matrix command
- **Mục tiêu**: Lệnh `matrix` tạo rain effect **chỉ trong terminal panel** (không fullscreen).
- **Files liên quan**: [`src/components/Terminal.astro`](src/components/Terminal.astro:11), extend output div với canvas.
- **Cách tiếp cận kỹ thuật**: Thêm canvas overlay trong terminal, implement simple matrix rain JS (katakana chars, fading). Command `matrix stop` để tắt.
- **Dependencies**: 1, 9.
- **Rủi ro/Chú ý**: Canvas performance trong modal.

### 11. neofetch command
- **Mục tiêu**: Lệnh `neofetch` hiển thị system info theo style ASCII art (blog stats, build info, theme).
- **Files liên quan**: [`src/components/Terminal.astro`](src/components/Terminal.astro:197)
- **Cách tiếp cận kỹ thuật**: Parse terminalStats + Astro build metadata, render multi-line ASCII với colors (cyan, green).
- **Dependencies**: 1.
- **Rủi ro/Chú ý**: Dynamic stats phải sync với content collections.

### 12. Smart tab completion nâng cấp
- **Mục tiêu**: Cải thiện tab completion hỗ trợ multi-word, context-aware (commands vs files), fuzzy matching.
- **Files liên quan**: [`src/components/Terminal.astro`](src/components/Terminal.astro:169)
- **Cách tiếp cận kỹ thuật**: Refactor `completions()` và `updateSuggestion()` dùng Fuse.js (nếu add dep) hoặc simple Levenshtein. Context: nếu sau "cd" thì chỉ dirs.
- **Dependencies**: 1, 9-11.
- **Rủi ro/Chú ý**: Thêm dependency hoặc giữ vanilla.

## Nhóm 4: Content & Features

### 13. Related posts
- **Mục tiêu**: Hiển thị related posts dựa trên tag overlap ở cuối mỗi bài (blog + CTF).
- **Files liên quan**: [`src/layouts/PostLayout.astro`](src/layouts/PostLayout.astro:100), [`src/lib/content.ts`](src/lib/content.ts), [`src/pages/blog/[slug].astro`](src/pages/blog/[slug].astro)
- **Cách tiếp cận kỹ thuật**: Function `getRelatedPosts()` trong content.ts dùng tag intersection score. Render grid cards.
- **Dependencies**: 3.
- **Rủi ro/Chú ý**: Performance nếu nhiều posts, duplicate avoidance.

### 14. Shiki theme sync
- **Mục tiêu**: Đồng bộ syntax highlighting Shiki với dark/dim theme của blog qua CSS variables.
- **Files liên quan**: `astro.config.mjs`, [`src/styles/global.css`](src/styles/global.css), new `shiki-theme.json`
- **Cách tiếp cận kỹ thuật**: Tạo custom Shiki theme JSON mapping từ Tailwind colors + CSS vars. Config trong astro.config.
- **Dependencies**: 6 (theme).
- **Rủi ro/Chú ý**: Shiki theme compilation time.

### 15. Draft preview
- **Mục tiêu**: Cho phép preview draft posts trong dev mode (`?draft=true` hoặc env flag).
- **Files liên quan**: [`src/content.config.ts`](src/content.config.ts), [`src/lib/content.ts`](src/lib/content.ts), pages blog/ctf.
- **Cách tiếp cận kỹ thuật**: Filter trong getCollection với `Astro.env` hoặc query param. Add dev-only route.
- **Dependencies**: Không.
- **Rủi ro/Chú ý**: Security (không leak draft production).

### 16. Print stylesheet
- **Mục tiêu**: CSS `@media print` để in bài viết đẹp (ẩn nav/terminal/sidebar, tối ưu typography).
- **Files liên quan**: [`src/styles/global.css`](src/styles/global.css), [`src/layouts/PostLayout.astro`](src/layouts/PostLayout.astro)
- **Cách tiếp cận kỹ thuật**: `@media print { ... }` rules: hide header/footer/terminal, force black/white, better line-height.
- **Dependencies**: 14.
- **Rủi ro/Chú ý**: Print-specific Shiki colors.

## Nhóm 5: Polish & Integration

### 17. Integrate KillChain component
- **Mục tiêu**: Tích hợp [`src/components/KillChain.astro`](src/components/KillChain.astro) vào CTF writeups để visualize attack chain.
- **Files liên quan**: [`src/components/KillChain.astro`](src/components/KillChain.astro), [`src/pages/ctf/[slug].astro`](src/pages/ctf/[slug].astro), CTF markdowns (frontmatter support).
- **Cách tiếp cận kỹ thuật**: Extend MDX/remark để parse killchain data, render component với SVG arrows.
- **Dependencies**: 3, 13.
- **Rủi ro/Chú ý**: Markdown compatibility.

### 18. Integrate CommandCard component
- **Mục tiêu**: Tích hợp [`src/components/CommandCard.astro`](src/components/CommandCard.astro) vào blog posts cho command snippets đẹp.
- **Files liên quan**: [`src/components/CommandCard.astro`](src/components/CommandCard.astro), [`src/pages/blog/[slug].astro`](src/pages/blog/[slug].astro), global.css
- **Cách tiếp cận kỹ thuật**: Tạo MDX component hoặc remark plugin để auto-wrap code blocks thành CommandCard với copy + terminal icon.
- **Dependencies**: 3, 17.
- **Rủi ro/Chú ý**: Styling conflict với existing CopyButton.

### 19. About page hacker redesign
- **Mục tiêu**: Thiết kế lại about page với skills matrix, tools grid, certifications, timeline.
- **Files liên quan**: [`src/pages/about/index.astro`](src/pages/about/index.astro), [`src/styles/global.css`](src/styles/global.css), new components (SkillMatrix.astro, Timeline.astro)
- **Cách tiếp cận kỹ thuật**: Sử dụng Tailwind grid + Terminal aesthetic. Interactive timeline với hover effects. Integrate PGP (proposal 8).
- **Dependencies**: 4,5,6,8.
- **Rủi ro/Chú ý**: Content update, responsive grid.

---

## Phụ lục: Thứ tự triển khai

| Thứ tự | Proposal | Nhóm | Ước tính | Dependencies | Status |
|--------|----------|------|----------|--------------|--------|
| 1 | 1. Ctrl+` fix | 1 | 2h | - | ✅ Done |
| 2 | 2. Pagefind fix | 1 | 1.5h | - | ✅ Done |
| 3 | 3. Clean dead code | 1 | 3h | - | ✅ Done |
| 4-8 | Visual Signature (4→8) | 2 | 12h | 1-3 | ✅ Done |
| 9-12 | Terminal upgrades | 3 | 10h | 1,4-8 | ✅ Done |
| 13-16 | Content & Features | 4 | 8h | 3,14 | ✅ Done |
| 17-19 | Polish & Integration | 5 | 10h | All above | ✅ Done |

**Tổng thời gian ước tính**: ~46 giờ (có thể làm theo sprint 1-2 tuần).

**Critical Path**: Fix bugs → Visual → Terminal → Integration.

## Phụ lục: File Manifest

**Files sẽ bị ảnh hưởng/tạo mới**:
- **Core**: `src/components/Terminal.astro`, `src/layouts/BaseLayout.astro`, `src/layouts/PostLayout.astro`, `src/styles/global.css`
- **Pages**: `src/pages/index.astro`, `src/pages/about/index.astro`, `src/pages/blog/[slug].astro`, `src/pages/ctf/[slug].astro`
- **Lib**: `src/lib/content.ts`, `src/content.config.ts`, `astro.config.mjs`
- **Components mới**: AsciiBanner, CrtOverlay, CursorTrail, SkillMatrix, Timeline...
- **Assets**: public/pgp-key.asc, shiki theme
- **Docs**: `docs/19-proposals-plan.md` (file này)

**Tổng files ~25** sẽ được chạm đến.

---
*Master Plan này được tạo bởi Architect mode. Triển khai theo thứ tự để tránh regression.*
