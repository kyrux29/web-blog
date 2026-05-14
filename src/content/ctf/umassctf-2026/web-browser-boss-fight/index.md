---
title: "BrOWSER BOSS FIGHT"
date: 2026-05-14
platform: "UMassCTF 2026"
category: "Web"
difficulty: "Easy"
tags: ["web", "umassctf-2026"]
series: "UMassCTF 2026"
draft: false
---

# BrOWSER BOSS FIGHT
## Challenge Information
- **Category**: Web Exploitation
- **Event**: UMassCTF 2026
- **Author**: Ian/ianstadtlander
- **Difficulty**: Easy
- **Tags**: #web
---
## 1. Description
>This familiar brick castle is hiding something... can you break in and defeat the Koopa King?

Hint 1: Check what the local script is doing to your key attempts... how could you bypass it?
## 2. Overview
Bài cũng khá đơn giản nên không có kỹ thuật gì nhiều, chủ yếu ta sẽ dựa vào các hint để đi bước tiếp theo :vv
## 3. Reconnaissance
Giao diện chỉ đơn giản có 1 cánh cửa có thể click vào và ô input key để nhập dữ liệu:

![](./images/Pasted%20image%2020260413233745.png)

Mình sẽ thử nhập `test` rồi click cửa xem sao thì web tự đè tem thành `WEAK_NON_KOOPA_KNOCK`:

![](./images/Pasted%20image%2020260413233906.png)

 sau đó chuyển hướng sang trang `/kamek.html` luôn:

![](./images/Pasted%20image%2020260413233914.png)

Check source phía client thì dễ dàng nhận ra web sẽ luôn thay thế input thành `WEAK_NON_KOOPA_KNOCK`

![](./images/Pasted%20image%2020260413234052.png)

check thêm `/css/style.css` thử xem có hint gì không:

![](./images/Pasted%20image%2020260413234152.png)

--> Bây giờ phải dùng Burp Suite để xem request có gì và ta có thể bỏ qua giao diện để post luôn key lên server không

![](./images/Pasted%20image%2020260413234735.png)

Dễ thấy response trả về một chi tiết rất đắt giá (tạm dịch: Lâu đài của BrOWSER - Một tờ ghi chú dán bên ngoài: "Thưa ngài Koopa, nếu ngài quên chìa khóa, hãy kiểm tra under_the_doormat! - Kính thư, bề tôi trung thành của ngài, Kamek").

--> Có thể xem là hint cũng được =)) lúc này mình chuyển hướng để check xem giao diện web có cái tấm thảm nào hay gì tương tự không thì nhìn code html mình cũng đoán là không có.

Lúc này mình thử xem cái `under_the_doormat` có phải key không, thử gửi lại POST với chuỗi này:

![](./images/Pasted%20image%2020260413235515.png)

Đã thấy điều bất thường =))) GET đến xem có gì hay không:

![](./images/Pasted%20image%2020260413235922.png)

Phần HTML:

![](./images/Pasted%20image%2020260413235946.png)

Một chuỗi toàn `Set-Cookie`, và có một hint nữa ở HTML (tạm dịch: Ta không biết làm sao ngươi vào được, nhưng ngươi không thể nào đánh bại ta! Ta đã cất cái rìu đi rồi!)

Nghĩa là hiện tại ta không có vũ khí để đánh boss, để ý một tí thì mình thấy một cookie khả nghi và bất ngờ nó lại trùng với hint:

![](./images/Pasted%20image%2020260413235900.png)
## 4. Exploitation
Sửa cookie thêm trường `hasAxe=true` vào thôi:

![](./images/Pasted%20image%2020260414000122.png)

>h@ppy h@ck!n9 
>*(BKSEC)*