---
title: "Broken Website"
date: 2026-05-14
platform: "TAMUCTF"
category: "Web"
difficulty: "Hidden"
tags: ["web", "tamuctf"]
series: "TAMUCTF 2026"
draft: false
---

# bad-apple
## Challenge Information
- **Category**: Web Exploitation
- **Event**: TAMUCTF 2026
- **Author**: cobra
- **Difficulty**: Hidden
- **Tags**: #UDP #http3
---
## 1. Description
>My fancy new website is broken. Can you figure out what is wrong?
## 2. Overview
Một kiến thức mới về HTTP/3.0
## 3. Reconnaissance
Bài này khi bật lên bằng browser bình thường sẽ luôn trong trạng thái loading và không thể truy cập được =))

![](./images/Pasted%20image%2020260328221932.png)

Ta sẽ thử dùng curl để test nhanh:

![](./images/Pasted%20image%2020260328223123.png)

DNS vẫn phân giải được tên miền mapping đến IP nhưng tại sao lại không truy cập được, server bị drop liên tục chứ không trả về lỗi hoàn toàn -> Trình duyệt bị treo ở trạng thái chờ server phản hồi.

-> Sau một hỏi research thì mình có biết đến ngoài dùng TCP thì trang web có thể chạy trên nền tảng UDP, rất có thể server đang cấu hình ẩn để chỉ dùng cho giao thức **HTTP/3**
## 4. Exploitation
Dùng curl với http3: `curl -s --http3 -k https://broken-website.tamuctf.cybr.club/`

![](./images/Pasted%20image%2020260328225649.png)

>h@ppy h@ck!n9 
>*(BKSEC)*