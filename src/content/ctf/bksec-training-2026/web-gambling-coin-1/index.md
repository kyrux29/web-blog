---
title: "Gambling Coin 1"
date: 2026-05-14
platform: "BKSEC_training"
category: "Web"
difficulty: "Hidden"
tags: ["web", "bksec-training"]
series: "BKSEC Training 2026"
draft: false
---

# Gambling Coin 1

## Challenge Information
- **Category**: Web Exploitation
- **Event**: BKSEC training 2026
- **Author**: d4ngvn
- **Difficulty**: Hidden
- **Tags**: #web #PHP74 #PHPcmp 
---
## 1. Description
> A simple even/odd betting game. You start with 1 coin and can bet on CHẴN (even) or LẺ (odd). Your goal is to find a way to reach 999 coins to retrieve the flag.
> 
> _Disclaimer: This challenge does not encourage or promote gambling in any form._
> 
> _Khuyến cáo: Thử thách này được tạo ra hoàn toàn vì mục đích giáo dục và giải trí. CLB BKSEC không ủng hộ, quảng bá hay khuyến khích bất kỳ hành vi đánh bạc nào._
## 2. Overview
Một challenge mô tả trang web cá cược online, người chơi là người không bao giờ thắng =))) Ta có thể lách luật bằng cách gửi các request không đúng với mục đích ban đầu của dev.
## 3. Reconnaissance
Giao diện là một trang cờ bạc cá cược chẵn lẻ, nếu cược chẵn và số ngẫu nhiên ra chẵn thì ăn và ngược lại.

![](./images/Pasted%20image%2020260224171639.png)

Ta sẽ thử nhập tiền cược và bắt request trong Burp xem:

![](./images/Pasted%20image%2020260228183455.png)

Response trả về một json chứa thông tin như kết quả, thông tin của lần cược.
## 4. Exploitation
Ta thử cho các giá trị string vào tham số `bet_amount` xem sao:

![](./images/Pasted%20image%2020260228183609.png)

Vẫn được -> backend chỉ lấy giá trị số, thử đặt một giá trị lớn hơn số dư hiện tại `5a`:

![](./images/Pasted%20image%2020260228184125.png)

-> Vẫn được, rất có thể bài này bị dính lỗ hổng trong so sánh giữa string và số nguyên, thử thêm 1 payload nữa như `1000a` xem sao:

![](./images/Pasted%20image%2020260228183732.png)

-> Chiến thắng và lấy được flag

