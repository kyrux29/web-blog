---
title: "Gambling Coin 2"
date: 2026-05-13
platform: "BKSEC_training"
category: "Web"
difficulty: "Hidden"
tags: ["web", "bksec-training"]
series: "BKSEC Training 2026"
draft: false
---

# Gambling Coin 2

## Challenge Information
- **Category**: Web Exploitation
- **Event**: BKSEC training 2026
- **Author**: d4ngvn
- **Difficulty**: Hidden
- **Tags**: #web  
---
## 1. Description
> Simple betting web. The server shows the flag when the displayed coins equals `9`.
> _Disclaimer: This challenge does not encourage or promote gambling in any form._
> _Khuyến cáo: Thử thách này được tạo ra hoàn toàn vì mục đích giáo dục và giải trí. CLB BKSEC không ủng hộ, quảng bá hay khuyến khích bất kỳ hành vi đánh bạc nào._
## 2. Overview
Một challenge mô tả trang web cá cược online, người chơi là người không bao giờ thắng =))) Ta có thể lách luật bằng cách gửi các request không đúng với mục đích ban đầu của dev.
## 3. Reconnaissance
Tương tự như ở phần 1, Gambing Coins 2 cũng là một dạng trang web cá cược, chỉ khác ở đây là trò chơi thả xúc xắc:

![](./images/Pasted%20image%2020260228184556.png)

Kiểm tra burp suite:

![](./images/Pasted%20image%2020260228184736.png)

![](./images/Pasted%20image%2020260228184753.png)

![](./images/Pasted%20image%2020260228184809.png)

Khi đặt cược request sẽ gửi một json là số tiền đặt cược và khi thành công server sẽ response lại một json báo cáo trạng thái. Ta sẽ test một vài payload như `1a`, `10a`, `-1`, `0.01`, `1e10`, `1 * 0 + 9`,...

![](./images/Pasted%20image%2020260228185102.png)

Các payload string đều cho qua, có một payload rất tiêu biểu là `1e10`:

![](./images/Pasted%20image%2020260228185137.png)

Server báo "số tiền không hợp lệ" -> `1e10` khi gửi lên server không coi là string mà coi đó là một số có giá trị rõ ràng là 10^10.

Rất có thể phần `Balance` cũng được tính tương tự như vậy, ta sẽ cố gắng làm sao để số đầu tiên xuất hiện ở `Balance` là 9 bằng cách đưa về dạng thập phân một số rất nhỏ.

Reset số dư lại 1 và thử payload `0.999999991`:

![](./images/Pasted%20image%2020260228185550.png)

-> Dự đoán đã đúng, ta check giao diện xem có gì thay đổi không

![](./images/Pasted%20image%2020260228185701.png)

Đã hiện lên 8 coins mặc dù số dư không đủ -> Lỗ hổng ngay tại đây
## 4. Exploitation
Reset và gửi payload `0.9999999901`

![](./images/Pasted%20image%2020260228190024.png)

![](./images/Pasted%20image%2020260228190048.png)

Đã lấy được flag