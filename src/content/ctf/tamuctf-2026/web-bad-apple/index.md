---
title: "bad_apple"
date: 2026-05-14
platform: "TAMUCTF"
category: "Web"
difficulty: "Hidden"
tags: ["web", "tamuctf"]
series: "TAMUCTF 2026"
draft: false
---

# bad-apple
## Challenge Information
- **Category**: Web Exploitation
- **Event**: TAMUCTF 2026
- **Author**: moveslow
- **Difficulty**: Hidden
- **Tags**: #web #Path_Traversal
---
## 1. Description
>funny touhou reference
## 2. Overview
Đây là một ứng dụng web cho phép người dùng upload video, GIF rồi tách thành các frame PNG để hiển thị dưới dạng ASCII art animation.
## 3. Reconnaissance
Như giao diện của nó thì ta cũng đoán được chức năng của web này là upload các file video và chuyển đổi nó thành video dạng ASCII:

![](./images/Pasted%20image%2020260322174450.png)

Vì challenge cung cấp source code nên ta sẽ mở lên xem có những chức năng gì trong đấy. Source code gồm 3 file: 
- `wsgi_app.py`: Đây là file backend chính của trang web
- `httpd-append.conf`: Đây là file cấu hình server
- `Dockerfile`: Đây là file để đóng gói và deploy

Với file `Dockerfile`, ta có thể tìm thấy được flag được giấu trong đường dẫn `/srv/http/uploads/admin/flag.gif` nhưng trước đó sẽ được hexcode sau đó đổi tên để khó phát hiện hơn:

```bash
CMD ["sh", "-c", "HEX=$(openssl rand -hex 16) && mv /srv/http/uploads/admin/flag.gif /srv/http/uploads/admin/$HEX-flag.gif && echo $HEX > /srv/http/.flag_secret && httpd -DFOREGROUND"]
```

Ở file `httpd-append.conf`, ta có thể thấy đường dẫn `/srv/http/uploads` được đặt bí danh là `/browse` và khi đọc file `.gif` sẽ phải cung cấp xác thực:

![](./images/Pasted%20image%2020260322175350.png)

-> Từ đây kết hợp với đường dẫn lưu trữ trên `docker`, ta thử cả 2 đường dẫn `/srv/http/uploads/admin` và `/browse/admin` xem có thể thấy được các file bị lộ không:

![](./images/Pasted%20image%2020260322175619.png)

-> Rõ ràng với đường dẫn này ta đã tìm thấy được tên thật sự của file flag và vì ở file Apache đã setup chỉ được đọc file đuôi `.gif` với quyền admin nên khi cố tình đọc nó sẽ yêu cầu xác thức:

![](./images/Pasted%20image%2020260322175725.png)

-> Đọc tiếp file `wsgi_app.py` xem có thể recon được gì nữa không.

Luồng hoạt động: Người dùng upload video/gif lên thông qua route `/upload` -> convert thành các frame thông qua `/convert` bởi hàm `def extract_frames(input_path, output_dir, gif_name)` và đặt biệt là `ffmpeg` của linux -> `/get_frames` sẽ lấy các ảnh `.png` đó và hiển thị bằng các mã ASCII.

Ở hàm `upload()`, tên file đã được làm sạch thông qua hàm `filename = secure_filename(file.filename)`, nhưng `user_id` lại lấy từ cookie (ta có thể thay đổi để inject payload khai thác). Nhưng tổng quan thì hàm này khá an toàn và đã dùng `secure_file()` để chặn path traversal

![](./images/Pasted%20image%2020260322185002.png)

Với hàm `convert()` thì lại là một câu chuyện khác, các biến `user_id` và `filename` để lấy từ tham số của GET và được nối vào đường dẫn upload file, nhưng ở đây chỉ có `user_id` được bọc trong `secure_file` còn `filename` thì không -> Ta có thể nghĩ đến lỗ hổng path traversal để bypass và đọc được flag.

![](./images/Pasted%20image%2020260322185037.png)

Trong hàm `convert()` lại gọi đến một hàm đặt biệt là `extract_frames()`, hàm này dùng `FFmpeg` để chia các `video/gif` (phía client bị cấm) thành các file `.png` (phía client cho phép đọc) để hiển thị, nhưng sai lầm ở đây là `FFmpeg` chạy ở server-side và đọc trực tiếp file từ system mà không phải đi qua xác thực đã setup trong Apache -> Ta có thể mượn tay hàm này phía server kết hợp với `get_frames()` để đọc flag.

![](./images/Pasted%20image%2020260322185214.png)

-> Lỗ hổng nằm ở việc cấu hình cấm user đọc file `.gif` nhưng lại cho phép đọc file `.png`
## 4. Exploitation
Dùng đường dẫn `/browse/admin/` ta lấy được tên file flag là: `e017b6321bda6812ec80e9fac368709e-flag.gif`

Sau đó thông qua `/convert` để chuyển từ `.gif` -> `.png`. Thông thường để tìm đến file flag với lỗ hổng path traversal ta sẽ dùng `../`, nhưng trong trường hợp này ta không cần `../` vì:
- `user_id=admin` → `secure_filename("admin")` = `"admin"`
- `filename=e017b6321bda6812ec80e9fac368709e-flag.gif`
-  Với hàm `os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(user_id), filename)`, ta sẽ có `input_path` = `/srv/http/uploads/admin/e017b6321bda6812ec80e9fac368709e-flag.gif` (đúng với đường dẫn của flag)

-> Server sẽ chạy `FFmpeg` để chuyển đổi thành các frames dạng `.png`, bây giờ sẽ dùng `get_frames` để đọc các file ảnh này:
`GET /static/frames/admin/e017b6321bda6812ec80e9fac368709e-flag/frame_XXXX.png`

Ta sẽ đọc các file từ `frame_0001.png` để lấy hết flag:
- `frame_0001`:

![](./images/Pasted%20image%2020260322183448.png)

- `frame_0025`:

![](./images/Pasted%20image%2020260322183538.png)

- `frame_0050`:

![](./images/Pasted%20image%2020260322183602.png)

- `frame_0075`:

![](./images/Pasted%20image%2020260322183629.png)

- `frame_0100`:

![](./images/Pasted%20image%2020260322183711.png)

- `frame_0125`:

![](./images/Pasted%20image%2020260322183743.png)

*note: lỗ hổng thật sự nằm ở chỗ server cấu hình chặn file .gif nhưng lại cho phép file .png trong khi có chức năng convert gif to png.*
## 5. Fix

```python
# Fix 1: Sanitize all user input
input_path = os.path.join(
    app.config['UPLOAD_FOLDER'],
    secure_filename(user_id),
    secure_filename(filename)       # Thêm secure_filename()
)

# Fix 2: Kiểm tra auth trước khi convert 
@app.route('/convert')
def convert():
    current_user = request.cookies.get('user_id')
    requested_user = request.args.get('user_id', 'anonymous')
    if current_user != requested_user:      # Chặn IDOR
        return "Unauthorized", 403

# Fix 3: Bỏ directory listing
Options -Indexes  (thay vì +Indexes)

# Fix 4: Bảo vệ cả file PNG trong admin dir
<Directory /srv/http/uploads/admin>
    AuthType Basic
    Require valid-user
</Directory>
```

>h@ppy h@ck!n9 
>*(BKSEC)*