# Kyrux UI — Dracula Editorial / Batwing Door

Tài liệu này ghi lại logic thiết kế để bạn có thể tự chỉnh UI mà không phải đoán từng selector.

## 1. Ý tưởng cốt lõi

Trang tham chiếu tạo ấn tượng bằng bố cục poster toàn màn hình, tương phản mạnh, display type lớn và menu là một phần của hero. Kyrux giữ nhịp thị giác đó nhưng dùng một chữ ký riêng: **Batwing Door**.

- `KYRUX BLOG` và bốn route là toàn bộ thông tin cần thiết ở viewport đầu.
- Hai cánh dơi đồng thời là silhouette bao quanh cửa Dracula.
- Cửa hé sáng ở trạng thái nghỉ, mở khi hover/focus và trở thành transition giữa các trang.
- Một mảng Blood cắt chéo duy nhất tạo nền cho artwork. Không có dot grid, collage chữ, tọa độ, mã route, keyboard hint hay watermark.
- Độ “đậm” được dồn vào một motif. Những vùng còn lại ưu tiên khoảng trắng và khả năng đọc.

Nếu thêm một hiệu ứng mới, hãy hỏi trước: nó có làm Batwing Door rõ hơn không? Nếu không, thường nên bỏ.

## 2. Bảng màu

Mở `src/styles/global.css`, tìm khối `:root`:

```css
:root {
  --signal: #f12f58;       /* Blood: active, CTA, khe cửa */
  --signal-dark: #b0163d;  /* chữ đỏ trên nền sáng */
  --signal-soft: #ff7895;  /* ánh sáng trong cửa */
  --wine: #170910;         /* Night: header, cánh, transition */
  --plum: #74152e;         /* Velvet: chiều sâu và viền cánh */
  --moon-ice: #c9d5e8;     /* Moon Silver: focus/viền nhỏ */
  --paper: #fff7f2;        /* Bone: nền chính */
  --paper-raised: #fffbf8; /* card */
  --ink: #170910;          /* chữ chính */
  --ink-soft: #56424d;     /* chữ phụ */
}
```

Tỉ lệ gợi ý: Bone 60%, Night 24%, Blood 12%, Velvet 3%, Moon Silver 1%. Không nên biến Moon Silver thành mảng nền lớn; màu này chỉ nên giúp focus và đường viền sắc hơn.

## 3. Hệ chữ

- `Unbounded`: wordmark `KYRUX`, nhãn `BLOG`, logo và chữ `K`.
- `Bricolage Grotesque`: route và section heading lớn.
- `IBM Plex Sans`: nội dung đọc dài.
- `IBM Plex Mono`: metadata kỹ thuật cần thiết.

Font được tải trong `src/layouts/BaseLayout.astro`; alias nằm trong `@theme` của `global.css`. Display font chỉ dành cho cụm ngắn. Nội dung bài viết vẫn dùng sans để không đánh đổi khả năng đọc lấy phong cách.

## 4. Homepage

Markup chính nằm ở `src/pages/index.astro`:

- `.codex-hero`: poster full-bleed cao ít nhất một viewport; nội dung và artwork được chồng lớp có chủ ý.
- `.codex-copy`: wordmark, subtitle một câu và menu bốn route.
- `.home-route-menu`: link thật, không cần JavaScript điều hướng riêng.
- `.dracula-stage`: artwork đặt absolute, cắt sát mép phải như bìa poster và được ẩn khỏi accessibility tree.
- `.dracula-wing`: hai SVG hình học phẳng.
- `.dracula-doorway`: frame, glow và hai door panel dùng `rotateY`.
- `.home-feed`: nội dung CTF/blog thật nằm dưới hero.

Diamond và active plate của menu được dựng bằng pseudo-element. Mục CTF có một plate mặc định để menu không giống mục lục tĩnh; hover/focus mở plate và đồng thời mở cửa nhờ `:has()`.

Muốn thay kích thước artwork, chỉnh ba nhóm sau thay vì sửa từng phần tử con:

```css
.codex-hero { min-height: ...; padding-inline: ...; }
.dracula-stage { width: ...; right: ...; }
.dracula-doorway { width: ...; height: ...; }
```

## 5. Navbar Dracula Index

Navbar nằm trong `src/layouts/BaseLayout.astro`; style bắt đầu ở `.nav-deck` và `.site-navigation`.

- Ở trang chủ, logo và cụm công cụ tách thành hai HUD chip nổi nên không tạo cảm giác navbar truyền thống. Trang trong giữ thanh đầy đủ để đọc nội dung thuận tiện.
- Menu toàn màn hình chỉ có năm tên route: Home, CTF, Blog, Tags, About.
- Mảng Blood bên phải dùng silhouette cánh dơi hình học thay cho nav bar truyền thống.
- Route hiện tại dùng band Blood; các route khác chỉ giữ chữ Bone và diamond.
- `Escape`, phím mũi tên và focus trap vẫn hoạt động dù hint bàn phím đã được bỏ khỏi UI.
- Trên mobile, terminal được ẩn để logo, search, theme và menu vẫn có touch target rõ ràng.

Nguồn route dùng chung nằm ở `src/config/site-routes.ts`. Muốn thêm trang mới, chỉ cần thêm `{ path, label }`; homepage và overlay cùng đọc danh sách này.

## 6. Chuyển trang Batwing Door

Transition nằm ở `#route-transition` trong `BaseLayout.astro`:

1. Hai cánh dơi trượt vào và khép kín viewport.
2. Cửa Dracula xuất hiện ở tâm, đóng lại và hiện tên route đích.
3. Điều hướng document xảy ra sau `650ms`.
4. Ở trang mới, hai panel mở trước; cánh dơi rút sang hai bên và gate về `idle` sau `680ms`.

Animation full-screen chỉ thay đổi `transform` và `opacity`; `clip-path` chỉ định hình silhouette tĩnh. Trang vẫn dùng navigation document bình thường nên terminal, search, lightbox và filter được khởi tạo lại an toàn.

Khi `prefers-reduced-motion: reduce`, transition được bỏ hoàn toàn và link điều hướng ngay lập tức.

## 7. Responsive và accessibility

Breakpoint chính: `900px`, `760px`, `560px`, `380px`.

- Dưới `900px`, artwork vẫn là lớp nền tuyệt đối thay vì rơi thành một khối riêng bên dưới menu.
- Link menu có chiều cao tối thiểu khoảng 66px ở hero.
- Ở 320px không có horizontal overflow.
- Link dùng visible text làm accessible name; artwork có `aria-hidden="true"`.
- Menu overlay dùng `aria-expanded`, `aria-hidden`, `inert`, focus restore và Escape.
- Mọi animation chính đều có nhánh reduced motion.
- Paper và dim theme đều giữ đủ tương phản cho title và route.

## 8. Checklist khi tự chỉnh

1. Chỉnh token màu trước khi chỉnh từng selector.
2. Giữ viewport đầu chỉ còn tên site, subtitle, route và Batwing Door.
3. Chụp 1440px, 390px và 320px.
4. Kiểm tra hover/focus mở cửa, menu overlay và Escape.
5. Kiểm tra paper theme, dim theme và reduced motion.
6. Chạy `npm run check`, `npm run build` và `git diff --check`.

Chất riêng không đến từ số lượng hiệu ứng. Nó đến từ một motif đủ rõ và được lặp lại có kỷ luật. Ở giao diện này, motif đó là **cánh dơi khép lại thành cánh cửa của Kyrux**.
