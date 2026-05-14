---
title: "Happy Soldier - Revenge"
date: 2026-05-14
platform: "BKSEC_training"
category: "Web"
difficulty: "Hidden"
tags: ["web", "bksec-training"]
series: "BKSEC Training 2026"
draft: false
---

# Happy Soldier

## Challenge Information
- **Category**: Web Exploitation
- **Event**: BKSEC training 2026
- **Author**: shibajutsu
- **Difficulty**: Hidden
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

Cũng như ở phần trước, ta sẽ kiểm tra `save-data` ở Cookie:

![](./images/Pasted%20image%2020260228220844.png)

-> Lần này có vẻ cũng là PHP injection nhưng có thêm thuộc tính `sig` mới xuất hiện

Thử scan directory và parameter, dùng tool arjun để scan thì phát hiện ra tồn tại tham số `src`:

![](./images/Pasted%20image%2020260210212854.png)

Thử cho `/?src=1` vào url thì ra source code phía backend của web 

![](./images/Pasted%20image%2020260228221038.png)

-> kết hợp với PHP injection để viết payload cho chall như ở phần trước nhưng sẽ khác tí.
## 4. Exploitation

![](./images/Pasted%20image%2020260228221029.png)

Ở chall này điều kiện kiểm tra input cũng đã chặt hơn (có thêm md5 các thứ), nhưng sai lầm của dev nằm ở chỗ khi khởi tạo bất kỳ đối tượng, hàm `__construct` đều tạo lại `sig` từ một chuỗi cứng: `$this->sig = md5($secret . "Wooden Sword");`, nhưng khi mang đi so sánh thì lại lấy một giá trị có thể thay đổi qua đầu vào như `$this->weapon`. Ta có thể sử dụng một trick trong PHP là `(true == "bất kỳ chuỗi không rỗng nào")` luôn trả về **TRUE** để viết payload:

`O:6:"Player":5:{s:6:"health";i:100;s:6:"attack";i:10;s:5:"coins";i:0;s:6:"weapon";s:12:"Golden Sword";s:3:"sig";b:1;}`

Thay đổi và encode base64 lại Cookie ta sẽ thu được flag:

![](./images/Pasted%20image%2020260301000602.png)