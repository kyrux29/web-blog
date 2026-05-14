---
title: "5.1 - Cross-site scripting (XSS)"
date: 2026-05-14
category: "Tutorial"
series: "Cross-Site Attacks"
seriesOrder: 5
tags: []
draft: false
---

Trong phần này, ta sẽ tìm hiểu cross-site scripting là gì, mô tả các dạng khác nhau của lỗ hổng **cross-site scripting**, và trình bày cách **tìm** và **ngăn chặn** cross-site scripting.

## Cross-site scripting (XSS) là gì? <a href="#what-is-cross-site-scripting-xss" id="what-is-cross-site-scripting-xss"></a>

**Cross-site scripting** (còn gọi là **XSS**) là một lỗ hổng bảo mật web cho phép kẻ tấn công xâm phạm các tương tác mà người dùng có với một ứng dụng có lỗ hỏng. Nó cho phép kẻ tấn công **lờ đi** chính sách cùng nguồn (**same-origin policy**), chính sách này được thiết kế để tách biệt các trang web khác nhau với nhau. Lỗ hổng XSS thường cho phép kẻ tấn công giả danh (masquerade) thành user là nạn nhân bị nhắm đến, thực hiện bất kỳ hành động nào mà user này có thể làm, và truy cập bất kỳ dữ liệu nào của user. Nếu user nạn nhân có quyền đặc biệt trong ứng dụng, kẻ tấn công có thể chiếm toàn bộ quyền điều khiển mọi chức năng và dữ liệu của ứng dụng.

## XSS hoạt động như thế nào?

Cross-site scripting hoạt động bằng cách thao túng một trang web dễ bị tấn công để trang đó trả về **JavaScript độc hại** cho người dùng. Khi mã độc này chạy trong trình duyệt của nạn nhân, kẻ tấn công có thể hoàn toàn xâm phạm (compromise) tương tác của họ với ứng dụng.

## XSS proof of concept (PoC)

### PoC là gì?

**PoC** là viết tắt của **Proof of Concept** — bằng chứng khái niệm.

Ngắn gọn: PoC là một minh hoạ (thường là một đoạn mã hoặc một chuỗi thao tác) chứng tỏ một ý tưởng hoặc một lỗ hổng thực sự có thể được khai thác. Trong an ninh ứng dụng, PoC thường dùng để **xác nhận** rằng một vulnerability tồn tại (ví dụ: một payload XSS hiển thị `alert()` hoặc một payload SQLi khiến ứng dụng trả về kết quả bất thường).

Một vài điểm cần biết:

* Mục đích chính: **chứng minh** lỗ hổng tồn tại — không nhất thiết phải là một exploit hoàn chỉnh hay gây hại.
* PoC thường **ngắn, đơn giản, dễ tái tạo** để người phát hiện (hoặc nhóm bảo mật) có thể reproduce và fix.
* Không giống exploit hoàn thiện: một exploit có thể bao gồm các bước tiếp theo để chiếm quyền, duy trì truy cập hoặc exfiltrate dữ liệu — PoC chỉ cần chứng minh khả năng.
* Về đạo đức: khi tạo/chia sẻ PoC, hãy tuân thủ chính sách **responsible disclosure** — không công bố PoC công khai trước khi vendor/owner đã có thời gian vá lỗi, trừ khi bạn làm trong lab.

Ví dụ minh hoạ (ý nghĩa, không khuyến khích chèn vào hệ thống thật):

* XSS PoC đơn giản: `"><script>alert(1)</script>` — nếu chạy trong trình duyệt nạn nhân, chứng tỏ XSS.
* SQLi PoC đơn giản: dùng `' OR '1'='1` để chứng minh bỏ qua kiểm tra xác thực.

### PoC XSS

Ta có thể xác nhận phần lớn các dạng lỗ hỏng XSS bằng cách tiêm một payload khiến trình duyệt thực thi một đoạn mã JavaScript tùy ý. Từ lâu, việc sử dụng hàm `alert()` để làm điều này rất phổ biến bởi vì nó ngắn, vô hại và rất khó bỏ lỡ khi nó được gọi thành công.

Tuy nhiên, có một điểm cần lưu ý nếu dùng **Chrome**. Từ phiên bản **92** trở đi (20 July 2021), **iframe cross-origin** bị ngăn không cho gọi `alert()`. Vì các iframe cross-origin được dùng trong một số kiểu tấn công XSS nâng cao, đôi khi ta sẽ cần payload PoC thay thế. Trong trường hợp này, dùng `print()` sẽ hiệu quả hơn.

## Các kiểu tấn công XSS

Ba kiểu tấn công XSS chính:

* **Reflected XSS** (XSS phản chiếu): mã độc được gửi trong cùng **HTTP request** (ví dụ qua query string hoặc form) và ngay lập tức được trả về trong phản hồi, khiến cho trình duyệt của nạn nhân thực thi mã độc đó.\
  Ví dụ ngắn: `?q=<script>alert(1)</script>` → nếu trang echo tham số `q` mà không escape thì sẽ chạy script.
* **Stored XSS** (XSS lưu trữ): mã độc được lưu trong database của website (ví dụ trong bài viết, comment, profile) và được phục vụ lại (thực thi mã độc) cho nhiều nạn nhân khi họ xem nội dung đó.\
  Ví dụ ngắn: attacker post comment chứa `<script>…</script>` → mọi người xem trang sẽ chạy script.
* **DOM-based XSS** (XSS dựa trên DOM): lỗ hổng nằm ở **client-side code** (JavaScript chạy trên trình duyệt), chứ không phải do server trả về nội dung độc hại trực tiếp. Script độc hại được tạo/biến đổi hoàn toàn trên DOM ở phía client.\
  Ví dụ ngắn: `document.write(location.hash)` mà không sanitize thì attacker có thể đưa payload trong fragment (`#<script>…</script>`).