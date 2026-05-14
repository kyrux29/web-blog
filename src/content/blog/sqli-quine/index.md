---
title: "SQLi Quine"
date: 2026-05-14
category: "Tutorial"
series: "Các kỹ thuật đặc biệt"
seriesOrder: 9
tags: []
draft: false
---

### 1. Quine là gì? Bức tranh tự vẽ chính nó

Trong lập trình, Quine là một chương trình máy tính không nhận bất kỳ đầu vào (input) nào, nhưng khi thực thi, nó lại in ra kết quả (output) chính là mã nguồn của nó.

Hãy tưởng tượng bạn chế tạo ra một cỗ máy in 3D. Điều kỳ diệu là, sản phẩm duy nhất mà cỗ máy này in ra lại chính là... một cỗ máy in 3D y hệt nó. Đó chính là Quine.

#### Nghịch lý của sự tự tham chiếu (Self-reference)

Thoạt nhìn, việc này có vẻ đơn giản. Tại sao không dùng lệnh in chuỗi bình thường? Nếu bạn viết: `print("print(...)")`, bạn sẽ nhận ra mình rơi vào một vòng lặp vô tận. Để in ra cái vỏ, bạn cần nhét cái vỏ vào cái ruột, rồi lại phải nhét một cái vỏ khác vào cái ruột của cái ruột... Ngoài ra, bạn sẽ ngay lập tức đối mặt với "địa ngục dấu nháy" (Quote Swallowing) — khi hệ thống xử lý chuỗi sẽ tự động xóa bỏ các dấu nháy bao quanh, làm hỏng hoàn toàn cú pháp khi in ra.

Vậy làm sao để thoát khỏi vòng lặp này?

### 2. Giải mã phép thuật: Sự lưỡng tính của Code và Data

Để tạo ra Quine, chúng ta chia chương trình làm 2 phần:

1. Code (Khung sườn): Chứa các lệnh thực thi và một "lỗ hổng" (placeholder).
2. Data (Dữ liệu): Là bản sao chép chính xác của Khung sườn dưới dạng văn bản.

Trong SQL, công cụ hoàn hảo để thực hiện việc này là hàm `REPLACE()`.

Hãy xem xét cơ chế lõi của một SQL Quine thường thấy trong MySQL:

SQL

```
REPLACE(
    'Bản_Mẫu_Chứa_Ký_Tự_$$', 
    '$$', 
    Bản_Mã_Hóa_Của_Bản_Mẫu
)
```

Bí mật nằm ở mã HEX (`0x...`) Để tránh việc SQL "nuốt" mất dấu nháy hay báo lỗi cú pháp do lồng chuỗi, các hacker sử dụng hệ thập lục phân (Hex). Khi bạn dùng hàm `HEX()`, toàn bộ câu lệnh SQL văn bản được biến thành một dãy số. Dãy số này cực kỳ an toàn, không chứa dấu nháy, và có thể nhét vào bất cứ đâu. Khi SQL chạy hàm `REPLACE`, nó sẽ tự động chèn dãy số đó vào vị trí `$$`, tạo ra một bản sao hoàn hảo của chính câu lệnh vừa được gửi đi.

### 3. Quine trong thực chiến: Vũ khí tối thượng trong CTF

Tại sao những người chơi CTF lại tốn công viết Quine làm gì? Chẳng lẽ chỉ để "khoe trình"?

Thực tế, Quine thường được kết hợp với các lỗ hổng khác như SSTI (Server-Side Template Injection) để tạo ra các cuộc tấn công Second-Order SQL Injection cực kỳ dai dẳng.

Hãy xem xét một Payload kinh điển:

SQL

```
) UNION SELECT '{{7*7}}', REPLACE(0x2920...[Khung_Sườn_Hex]..., 0x2424, CONCAT(0x3078, HEX($$)))#
```

#### Luồng tấn công diễn ra như sau:

* Bước 1: Vượt rào Database: Payload được tiêm vào cơ sở dữ liệu. Hàm `REPLACE` hoạt động (như đã giải thích ở trên) giúp câu lệnh tự tái tạo lại chính nó. Database trả về kết quả gồm 2 phần: chuỗi thử nghiệm `{{7*7}}` và toàn bộ mã độc gốc.
* Bước 2: Gài bẫy ứng dụng Web: Database lưu lại kết quả này (ví dụ: vào bảng Lịch sử hoạt động). Nhờ tính chất của Quine, đoạn mã độc không bị biến dạng khi lưu trữ.
* Bước 3: Kích hoạt SSTI: Khi quản trị viên mở trang Lịch sử hoạt động, Web Server (sử dụng Jinja2/Python) sẽ lấy dữ liệu ra hiển thị. Nó nhìn thấy `{{7*7}}`, lập tức thực thi phép tính và in ra số `49`.
* Bước 4: Chiếm quyền: Khi hacker thấy số 49 xuất hiện, họ biết mình đã thành công. Họ chỉ việc thay `{{7*7}}` bằng một lệnh RCE (như `os.popen('/readflag')`) để đọc dữ liệu hệ thống, và nhờ Quine, đoạn mã độc này sẽ nằm lỳ trong database, liên tục tự nhân bản và thực thi mỗi khi được gọi ra.

### Tổng kết

SQL Quine không chỉ là một thủ thuật vui vẻ. Nó là minh chứng cho thấy khi hiểu sâu về cách hệ thống xử lý dữ liệu và văn bản, kẻ tấn công có thể biến chính các hàm có sẵn (như `REPLACE`, `HEX`) thành công cụ để duy trì (persistence) và ngụy trang mã độc.

Hiểu về Quine giúp các nhà phát triển và chuyên gia bảo mật nhận thức rõ hơn về rủi ro của việc tin tưởng dữ liệu đầu vào, đặc biệt là trong các kiến trúc hệ thống phức tạp nơi dữ liệu được chuyển qua lại giữa nhiều tầng (Database -> Backend -> Template Engine).