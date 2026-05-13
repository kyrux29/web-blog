---
title: "low-effort sns"
date: 2026-05-13
platform: "BKSEC_training"
category: "Web"
difficulty: "Medium"
tags: ["web", "bksec-training"]
series: "BKSEC Training 2026"
draft: false
---

# low-effort sns

## Challenge Information
- **Category**: Web Exploitation
- **Event**: BKSEC training 2026
- **Author**: teebow1e
- **Tags**: #web #SQLi
---
## 1. Description
> Yet another attempt to join the Social Networking market... Our site is coded using a super powerful technology that every big-tech use.
> Let's see if you can get through the login page.
## 2. Overview
Bài này là một dạng SQL injection cơ bản nhưng có thêm một chút lắt léo ở phần đếm số bản ghi, ta chỉ cần viết payload khéo một chút sẽ bypass được.
## 3. Reconnaissance
Web chỉ gồm 2 chức năng chính là login và sign-up:

![](./images/Pasted%20image%2020260224163702.png)

Sau 7749 lần thử thì có vẻ như việc đăng ký tài khoản để login không hiệu quả:

![](./images/Pasted%20image%2020260224163821.png)

Ta sẽ thử vài payload cơ bản để xem bài này có dính SQL injection không, ta sẽ bắt đầu với `username = '` và `password` bất kỳ:

![](./images/Pasted%20image%2020260224163907.png)

Bingooo!!! chắc chắn 99% là SQL injection và server đang dùng mySQL.
## 4. Exploitation
Bây giờ ta sẽ viết payload để bypass được trang login này, vì trong thông báo lỗi ta thấy 1 chi tiết quan trọng là hàm mysqli_num_row() và ta đoán hàm này sẽ đếm số lượng bản ghi trả về, nếu viết payload thông thường như `' OR 1=1 #` thì Database có thể sẽ trả về nhiều bản ghi gây "bội thực" kết quả.
-> Từ đây ta sẽ thêm `LIMIT 1` vào để khắc phục điều này, payload sẽ là:
```
' OR 1=1 LIMIT 1 #
```

![](./images/Pasted%20image%2020260224165742.png)

Bingoo! mở source để copy cờ thôi

![](./images/Pasted%20image%2020260224171003.png)
