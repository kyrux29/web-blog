---
title: "parrot"
date: 2026-05-13
platform: "BKSEC_training"
category: "Web"
difficulty: "Medium"
tags: ["web", "bksec-training"]
series: "BKSEC Training 2026"
draft: false
---

# parrot

## Challenge Information
- **Category**: Web Exploitation
- **Event**: BKSEC training 2026
- **Author**: anhtv, nhatpd
- **Tags**: #web  #cmdi
---
## 1. Description
>A simple "repeat after me" challenge.
## 2. Overview
Đây là một challenge OS command injection điển hình.
## 3. Reconnaissance
Giao diện rất đơn giản, trang web sẽ hiện tại những gì chúng ta nhập vào:

![](./images/Pasted%20image%2020260228200408.png)

Ta sẽ thử vài payload để kiểm tra các lổ hổng:
- `<h1>test</h1>`:

![](./images/Pasted%20image%2020260228203744.png)

- `' OR 1=1--`:

![](./images/Pasted%20image%2020260228203823.png)

- `;whoami`:

![](./images/Pasted%20image%2020260228204227.png)

-> 99% dính OS command injection
## 4. Exploitation
Ta sẽ thử liệt kê xem thư mục hiện tại đang đứng có những thứ gì:

![](./images/Pasted%20image%2020260228204634.png)

Xem luôn thư mục gốc:

![](./images/Pasted%20image%2020260228204651.png)

Đã thấy file chứa flag -> cat và submit thôi, payload: `;cat /flagLe6VU`:

![](./images/Pasted%20image%2020260228204806.png)