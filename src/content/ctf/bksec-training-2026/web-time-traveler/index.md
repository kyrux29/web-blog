---
title: "Time Traveler"
date: 2026-05-14
platform: "BKSEC_training"
category: "Web"
difficulty: "Hidden"
tags: ["web", "bksec-training"]
series: "BKSEC Training 2026"
draft: false
---

# Time Traveler

## Challenge Information
- **Category**: Web Exploitation
- **Event**: BKSEC training 2026
- **Author**: f1rst
- **Difficulty**: Hidden
- **Tags**: #web #TimeTraveler #WaybackMachine
---
## 1. Description
> no description
## 2. Overview
Bài này yêu cầu người chơi phải xem lại được lịch sử để tìm phiên bản cũ của trang challenge. Sử dụng các trang chuyên dụng để xem source code cũ và flag nằm trong phần comment của source này.
## 3. Reconnaissance
- Giao diện trang web chỉ full màu trắng, thử bôi đen ta sẽ thấy một dòng chữ hiện ra

![](./images/Pasted%20image%2020260210191110.png)

- Mở source code lên xem có gì không:

![](./images/Pasted%20image%2020260210191153.png)

- Nhập thử flag `BKSEC{free-flagfor_every0n3}`
-> fail, tìm hướng khác
- Để ý tên challenge, ta sẽ tìm xem có cách nào xem lại được các lịch sử của trang hay không.
-> Sử dụng [https://web.archive.org/](https://web.archive.org/)
## 4. Exploitation
- Truy cập vào [https://web.archive.org/](https://web.archive.org/):

![](./images/Pasted%20image%2020260210200925.png)

![](./images/Pasted%20image%2020260210201616.png)

- Thấy ngày 1-1-2026 có một phiên bản -> vào và đọc source và submit flag

![](./images/Pasted%20image%2020260210201704.png)

