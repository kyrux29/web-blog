---
title: "5.2 - Reflected XSS"
date: 2026-05-14
category: "Tutorial"
series: "Cross-Site Attacks"
seriesOrder: 5
tags: []
draft: false
---

## Reflected cross-site scripting là gì?

**Reflected XSS** xảy ra khi một ứng dụng nhận dữ liệu từ một **HTTP request** và chèn ngay dữ liệu đó vào phản hồi mà không có bất kỳ xử lý an toàn nào.

Giả sử một website có chức năng tìm kiếm nhận giá trị tìm kiếm do người dùng cung cấp qua tham số trong URL:

```http
https://insecure-website.com/search?term=gift
```

Ứng dụng echo (in lại) tham số tìm kiếm vào trong phản hồi:

```html
<p>You searched for: gift</p>
```

Giả sử ứng dụng không thực hiện thêm bất kỳ quá trình sử lý dữ liệu nào, attacker có thể xây dựng một URL tấn công kiểu:

```http
https://insecure-website.com/search?term=<script>/*+Bad+stuff+here...+*/</script>
```

URL này sẽ tạo ra phản hồi như sau:

```html
<p>You searched for: <script>/* Bad stuff here... */</script></p>
```

Nếu một user khác của ứng dụng truy cập URL do kẻ tấn công tạo, thì script được thêm vào bởi attacker sẽ được thực thi trong trình duyệt của user nạn nhân, trong ngữ cảnh session của họ với ứng dụng. Khi đó script có thể thực hiện bất kỳ hành động nào và truy xuất mọi dữ liệu mà người dùng đó có quyền truy cập.

## Tác động của reflected XSS attacks

Nếu attacker có thể kiểm soát một đoạn script được thực thi trong trình duyệt của victim, thì họ thường có khả năng xâm phạm hoàn toàn người dùng đó. Cụ thể, kẻ tấn công có thể:

* Thực hiện bất kỳ hành động nào trong ứng dụng mà user đó có thể thực hiện.
* Xem bất kỳ thông tin nào mà user đó có thể xem.
* Sửa đổi mọi thông tin mà người dùng đó có thể sửa đổi.
* Khởi tạo tương tác với các user khác của ứng dụng, bao gồm các cuộc tấn công tinh vi và những tương tác này sẽ trông như xuất phát từ user nạn nhân ban đầu.

Có nhiều cách để kẻ tấn công khiến nạn nhân gửi một request do họ kiểm soát, từ đó thực hiện reflected XSS. Ví dụ: đặt link tấn công trên một website do kẻ tấn công quản lý, tận dụng một trang web cho phép tạo nội dung, hoặc gửi link qua email, tweet hoặc tin nhắn. Cuộc tấn công có thể nhắm mục tiêu trực tiếp tới một user cụ thể hoặc tấn công đại trà mọi người dùng của ứng dụng.

Vì reflected XSS cần một cơ chế **giao hàng bên ngoài** (external delivery) để lừa nạn nhân truy cập URL do kẻ tấn công tạo, nên mức độ tác động của reflected XSS thường **ít nghiêm trọng hơn** so với **stored XSS**, nơi một cuộc tấn công hoàn toàn có thể được lưu trữ và phân phối ngay trong chính ứng dụng dễ bị tổn thương.

## Reflected XSS trong các ngữ cảnh khác nhau <a href="#reflected-xss-in-different-contexts" id="reflected-xss-in-different-contexts"></a>

Có rất nhiều biến thể khác nhau của reflected cross-site scripting. Vị trí của dữ liệu bị phản chiếu (reflected) trong phản hồi của ứng dụng sẽ quyết định **kiểu payload** cần thiết để khai thác và có thể ảnh hưởng tới mức độ nguy hại của lỗ hổng.

Ngoài ra, nếu ứng dụng thực hiện bất kỳ một validation hoặc xử lý nào đó trên dữ liệu gửi lên trước khi phản chiếu thì thường sẽ ảnh hưởng tới loại payload XSS phải sử dụng để khai thác.

## Làm thế nào để tìm thấy và kiểm tra lỗ hỏng reflected XSS

Đa số các lỗ hỏng reflected cross-site scripting có thể được phát hiện nhanh và đáng tin cậy bằng cách sử dụng Burp Suite

Nếu muốn kiểm tra thủ công thì thường sẽ theo những bước sau:

* **Kiểm tra mọi entry point.**\
  Thử riêng từng entry point nhập liệu trong HTTP request của ứng dụng, bao gồm tham số hay các dữ liệu khác trong URL query string và body của message, đường dẫn URL (file path). Cũng bao gồm kiểm tra các header HTTP, tuy nhiên một số hành vi giống XSS chỉ có thể được trigger thông qua các HTTP header có thể không khai thác được trong thực tế.
* **Gửi giá trị dạng chữ số ngẫu nhiên.**\
  Với mỗi entry point, gửi một giá trị ngẫu nhiên duy nhất và determine xem giá trị đó có được reflected trong response hay không. Giá trị này nên được thiết kế để đủ “sống sót" qua hầu hết các input validation, vì vậy cần phải khá ngắn và chỉ gồm các ký tự alphanumeric, nhưng nó cũng phải đủ dài để hạn chế khả năng trùng khi sinh ngẫu nhiên (khoảng 8 ký tự là hợp lý). Ta có thể dùng **Burp Intruder** để sinh payload hex ngẫu nhiên và dùng chức năng grep của Intruder để tự động đánh dấu các response chứa giá trị được gửi đi.
* **Xác định context của reflection.**\
  Với mỗi vị trí trong response nơi thấy giá trị random reflected, xác định context hiển thị giữa thẻ HTML (text), trong attribute của thẻ (xem có có dấu nháy hay không), trong chuỗi JavaScript, vv. Context mà ta xác định sẽ quyết định loại payload XSS mà ta cần thử.
* **Thử payload ứng cử viên (candidate payload).**\
  Dựa trên context của reflection, thử một payload XSS khởi đầu mà sẽ kích hoạt JavaScript nếu nó bị phản chiếu nguyên vẹn chưa bị sửa đổi trong response. Cách đơn giản nhất để test payload là gửi request tới **Burp Repeater**, chỉnh sửa request để chèn các payload ứng cử viên, gửi và kiểm tra response nếu thấy payload hoạt động. Một mẹo nhanh là giữ nguyên giá trị ngẫu nhiên ban đầu trong request và chèn payload vào trước hoặc sau giá trị đó, rồi dùng chức năng tìm (search) trong response của Burp Repeater để nhanh chóng đánh dấu vị trí reflection.
* **Thử các payload thay thế.**\
  Nếu payload ứng viên bị thay đổi hoặc chặn bởi ứng dụng, thử các payload và kỹ thuật khác phù hợp dựa trên context reflection và loại validation đang áp dụng. (Xem thêm về các XSS contexts để chọn payload phù hợp).
* **Thử nghiệm tấn công trong trình duyệt.**\
  Cuối cùng, nếu payload có vẻ hoạt động trong Burp Repeater, chuyển cuộc tấn công sang **trình duyệt thật,** dán URL vào thanh địa chỉ hoặc chỉnh request trong Burp Proxy và cho trình duyệt thực hiện và kiểm tra xem JavaScript đã thực sự chạy chưa, ví dụ dùng `alert(document.domain)` hoặc `print()` (vì Chrome chặn `alert()` trong một số iframe cross-origin) để nhận popup dễ nhìn thấy khi attack thành công.