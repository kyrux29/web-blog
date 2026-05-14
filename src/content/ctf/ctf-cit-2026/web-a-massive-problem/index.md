---
title: "A Massive Problem"
date: 2026-05-14
platform: "CTF@CIT 2026"
category: "Web"
difficulty: "Hidden"
tags: ["web", "ctf-cit-2026"]
series: "CTF@CIT 2026"
draft: false
---

# A Massive Problem
## Challenge Information
- **Category**: Web Exploitation
- **Event**: CTF@CIT 2026
- **Author**: 10splayaSec
- **Difficulty**: Hidden
- **Tags**: #web #mass_assignment
---
## 1. Description
>Improper Authorization has been fixed! I think we are ready for production!
## 2. Overview
Một bài mở đầu đơn giản
## 3. Source Code Analysis
Mình sẽ giải nghiệm giao diện web trước, ngay trang đầu tiên là một form login / register trông khá đẹp mắt:

![](./images/Pasted%20image%2020260423233157.png)

Vì mình cũng khá lười nên mình sẽ đọc source code luôn để hiểu rõ hơn về các chức năng =)), cấu trúc mục chỉ gồm một file python chính:

![](./images/Pasted%20image%2020260423230401.png)

Bài này thì FLAG nằm ở trang `/admin`:

![](./images/Pasted%20image%2020260423234002.png)

-> Hướng đi mình nghĩ ngay đến là sẽ là tìm cách leo quyền admin.

Kiểm tra file `app.py` thì dễ dàng nhận ra ở endpoint `/api/register` dính một lỗi khá nguy hiểm:

![](./images/Pasted%20image%2020260423230508.png)

Ở đây mặc dù dev đã cẩn thận khi hardcode luôn phần `role` là `standard` nhưng lại sử dụng hàm `update()` để tiếp tục update `recode`. 

Khi ta dùng hàm `update()` với một dictionary (`incoming`) lấy trực tiếp từ request, cũng có nghĩa là ta đang cho phép user ghi đè lên bất kỳ key nào có trong object `record`.

-> Nếu gửi một request dạng json chứa trường `"role" = "admin"` vào thì hàm `update()` sẽ ghi đè trực tiếp lên trường `role` cũ luôn. Chỉ cần gửi request chuẩn là xong bài rồi =)).
## 4. Exploitation
Sử dụng Burp Suite để lấy request sau đó thêm trường `role` là xong (password nhớ đúng format):

![](./images/Pasted%20image%2020260423233518.png)

-> Đến đây thì mình đã đăng ký thành công account với role admin, thử đăng nhập xem sao:

![](./images/Pasted%20image%2020260423233716.png)

Đã có quyền admin, vào và lấy flag thôi hẹ hẹ

![](./images/Pasted%20image%2020260423233744.png)

>h@ppy h@ck!n9 
>*(BKSEC)*