---
title: "5.3 - Stored XSS"
date: 2026-05-14
category: "Tutorial"
series: "Cross-Site Attacks"
seriesOrder: 5
tags: []
draft: false
---

## Stored cross-site scripting là gì?

**Stored cross-site scripting** (còn gọi là **second-order** hoặc **persistent XSS**) xảy ra khi một ứng dụng nhận data từ nguồn không tin cậy và chèn data đó vào các phản hồi HTTP sau này một cách **không an toàn**.

Giả sử một website cho phép user gửi bình luận trên bài viết blog, và bình luận đó sẽ được hiển thị cho các người dùng khác trên trang web. Người dùng gửi bình luận qua một HTTP request như sau:

```http
POST /post/comment HTTP/1.1
Host: vulnerable-website.com
Content-Length: 100

postId=3&comment=This+post+was+extremely+helpful.&name=Carlos+Montoya&email=carlos%40normal-user.net
```

Sau khi bình luận này được gửi, bất kỳ ai truy cập bài viết sẽ thấy đoạn sau xuất hiện trong phản hồi của ứng dụng:

```html
<p>This post was extremely helpful.</p>
```

Nếu ứng dụng không thực hiện bất kỳ xử lý nào trên dữ liệu này, attacker có thể gửi một mã độc hại thông qua tính năng comment như:

```html
<script>/* Bad stuff here... */</script>
```

Trong request của attacker, comment trên sẽ được **URL-encoded** như sau:

```http
comment=%3Cscript%3E%2F*%2BBad%2Bstuff%2Bhere...%2B*%2F%3C%2Fscript%3E
```

Bất kỳ người dùng nào mở bài viết giờ sẽ nhận được trong phản hồi của ứng dụng:

```html
<p><script>/* Bad stuff here... */</script></p>
```

Khi đó đoạn script do kẻ tấn công cung cấp sẽ thực thi trong trình duyệt của user nạn nhân, trong ngữ cảnh session của họ với ứng dụng.

## Tác động của cuộc tấn công stored XSS attacks

Nếu attacker có thể kiểm soát được một đoạn script được thực thi trong browser của nạn nhân, thì thường họ có thể xâm nhập hoàn toán người dùng đó. Attacker có thể thực hiện bất kỳ các hành động nào tương tự như những tác động của lỗ hỏng reflected XSS.

Về khả năng khai thác, điểm khác biệt then chốt giữa **reflected** **XSS** và **stored XSS** là **stored XSS** cho phép các cuộc tấn công **tự chứa** trong chính ứng dụng. Kẻ tấn công không cần tìm cách bên ngoài để lừa người dùng khác gửi một request chứa exploit của họ. Thay vào đó, attacker đặt exploit vào trong chính ứng dụng và đơn giản là chờ đợi người dùng truy cập tới nó.

Tính “tự chứa” này của stored XSS đặc biệt nghiêm trọng trong các tình huống mà lỗ hổng XSS chỉ ảnh hưởng tới người dùng hiện tại đã đăng nhập vào ứng dụng. Với reflected XSS, cuộc tấn công cần phải “đúng thời điểm”: nếu người dùng truy cập URL tấn công khi họ **chưa** đăng nhập thì sẽ không bị xâm phạm. Ngược lại, với stored XSS, khi người dùng gặp exploit thì họ chắc chắn đang trong phiên đăng nhập (nếu exploit được hiển thị chỉ cho người đã đăng nhập), nên khả năng bị khai thác cao hơn.

## Stored XSS trong các ngữ cảnh khác nhau

Có nhiều biến thể khác nhau của **stored XSS**. Vị trí của dữ liệu được lưu trong phản hồi của ứng dụng sẽ quyết định **kiểu payload** cần thiết để khai thác và có thể ảnh hưởng tới mức độ ảnh hưởng của lỗ hổng.

