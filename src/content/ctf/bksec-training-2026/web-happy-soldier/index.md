---
title: "Happy Soldier"
date: 2026-05-13
platform: "BKSEC_training"
category: "Web"
difficulty: "Medium"
tags: ["web", "bksec-training"]
series: "BKSEC Training 2026"
draft: false
---

# Happy Soldier

## Challenge Information
- **Category**: Web Exploitation
- **Event**: BKSEC training 2026
- **Author**: shibajutsu
- **Tags**: #web #arjun #PHPInjection
---
## 1. Description
> Are you a strong soldier?
## 2. Overview
Bài này sẽ cho giao diện là một trang play game, mục tiêu là tìm ra điều kiện chính xác để tiêu diệt monster và giành flag. Tận dụng lỗ hổng PHP Injection và các tool scanner ta sẽ tìm được flag.
## 3. Reconnaissance
Truy cập vào trang web ta sẽ thấy giao diện là một trang game.

![](./images/Pasted%20image%2020260210184949.png)

Chỉ có mỗi button `Fight monster` -> mở burp để đọc request xem sao

![](./images/Pasted%20image%2020260210185411.png)

Thấy có tham số `?action=fight` và sau hành động này thì tự chuyển hướng về lại trang chủ, vào xem chi tiết request/response.

![](./images/Pasted%20image%2020260210185528.png)

Thấy trường `save-data` ở Cookie rất giống base64 encode, thử decode xem sao:

![](./images/Pasted%20image%2020260210185645.png)

-> 99% Dính lỗ hổng PHP Injection. Nhưng để biết chính xác sửa như thế nào để tìm ra điều kiện đúng, ta sẽ scan qua một lượt để xem có gì khả nghi không.

Thử scan directory và parameter, dùng tool arjun để scan thì phát hiện ra tồn tại tham số `src`:

![](./images/Pasted%20image%2020260210212854.png)

Thử cho `/?src=1` vào url thì ra source code phía backend của web 

![](./images/Pasted%20image%2020260210212957.png)

-> kết hợp với PHP injection để viết payload cho chall.
## 4. Exploitation

![](./images/Pasted%20image%2020260210213131.png)

Dựa vào điều kiện của if và đoạn code in ra flag ta có thể viết payload cho chuỗi Serialized hoàn chỉnh như sau:
```
O:6:"Player":4:{s:6:"health";i:100;s:6:"attack";i:99999999999999999;s:5:"coins";i:0;s:6:"weapon";s:34:"Golden Ultimate Extra Length Sword";}
```
Mã hóa base64 và dán vào save-data ở cookie để lấy flag
```
Tzo2OiJQbGF5ZXIiOjQ6e3M6NjoiaGVhbHRoIjtpOjEwMDtzOjY6ImF0dGFjayI7aTo5OTk5OTk5OTk5OTk5OTk5OTtzOjU6ImNvaW5zIjtpOjA7czo2OiJ3ZWFwb24iO3M6MzQ6IkdvbGRlbiBVbHRpbWF0ZSBFeHRyYSBMZW5ndGggU3dvcmQiO30=
```
![](./images/Pasted%20image%2020260210213443.png)