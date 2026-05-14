---
title: "Spookifier"
date: 2026-05-14
platform: "HackTheBox"
category: "Web"
difficulty: "Medium"
tags: ["web", "hackthebox"]
series: "HackTheBox"
draft: false
---

# TornadoService
## Challenge Information
- **Category**: Web Exploitation
- **Event**: none
- **Author**: leanthedev
- **Difficulty**: Medium
- **URL**: https://app.hackthebox.com/challenges/TornadoService
- **Tags**: #web #XSS 
---
## 1. Description
>There's a new trend of an application that generates a spooky name for you. Users of that application later discovered that their real names were also magically changed, causing havoc in their life. Could you help bring down this application?
## 2. Overview
Vì đây là một web challenge nên mình sẽ trải nghiệm giao diện và các chức năng của web trước:

![](./images/Pasted%20image%2020260427204917.png)

Nhìn chung trang web có chức năng chuyển những đoạn text ta nhập vào thành các font khác nhau:

![](./images/Pasted%20image%2020260427205041.png)

## 3. Source Code Analysis
Vì đây là bài whitebox nên ta mở source để hiểu rõ hơn về các chức năng của web, source map như sau:

![](./images/Pasted%20image%2020260427205325.png)

Mục tiêu FLAG của chúng ta nằm ở `/flag.txt`, mình sẽ đọc `Ctrl + Shift + F` để xem có hàm hay chức năng nào gọi được FLAG ra không, kết quả thì FLAG chỉ nằm bên ngoài thư mục web và không có chức năng nào để đọc bên trong ứng dụng:

![](./images/Pasted%20image%2020260427205646.png)

-> Ta có thể nghĩ đến việc RCE để đọc file `flag.txt`.

Check file `Dockerfile` thì mình thấy một vài tech stack như sau:

![](./images/Pasted%20image%2020260427210017.png)

Check `route.py` thì có thể thấy ứng dụng chỉ có một route duy nhất với chức năng chuyển đổi text đầu vào sau đó hiển thị ra output sau khi đã chuyển đổi:

![](./images/Pasted%20image%2020260427210253.png)




## 4. Exploitation


>h@ppy h@ck!n9 
>*(BKSEC)*