Ngoài ra, nếu ứng dụng thực hiện bất kỳ validation hoặc xử lý nào trên dữ liệu trước khi lưu, hoặc tại thời điểm dữ liệu lưu được chèn vào phản hồi, điều này thường sẽ ảnh hưởng tới kiểu payload XSS cần phải sử dụng. Ví dụ: dữ liệu bị encode, strip tag, thay thế ký tự đặc biệt, giới hạn độ dài, vv...

```javascript
<><img src=1 onerror=alert(1)>
```

## Cách tìm và kiểm tra lỗ hổng Stored XSS

Nhiều lỗ hổng **stored XSS** có thể được tìm thấy bằng web vulnerability scanner của **Burp Suite**.

Kiểm tra thủ công stored XSS có thể là một thử thách. Ta phải kiểm tra tất cả các **entry points** mà attacker có thể đưa dữ liệu vào quá trình xử lý của ứng dụng, và tất cả các exit points, nơi dữ liệu đó có thể xuất hiện trong response của ứng dụng.

### Những entry point thường gặp bao gồm:

* Tham số hoặc dữ liệu khác trong URL query string hoặc trong body của HTTP request (message body).
* Đường dẫn file trong URL.
* Các header HTTP (một số header có thể không khai thác được cho reflected XSS nhưng lại có ý nghĩa cho stored XSS).
* Bất kỳ con đường out-of-band nào mà attacker có thể dùng để đưa dữ liệu vào ứng dụng, các out-of-band này tổn tại dựa vào các chức năng được các ứng dụng triển khai, ví dụ ứng dụng webmail xử lý data nhận được từ email đến, ứng dụng marketing sẽ hiển thị post từ mạng xã hội, hay news aggregator lấy nội dung từ trang khác.

### Exit points

* Là **mọi** HTTP response trả về cho bất kỳ loại người dùng nào trong mọi ngữ cảnh — tức là bất cứ nơi nào ứng dụng có thể hiển thị dữ liệu đã lưu.

### Bước đầu: tìm liên kết giữa entry và exit points

Mục tiêu ban đầu là xác định đường đi của dữ liệu: dữ liệu gửi vào entry point nào sẽ được phát ra ở exit point nào. Việc này khó vì:

* Dữ liệu gửi vào bất kỳ entry point nào **có thể** xuất hiện ở bất kỳ exit point nào (ví dụ display name người dùng có thể xuất hiện trong một log chỉ vài admin nhìn thấy).
* Dữ liệu đã lưu có thể bị ghi đè hoặc nhanh chóng bị thay thế bởi hành động khác (ví dụ danh sách recent searches bị thay đổi khi người dùng tìm tiếp).

Cách kiểm tra “toàn diện” là submit một giá trị cụ thể tại một entry point, sau đó duyệt từng exit point để xem giá trị đó xuất hiện ở đâu — nhưng làm vậy cho mọi hoán vị sẽ không khả thi với ứng dụng lớn.

### Phương pháp thực tế hơn

* Lần lượt đi qua các **entry point** chính, gửi vào mỗi entry point một giá trị nhận dạng (marker) duy nhất.
* Giám sát các phản hồi của ứng dụng (duyệt site, kiểm tra trang, logs, thông báo, v.v.) để phát hiện nơi nào hiển thị giá trị vừa gửi.
* Tập trung ưu tiên vào các chức năng có khả năng lưu và hiển thị cho nhiều user (ví dụ phần comment, profile, forum).

Khi thấy giá trị xuất hiện trong một phản hồi, cần xác nhận xem dữ liệu **thực sự được lưu** (persistent) và xuất hiện qua các request khác nhau (stored), hay chỉ đơn giản là **reflected** trong chính phản hồi trả về ngay sau khi submit.

### Khi đã tìm được liên kết entry→exit

* Xác định **context** mà dữ liệu đã lưu xuất hiện trong response (ví dụ trong text giữa thẻ HTML, trong attribute, trong JavaScript, v.v.).
* Thử các payload XSS **ứng viên** phù hợp với context đó (tương tự như quy trình test reflected XSS).
* Nếu payload bị thay đổi hoặc chặn, thử các biến thể/chiến thuật khác theo context và kiểu validation đang có.