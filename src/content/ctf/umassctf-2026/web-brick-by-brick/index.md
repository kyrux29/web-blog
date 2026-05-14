---
title: "Brick by Brick"
date: 2026-05-14
platform: "UMassCTF 2026"
category: "Web"
difficulty: "Easy"
tags: ["web", "umassctf-2026"]
series: "UMassCTF 2026"
draft: false
---

# Brick by Brick
## Challenge Information
- **Category**: Web Exploitation
- **Event**: UMassCTF 2026
- **Author**: Michael/michaelye_22
- **Difficulty**: Easy
- **Tags**: #web #robots
---
## 1. Description
>I found this old portal for BrickWorks Co. They say their internal systems are secure, but I'm not so sure. Can you find the hidden admin dashboard and get the flag?

Hint 1: What files do web servers usually use to hide things from search engines?
Hint 2: Look closely at the URL parameters when reading documents.
## 2. Overview
Đây là một bài easy của web, chỉ cần chịu khó recon một chút là ra hehe
## 3. Reconnaissance
Giao diện web khá đơn giản và không có chức năng gì để khai thác:

![](./images/Pasted%20image%2020260413200700.png)

Và vì đây là một bài Blackbox nữa nên mình sẽ tiến hành scan các directory hoặc parameter, nhưng trước đó mình sẽ manual một vài cái tên quen thuộc như `/admin`, `/robots.txt`,...

Và cũng dựa trên hint1 của challenge thì mình quyết định thử `/robots.txt` thì ăn luôn file này:

![](./images/Pasted%20image%2020260413201028.png)

Ta thấy trang web chặn bot tiếp cận 3 đường dẫn này, mình sẽ mở lần lượt để xem:

- `/internal-docs/assembly-guide.txt`: Không có gì đáng chú ý

	![](./images/Pasted%20image%2020260413201825.png)

- `/internal-docs/it-onboarding.txt`: lộ các đường dẫn và tham số nội bộ

	![](./images/Pasted%20image%2020260413202729.png)

- `/internal-docs/q3-report.txt`: chẳng có gì hot

	![](./images/Pasted%20image%2020260413202818.png)

Dựa trên những gì ta tìm thấy ở `/internal-docs/it-onboarding.txt`, ta sẽ truy cập vào dùng tham số `file` để đọc file `config.php`như sau: `?file=config.php`

![](./images/Pasted%20image%2020260413203044.png)

-> Lộ đường dẫn đến dashboard của admin là `/dashboard-admin.php`, truy cập vào thì ta thấy giao diện trang admin:

![](./images/Pasted%20image%2020260413203400.png)

Lúc này mình nghĩ đến lỗ hổng SQL injection, nhưng vì có tham số `file` để đọc bất kỳ file nào của hệ thống nên mình đọc thẳng source của trang admin này luôn
## 4. Exploitation
Đọc source của file `dashboard-admin.php` bằng `?file=dashboard-admin.php`:

![](./images/Pasted%20image%2020260413203659.png)

-> Ta có cả username/password của admin nhưng ai quan tâm =))) có flag để submit là được rồi hẹ hẹ

>h@ppy h@ck!n9 
>*(BKSEC)*