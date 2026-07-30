# Kyrux UI — Moonlit Parchment / Batwing Door

Tài liệu này ghi lại logic thiết kế để bạn có thể tự chỉnh UI mà không phải đoán từng selector.

## 1. Ý tưởng cốt lõi

Trang tham chiếu tạo ấn tượng bằng bố cục poster toàn màn hình, tương phản mạnh, display type lớn và menu là một phần của hero. Kyrux giữ nhịp thị giác đó nhưng dùng một chữ ký riêng: **Batwing Door trên nền giấy trăng**.

- `KYRUX BLOG` và bốn route là toàn bộ thông tin cần thiết ở viewport đầu.
- Hai cánh dơi đồng thời là silhouette bao quanh cửa Dracula.
- Cửa hé sáng ở trạng thái nghỉ, mở khi hover/focus và trở thành transition giữa các trang.
- Một mảng hồng nguyệt hai sắc độ và một mặt trăng tĩnh tạo eclipse sau artwork. Không có sao, particle, collage chữ, tọa độ, mã route, keyboard hint hay watermark.
- Độ “đậm” được dồn vào một motif. Những vùng còn lại ưu tiên khoảng trắng và khả năng đọc.

Nếu thêm một hiệu ứng mới, hãy hỏi trước: nó có làm Batwing Door rõ hơn không? Nếu không, thường nên bỏ.

## 2. Bảng màu

Mở `src/styles/global.css`, tìm khối `:root`:

```css
:root {
  --signal: #e85275;       /* Rose Signal: active, CTA, khe cửa */
  --signal-dark: #a50f3c;  /* chữ đỏ đạt tương phản trên nền sáng */
  --signal-soft: #f2789a;  /* ánh sáng trong cửa */
  --night: #2a1220;        /* dùng có giới hạn trong silhouette */
  --night-raised: #3a1a2b; /* chiều sâu của cửa */
  --wine: #3b1026;         /* cánh, cửa và chữ display */
  --plum: #722648;         /* Velvet: chiều sâu và viền cánh */
  --moon-ice: #dce7f4;     /* Moon Silver: mặt trăng/focus */
  --paper: #f3edf2;        /* nền tím-trắng dịu */
  --paper-raised: #fff9fc; /* card và HUD chip */
  --ink: #24111c;          /* chữ chính */
  --ink-soft: #634858;     /* chữ phụ */
}
```

`Moonlit Parchment` là theme mặc định: Paper chiếm phần lớn, Rose Signal là mảng cắt phải, còn Wine/Night chỉ được “chi tiêu” cho cánh và cửa Dracula. Vì vậy giao diện vẫn ma mị nhưng không tối nặng. Nút mặt trăng chuyển sang `dim`; khối `html[data-theme="dim"]` khai báo lại đầy đủ token để hai palette không rò màu sang nhau.

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
- `.codex-hero::after`: mặt trăng tĩnh; chính silhouette cánh dơi tạo hình nguyệt thực.
- `.dracula-stage::after`: quầng `blood breath` duy nhất, chỉ animate opacity và transform.
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

- Ở trang chủ, logo và cụm công cụ tách thành hai HUD chip nổi nên không tạo cảm giác navbar truyền thống.
- Trên desktop của trang trong, `.site-header[data-page="inner"] .nav-deck` tách thành hai chốt HUD như homepage: logo neo trái, Search/theme/terminal/Menu neo phải và vùng giữa hoàn toàn thoáng.
- Trên mobile, navbar quay về toàn chiều rộng để ba nút điều khiển luôn có touch target tối thiểu `44px` và không gây tràn ngang.
- Menu toàn màn hình chỉ có năm tên route: Home, CTF, Blog, Tags, About.
- Mảng Blood bên phải dùng silhouette cánh dơi hình học thay cho nav bar truyền thống.
- Route hiện tại dùng band Rose Signal; các route khác giữ chữ Wine và diamond.
- `Escape`, phím mũi tên và focus trap vẫn hoạt động dù hint bàn phím đã được bỏ khỏi UI.
- Trên mobile, terminal được ẩn để logo, search, theme và menu vẫn có touch target rõ ràng.

Nguồn route dùng chung nằm ở `src/config/site-routes.ts`. Muốn thêm trang mới, chỉ cần thêm `{ path, label }`; homepage và overlay cùng đọc danh sách này.

## 6. Trang trong — Nocturne Archive

Các trang Blog, CTF, Tags, Search và những trang con dùng chung một hệ “hồ sơ trong lâu đài”, thay vì trở về card UI mặc định:

- `.inner-page-hero`: masthead giấy Bone có góc gấp, vòng nguyệt thực và bóng cửa Dracula rất nhạt.
- `.archive-series`: bìa series Blog có gáy Night, dấu đếm chapter và góc niêm phong Blood.
- `.archive-chapter`: mỗi bài là một hàng tối thiểu `44px`, có số hồ sơ và vạch Blood khi hover/focus.
- `.archive-entry`, `.archive-quicklink`, `.tag-vault`, `.about-identity`: lặp lại gáy hồ sơ, đường cắt và hard shadow trên các trang khác để giữ cùng một chất liệu thị giác.
- `.glass-content`: bài viết dài vẫn dùng nền Paper dễ đọc, chỉ thêm một mép Blood và hard shadow làm dấu nhận diện.

