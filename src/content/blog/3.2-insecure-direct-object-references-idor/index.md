---
title: "3.2 - Insecure direct object references (IDOR)"
date: 2026-05-14
category: "Tutorial"
series: "ACCESS CONTROL"
seriesOrder: 3
tags: []
draft: false
---

## What are insecure direct object references (IDOR)? (IDOR là gì?)

Insecure Direct Object References (IDOR) (Tham chiếu đối tượng trực tiếp không an toàn) là một loại lỗ hổng kiểm soát truy cập nảy sinh khi một ứng dụng sử dụng đầu vào do người dùng cung cấp (user-supplied input) để truy cập trực tiếp vào các đối tượng.

Thuật ngữ IDOR trở nên phổ biến nhờ sự xuất hiện của nó trong danh sách OWASP 2007 Top Ten. Tuy nhiên, nó chỉ là một ví dụ trong số nhiều sai lầm trong việc triển khai kiểm soát truy cập có thể dẫn đến việc các kiểm soát truy cập bị vượt qua (circumvented). Các lỗ hổng IDOR thường liên quan nhất đến horizontal privilege escalation (leo thang đặc quyền ngang), nhưng chúng cũng có thể nảy sinh liên quan đến vertical privilege escalation (leo thang đặc quyền dọc).

## IDOR examples (Các ví dụ về IDOR)

Có nhiều ví dụ về các lỗ hổng kiểm soát truy cập nơi các giá trị tham số do người dùng kiểm soát (user-controlled parameter values) được sử dụng để truy cập trực tiếp vào tài nguyên hoặc chức năng.

### **IDOR vulnerability with direct reference to database objects (Lỗ hổng IDOR với tham chiếu trực tiếp đến đối tượng cơ sở dữ liệu)**

Hãy xem xét một trang web sử dụng URL sau để truy cập trang tài khoản khách hàng, bằng cách truy xuất thông tin từ cơ sở dữ liệu back-end:

`https://insecure-website.com/customer_account?customer_number=132355`

Ở đây, mã số khách hàng (customer number) được sử dụng trực tiếp như một chỉ mục bản ghi (record index) trong các truy vấn được thực hiện trên cơ sở dữ liệu back-end. Nếu không có các biện pháp kiểm soát nào khác được áp dụng, một kẻ tấn công chỉ cần sửa đổi giá trị `customer_number`, vượt qua kiểm soát truy cập để xem hồ sơ của các khách hàng khác. Đây là một ví dụ về lỗ hổng IDOR dẫn đến leo thang đặc quyền ngang.

Một kẻ tấn công có thể thực hiện cả leo thang đặc quyền ngang và dọc bằng cách thay đổi người dùng thành một người có thêm đặc quyền trong khi vượt qua các kiểm soát truy cập. Các khả năng khác bao gồm khai thác việc rò rỉ mật khẩu hoặc sửa đổi các tham số sau khi kẻ tấn công đã truy cập được vào trang tài khoản của người dùng, ví dụ vậy.

### **IDOR vulnerability with direct reference to static files (Lỗ hổng IDOR với tham chiếu trực tiếp đến tệp tĩnh)**

Các lỗ hổng IDOR thường nảy sinh khi các tài nguyên nhạy cảm được đặt trong các tệp tĩnh trên hệ thống tệp phía máy chủ (server-side filesystem). Ví dụ, một trang web có thể lưu các bản ghi nội dung tin nhắn trò chuyện (chat message transcripts) vào đĩa bằng cách sử dụng tên tệp tăng dần, và cho phép người dùng truy xuất chúng bằng cách truy cập một URL như sau:

`https://insecure-website.com/static/12144.txt`

Trong tình huống này, kẻ tấn công chỉ cần sửa đổi tên tệp để truy xuất bản ghi tin nhắn được tạo bởi người dùng khác và có khả năng lấy được thông tin xác thực người dùng (user credentials) và các dữ liệu nhạy cảm khác.

Phần này rất quan trọng đối với sinh viên CNTT vì IDOR là lỗi logic phổ biến nhất mà các công cụ quét tự động (Automated Scanners) thường bỏ sót. Máy móc không thể biết liệu User A có quyền xem dữ liệu số `123` hay không, chỉ có con người (lập trình viên/pentester) mới hiểu logic đó.

Mở rộng về IDOR với tệp tĩnh (Static Files): Trường hợp này thường xảy ra khi lập trình viên xử lý tính năng "Export Hóa đơn" hoặc "Xuất báo cáo PDF".

1. Quy trình lỗi: User bấm "Xuất PDF" -> Server tạo file `invoice_100.pdf` lưu vào thư mục `/public/downloads/` -> Server trả về link cho User tải về.
2. Vấn đề: Vì thư mục `/public/` thường không yêu cầu đăng nhập (để load ảnh, css), nên bất kỳ ai đoán được tên file `invoice_101.pdf` đều tải được mà không cần xác thực.
3. Cách khắc phục: Không bao giờ lưu file nhạy cảm vào thư mục public. Hãy lưu ở thư mục kín, và dùng một script (như `download.php?file=...`) để kiểm tra quyền trước khi đọc file và stream nội dung về cho người dùng.