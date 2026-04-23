---
title: "Dusty Alleys"
date: 2026-04-23
platform: "HackTheBox"
category: "Web"
difficulty: "Medium"
tags: ["web", "hackthebox"]
draft: false
---

# Dusty Alleys
## Challenge Information
- **Category**: Web Exploitation
- **Event**: none
- **Author**: Kahla
- **Difficulty**: Medium
- **URL**: https://app.hackthebox.com/challenges/Dusty%2520Alleys?tab=play_challenge
- **Tags**: #web #http1
---
## 1. Description
>In the dark, dusty underground labyrinth, the survivors feel lost and their resolve weakens. Just as despair sets in, they notice a faint light: a dilapidated, rusty robot emitting feeble sparks. Hoping for answers, they decide to engage with it.
## 2. Overview
Một bài dùng http/1.0
## 3. Reconnaissance
Với một bài whitebox và giao diện không có quá nhiều chức năng như thế này ta sẽ chuyển sang đọc code ngay luôn:

![](./images/Pasted%20image%2020260328164157.png)

Với những bài có file config như thế này ta sẽ đọc để hiểu server được config như thế nào trước, ở file `default.conf` ta có thể thấy bài này dùng cả 2 host, `alley.$SECRET_ALLEY` và `guardian.$SECRET_ALLEY`. Nhưng tác giả đã set default_server cho bài này là `alley.$SECRET_ALLEY` -> Mặc định khi truy cập trang web thì host chính vẫn là `alley`:

![](./images/Pasted%20image%2020260328164825.png)

Tiếp theo ta sẽ xem thêm file `Dockerfile` để biết thêm thông tin về container hay nơi flag được giấu, ở bài này thì ta chỉ biết flag được set làm biến môi trường và các cấu hình khác vẫn chưa khai thác được gì nhiều:

![](./images/Pasted%20image%2020260328165118.png)

Ở file `build-docker.sh` thì sẽ sẽ thấy web được chạy trên cổng `1337`:

![](./images/Pasted%20image%2020260328165429.png)

Đến với phần code thì ta có thể thấy tổng quan server dùng framework `Node.js` và có 2 file backend chính là `index.js` và `/routes/guardian.js`.

Ở file `index.js` ta vẫn chưa thấy bất thường gì:

![](./images/Pasted%20image%2020260328165651.png)

Đến với file `guardian.js` thì lúc này nơi lấy FLAG mới lộ diện:

![](./images/Pasted%20image%2020260328165831.png)

-> Điều cần thiết bây giờ là vào được router `/guardian` và gửi một payload nào đó để server tự nhả FLAG ra.
## 4. Exploitation
Ta sẽ thử dùng Burp Suite để xem ta đang thật sự ở đâu, ta sẽ dùng `/think` để lấy về thông tin của header:

![](./images/Pasted%20image%2020260328171416.png)

Ta có thể thấy web trả về host là một địa chỉ ip của container chứ không phải là một server_name như trong file cấu hình, vậy làm sao để lấy được cái server_name để lôi ra được SECRET, lúc này ta sẽ nhờ AI trợ giúp:

---
**Tại sao truy cập bình thường bằng HTTP/1.1 lại không lộ `server_name`?**
Khi bạn truy cập bình thường qua trình duyệt hoặc Burp Suite bằng HTTP/1.1 với địa chỉ IP, chuỗi sự kiện sau sẽ diễn ra:

1. **Trình duyệt tự động gắn Header:** Giao thức HTTP/1.1 bắt buộc phải có header `Host`. Vì bạn nhập IP, trình duyệt sẽ tự động tạo một header là: `Host: 154.57.164.83:30408`.

2. **Nginx nhận Request:** Nginx nhìn vào header `Host` và đi tìm xem có `server_name` nào khớp với chuỗi `154.57.164.83` không. Đương nhiên là không (vì tên thật của nó là `alley.secret...`).

3. **Rơi vào Default Server:** Vì không tìm thấy tên nào khớp, Nginx đẩy request của bạn vào khối server mặc định (default_server).

4. **Quy tắc ưu tiên của biến `$host` (Điểm mấu chốt):** Khi Nginx chuẩn bị chuyển tiếp (proxy_pass) request của bạn cho Backend Node.js, nó phải quyết định xem sẽ truyền header `Host` là gì. Quy tắc ưu tiên của Nginx đối với biến `$host` là:

- _Ưu tiên 1:_ Lấy giá trị từ header `Host` mà Client gửi lên.
- _Ưu tiên 2:_ Nếu Client KHÔNG gửi header `Host`, thì mới lấy `server_name` (tên bí mật) đắp vào.

---
Dựa vào những quy tắc này ta có thể nghĩ đến dùng protocol HTTP/1.0 để gửi request và xóa hoàn toàn host, lúc này ta sẽ buộc server phải lấy biến `$host` chính là cái `server_name` mà ta cần để hiển thị thông qua `/think:

![](./images/Pasted%20image%2020260328171951.png)

Lúc này ta đã lấy được SECRET là `firstalleyontheleft.com`
-> Chỉ cần gửi request với host là `guardian.firstalleyontheleft.com` ta sẽ truy cập được phần server bị giấu.

Dựa vào router `/guardian` và cơ chế cho phép tự gọi đến `localhost` của server mà ta có thể gửi vào `/guardian` một request với tham số và host như sau để đánh lừa server tự nhả ra FLAG:

```http
GET /guardian?quote=http%3A%2F%2Flocalhost%3A1337%2Fthink HTTP/1.1
Host: guardian.firstalleyontheleft.com
```

**Chi tiết**: 

![](./images/Pasted%20image%2020260328173245.png)

Ở phần `/guardian` ta có thể thấy server dùng hàm `node_fetch` để gửi request đến đích `quote` mà ta đưa vào, trong đó lại set headers là FLAG mà ta cần tìm. Sau đó chuyển toàn bộ kết quả của request địa chỉ mà `quote` bảo đến in ngược lại ra màn hình. Lúc này ta sẽ tận dụng `/think` và bảo server tự gọi đến chính nó thông qua `localhost:1337` để đọc cái header đó và lấy FLAG:

![](./images/Pasted%20image%2020260328173739.png)

>h@ppy h@ck!n9 
>*(BKSEC)*