`BaseLayout.astro` chỉ render một `.inner-bat-field` ở trang trong. Cụm gồm đúng ba silhouette dơi, cùng di chuyển bằng một wrapper trong hai lượt rồi dừng; nó pause khi menu hoặc transition mở. Hiệu ứng bị ẩn trên mobile, thiết bị coarse pointer, chế độ in và `prefers-reduced-motion`, vì vậy đây là một điểm nhấn chứ không phải mưa particle phủ nội dung.

### Kinetic Dracula

Nhịp chuyển động học từ portfolio tham chiếu nhưng được đổi sang vật liệu của Kyrux:

- Script cuối `BaseLayout.astro` chia tiêu đề và route thành `.kinetic-char`. Chỉ tối đa hai glyph được đóng dấu Night/Blood; accessible name vẫn nằm trên heading hoặc link gốc.
- Logo, cụm công cụ và Menu vào từ hai mép theo ba nhịp; route homepage vào lệch nhau `60ms`.
- Card trang trong chỉ bị ẩn sau khi JavaScript gắn `.kinetic-pending`; một `IntersectionObserver` reveal tối đa sáu nhịp rồi gỡ class để hover không tranh chấp transform.
- Parallax chỉ chạy với `(hover: hover) and (pointer: fine)`, dùng một `requestAnimationFrame`, biên độ tối đa `8px × 6px` và reset khi mở menu, chuyển route, rời vùng hoặc ẩn tab.
- `.route-transition-flock` là sáu silhouette dơi nhỏ bay vào tâm giữa cánh và cửa. Opacity đỉnh chỉ `0.34`; mobile giữ ba con để không che nội dung.

Trong reduced-motion, glyph, HUD, card, parallax và đàn dơi đều trở về trạng thái tĩnh; nội dung không phụ thuộc animation để xuất hiện.

## 7. Chuyển trang Batwing Door

Transition nằm ở `#route-transition` trong `BaseLayout.astro`:

1. Hai cánh dơi tối trượt vào; một đàn dơi nhỏ hội tụ về cửa.
2. Cửa Dracula wine/plum xuất hiện ở tâm, đóng lại và hiện tên route đích bằng ánh trăng mờ.
3. Điều hướng document xảy ra sau `650ms`.
4. Ở trang mới, transition chỉ chạy nếu có cờ điều hướng nội bộ; cửa mở, đàn dơi tản ra và gate về `idle` sau `600ms`. Reload trực tiếp không phát lại transition.

Animation full-screen chỉ thay đổi `transform` và `opacity`; `clip-path` chỉ định hình silhouette tĩnh. Trang vẫn dùng navigation document bình thường nên terminal, search, lightbox và filter được khởi tạo lại an toàn.

Sau khi transition về `idle`, quầng sáng sau cửa thở chậm theo chu kỳ `6.4s`. Quầng này pause trong lúc gate đang entering/leaving để không có hai chuyển động lớn cạnh tranh nhau.

Âm thanh tương tác được tổng hợp bằng Web Audio, mặc định bật ở âm lượng thấp và chỉ phát sau click. `SoundToggle` cho phép tắt/bật, lưu lựa chọn trong `localStorage`; route dùng chuỗi flutter → bản lề → then cửa trước mốc `650ms`. Điều hướng document không tự phát âm ở trang mới để tôn trọng autoplay policy.

Khi `prefers-reduced-motion: reduce`, transition được bỏ hoàn toàn và link điều hướng ngay lập tức. Âm thanh có công tắc độc lập vì giảm chuyển động không đồng nghĩa với tắt tiếng.

## 8. Responsive và accessibility

Breakpoint chính: `900px`, `760px`, `560px`, `380px`.

- Dưới `900px`, artwork vẫn là lớp nền tuyệt đối thay vì rơi thành một khối riêng bên dưới menu.
- Link menu có chiều cao tối thiểu khoảng 66px ở hero.
- Ở 320px không có horizontal overflow.
- Link dùng visible text làm accessible name; artwork có `aria-hidden="true"`.
- Menu overlay dùng `aria-expanded`, `aria-hidden`, `inert`, focus restore và Escape.
- Mọi animation chính đều có nhánh reduced motion.
- Moonlit Parchment và dim theme đều giữ đủ tương phản cho title và route.
- Dơi trang trí có `aria-hidden="true"`, không nhận pointer event và không xuất hiện trên mobile.

## 9. Checklist khi tự chỉnh

1. Chỉnh token màu trước khi chỉnh từng selector.
2. Giữ viewport đầu chỉ còn tên site, subtitle, route và Batwing Door.
3. Chụp 1440px, 390px và 320px.
4. Kiểm tra hover/focus mở cửa, menu overlay và Escape.
5. Kiểm tra Moonlit Parchment, dim theme và reduced motion.
6. Chạy `npm run check`, `npm run build` và `git diff --check`.

Chất riêng không đến từ số lượng hiệu ứng. Nó đến từ một motif đủ rõ và được lặp lại có kỷ luật. Ở giao diện này, motif đó là **cánh dơi khép lại thành cánh cửa của Kyrux**.
