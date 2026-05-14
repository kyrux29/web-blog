---
title: "Debug Disaster"
date: 2026-05-14
platform: "CTF@CIT 2026"
category: "Web"
difficulty: "Hidden"
tags: ["web", "ctf-cit-2026"]
series: "CTF@CIT 2026"
draft: false
---

# ## Debug Disaster
## Challenge Information
- **Category**: Web Exploitation
- **Event**: CTF@CIT 2026
- **Author**: 10splayaSec
- **Difficulty**: Hidden
- **Tags**: #web
---
## 1. Description
>Developing this application is tough, and I needed debug mode to be enabled... but I'm nervous I forgot to turn it off in production. I also think I may have forgot to remove something from the application structure.
## 2. Overview
Một bài blackbox nhưng cũng đơn giản =))
## 3. Reconnaissance
Giao diện trông khá đơn giản và cũng không có chức năng gì:

![](./images/Pasted%20image%2020260423234323.png)

Check source code client side thì cũng không có gì:

![](./images/Pasted%20image%2020260423234356.png)

Thử `/robots.txt`:

![](./images/Pasted%20image%2020260423235258.png)

Check request / response:

![](./images/Pasted%20image%2020260423234815.png)

Mặc dù không có gì nhiều nhưng dựa vào các dấu hiệu của header `Server` và cổng `5002` phần nào ta cũng đoán ra được framework trang web dùng là Flask (thường chạy cổng 5xxx và sử dụng werkzeug).

Và dựa vào hint `Developing this application is tough, and I needed debug mode to be enabled... but I'm nervous I forgot to turn it off in production.` thì mình nghĩ ta sẽ tìm một giao diện debug nào đó của web.
## 4. Exploitation

Thử `/admin` quen thuộc:

![](./images/Pasted%20image%2020260423235124.png)

Gây lỗi nhưng server lại trả về một thông báo lỗi chuẩn Flask và còn lộ cả source code =)))

![](./images/Pasted%20image%2020260423235959.png)

Có thể đọc được `.env` ở `/flg_bar` mà không có bất kỳ ràng buộc nào:

![](./images/Pasted%20image%2020260424000102.png)

>h@ppy h@ck!n9 
>*(BKSEC)*