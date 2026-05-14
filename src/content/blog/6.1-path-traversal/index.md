---
title: "6.1 - Path Traversal"
date: 2026-05-14
category: "Tutorial"
series: "File-related Vulnerabilities"
seriesOrder: 6
tags: []
draft: false
---

### **Path traversal là gì?**

**Path traversal** còn được gọi là **directory traversal**. Đây là các lỗ hổng cho phép kẻ tấn công đọc các **tệp tùy ý** trên máy chủ đang chạy ứng dụng. Những tệp này có thể bao gồm:

* Mã nguồn và dữ liệu của ứng dụng.
* **Thông tin xác thực (credentials)** của các hệ thống phía sau (**back-end systems**).
* Các tệp hệ điều hành nhạy cảm.

Trong một số trường hợp, kẻ tấn công còn có thể ghi vào các tệp tùy ý trên máy chủ, cho phép chúng thay đổi dữ liệu hoặc hành vi của ứng dụng, và cuối cùng là **chiếm quyền kiểm soát hoàn toàn máy chủ**.

### **Đọc các tệp tùy ý thông qua tấn công path traversal**

Hãy tưởng tượng một ứng dụng mua sắm hiển thị hình ảnh các mặt hàng đang được rao bán. Ứng dụng này có thể tải hình ảnh bằng đoạn mã HTML sau:

```html
<img src="/loadImage?filename=218.png">
```

URL `/loadImage` nhận một tham số tên tệp (`filename`) và trả về nội dung của tệp được chỉ định. Các tệp hình ảnh này được lưu trữ trên đĩa tại vị trí `/var/www/images/`. Để trả về một hình ảnh, ứng dụng sẽ nối tên tệp được yêu cầu vào thư mục cơ sở này và sử dụng một API hệ thống tệp (**filesystem API**) để đọc nội dung của tệp. Nói cách khác, ứng dụng sẽ đọc từ đường dẫn tệp như sau:

```swift
/var/www/images/218.png
```

Ứng dụng này **không triển khai bất kỳ cơ chế phòng vệ nào chống lại các cuộc tấn công path traversal**. Do đó, kẻ tấn công có thể gửi yêu cầu URL sau để truy xuất tệp `/etc/passwd` từ hệ thống tập tin của máy chủ:

```bash
https://insecure-website.com/loadImage?filename=../../../etc/passwd
```

Điều này khiến ứng dụng thực hiện đọc từ đường dẫn:

```swift
/var/www/images/../../../etc/passwd
```

Chuỗi `../` là hợp lệ trong đường dẫn tệp và có nghĩa là **lùi lên một cấp trong cấu trúc thư mục**. Ba chuỗi `../` liên tiếp sẽ giúp quay lên từ `/var/www/images/` đến thư mục gốc của hệ thống tập tin, do đó tệp thực sự được đọc là:

```bash
/etc/passwd
```

Trên các hệ điều hành dựa trên Unix, đây là một tệp tiêu chuẩn chứa thông tin về các **người dùng đã đăng ký trên máy chủ**, nhưng kẻ tấn công có thể lấy được **các tệp tùy ý khác** bằng cùng một kỹ thuật.

Trên Windows, cả `../` và `..\` đều là các chuỗi hợp lệ cho path traversal. Sau đây là ví dụ về một cuộc tấn công tương tự trên máy chủ sử dụng hệ điều hành Windows:

```swift
https://insecure-website.com/loadImage?filename=..\..\..\windows\win.ini
```

### **Các trở ngại phổ biến khi khai thác lỗ hổng path traversal**

Nhiều ứng dụng khi chèn dữ liệu do người dùng cung cấp vào đường dẫn tệp sẽ **triển khai các cơ chế phòng vệ chống lại tấn công path traversal**. Tuy nhiên, những cơ chế này **thường có thể bị vượt qua**.

Nếu một ứng dụng **loại bỏ hoặc chặn các chuỗi truy hồi thư mục** (directory traversal sequences) như `../` khỏi tên tệp do người dùng cung cấp, thì **vẫn có thể vượt qua biện pháp phòng vệ đó bằng nhiều kỹ thuật khác nhau**.

Ví dụ, bạn có thể sử dụng một **đường dẫn tuyệt đối** (absolute path) từ thư mục gốc của hệ thống tập tin, như:

```ini
filename=/etc/passwd
```

Để **truy cập trực tiếp một tệp** mà **không cần sử dụng bất kỳ chuỗi truy hồi nào**.

Bạn có thể sử dụng **các chuỗi truy hồi thư mục lồng nhau** (nested traversal sequences), chẳng hạn như:

```
....// hoặc ....\/
```

Những chuỗi này sẽ **quay trở lại thành chuỗi truy hồi đơn giản** như `../` **sau khi phần bên trong bị loại bỏ** bởi cơ chế lọc của ứng dụng.

Nói cách khác, nếu ứng dụng cố gắng loại bỏ `../` nhưng không xử lý triệt để các biến thể như `....//`, thì những chuỗi này **vẫn có thể được giải thích thành truy hồi thư mục**, cho phép kẻ tấn công **vượt qua được lớp bảo vệ ban đầu**.

Trong một số ngữ cảnh, chẳng hạn như **trong đường dẫn URL** hoặc tham số `filename` của một yêu cầu `multipart/form-data`, **máy chủ web có thể tự động loại bỏ các chuỗi truy hồi thư mục** (directory traversal sequences) trước khi chuyển dữ liệu đầu vào cho ứng dụng xử lý.

Tuy nhiên, bạn **có thể vượt qua cơ chế làm sạch này** bằng cách:

**Mã hóa URL (`URL encoding`)**

* **`../`** → **`%2e%2e%2f`** (trong đó: `%2e` = `.` và `%2f` = `/`)

**Mã hóa URL kép (`double URL encoding`)**

* **`../`** → **`%252e%252e%252f`** (trong đó: `%25` = `%`, nên `%252e` = `%2e` = `.`)

**Các mã hóa không chuẩn khác (non-standard encodings)**

Một số ví dụ khác có thể **lách qua bộ lọc hoặc cơ chế chuẩn hóa** của server:

* **`..%c0%af`**
* **`..%ef%bc%8f`** Cả hai đều là **các biến thể mã hóa để đại diện cho ký tự `/` hoặc tương đương**, giúp vượt qua kiểm tra tĩnh.

**Sử dụng Burp Suite Professional**

Nếu bạn đang dùng **Burp Suite Professional**, thì **Burp Intruder** có sẵn danh sách payload được định nghĩa trước:

> **Fuzzing - path traversal**

Danh sách này chứa **các chuỗi path traversal đã được mã hóa**, bạn có thể thử để khai thác các lỗ hổng trong ứng dụng.

***

**Tóm lại:**\
Khi máy chủ web lọc các chuỗi như `../`, bạn có thể:

* Mã hóa chuỗi để đánh lừa bộ lọc (`%2e%2e%2f`)
* Mã hóa nhiều lần nếu cần (`%252e%252e%252f`)
* Thử các kiểu mã hóa không chuẩn
* Dùng công cụ chuyên dụng như Burp để tự động hóa và thử nhiều biến thể.

**note**

🔹 `..`

* Đây là **ký hiệu chuẩn** trong hệ thống tập tin dùng để **quay lại một cấp thư mục phía trên** (directory level up).
* Ví dụ: nếu bạn đang ở `/var/www/images/` thì `../` sẽ đưa bạn lên `/var/www/`.

***

🔹 `../`

* Là cách phổ biến nhất để thực hiện **truy hồi thư mục** (directory traversal).
* Nhiều hệ thống sẽ hiểu `../../../etc/passwd` là quay lên 3 cấp rồi truy cập tệp `/etc/passwd`.

***

🔹 `....//`

* Trông có vẻ vô nghĩa, nhưng thực chất là một **kỹ thuật đánh lừa hệ thống lọc**.
* Nếu ứng dụng lọc chuỗi `../` nhưng không lọc chuỗi dài hơn như `....//`, thì:
  * `....//` có thể được tách ra thành `..` + `../`, hoặc sẽ **được rút gọn thành `../` khi hệ thống xử lý đường dẫn**.
* Hệ điều hành thường sẽ **chuẩn hóa** lại đường dẫn như vậy.

***

🔹 `....\/`

* Tương tự như `....//`, nhưng sử dụng dấu gạch chéo ngược (`\`) – **dành cho hệ thống Windows**.
* Hệ điều hành Windows hiểu `\` là dấu phân cách thư mục như `/` trên Unix/Linux.

###

Một số ứng dụng có thể yêu cầu **tên tệp do người dùng cung cấp phải bắt đầu bằng một thư mục cơ sở cố định**, chẳng hạn như:

```bash
/var/www/images
```

Trong tình huống này, **kẻ tấn công vẫn có thể vượt qua kiểm tra** bằng cách **giữ nguyên thư mục cơ sở yêu cầu ở đầu**, sau đó chèn thêm các chuỗi truy hồi thư mục thích hợp (ví dụ `../`) để thoát khỏi thư mục gốc ban đầu.

**Ví dụ:**

```swift
filename=/var/www/images/../../../etc/passwd
```

Khi hệ thống xử lý đường dẫn này, nó sẽ rút gọn thành:

```bash
/etc/passwd
```

→ Điều này cho phép kẻ tấn công **truy cập các tệp nhạy cảm bên ngoài thư mục được phép**, dù tên tệp ban đầu có chứa thư mục `/var/www/images`.

***

**Tóm lại:**

* **Biện pháp kiểm tra "bắt đầu bằng thư mục gốc" không đủ an toàn**, nếu ứng dụng **không chuẩn hóa (normalize)** đường dẫn trước khi sử dụng.
* Hệ điều hành sẽ **hợp nhất và rút gọn** các thành phần như `../`, cho phép thoát ra khỏi thư mục được chỉ định.

***

#### 1. **Hệ điều hành sẽ chuẩn hóa đường dẫn (path normalization)**

Hệ điều hành hoặc hàm đọc file (như `fopen()`, `readFile()`, v.v.) sẽ **tự động rút gọn đường dẫn** trước khi truy cập file.

Ví dụ:

```bash
/var/www/images/../../../etc/passwd
```

→ Hệ điều hành sẽ xử lý như sau:

```bash
/var/www/images → thư mục ban đầu
../ → lên /var/www
../ → lên /var
../ → lên /
=> Kết quả: /etc/passwd
```

Vậy nên, mặc dù chuỗi đầu vào **có chứa thư mục đúng (`/var/www/images`)**, cuối cùng ứng dụng lại **đọc tệp nằm ngoài thư mục cho phép**.

***

#### 2. **Ứng dụng chỉ kiểm tra chuỗi đầu vào, không kiểm tra đường dẫn sau khi chuẩn hóa**

Lỗi bảo mật thường xảy ra khi lập trình viên kiểm tra như sau:

```python
if user_input.startswith("/var/www/images"):
    read_file(user_input)
```

→ Điều này **chỉ kiểm tra chuỗi văn bản (string)** chứ **không kiểm tra đường dẫn thực tế sau khi hệ điều hành xử lý**.

***

#### Giải pháp đúng phải là gì?

1. **Chuẩn hóa đường dẫn trước (normalize/canonicalize)** đầu vào bằng các hàm như `realpath()` (C, PHP), `os.path.realpath()` (Python)...
2. **Kiểm tra xem đường dẫn chuẩn hóa có còn nằm trong thư mục cho phép không.**

ví dụ:

```python
import os

user_input = "/var/www/images/../../../etc/passwd"
real_path = os.path.realpath(user_input)

if real_path.startswith("/var/www/images/"):
    read_file(real_path)
else:
    deny_access()
```

## PAYLOAD THƯỜNG DÙNG

```
..%252f..%252f..%252fetc/passwd
```

```
....//....//....//etc/passwd
```

```
/var/www/images/../../../etc/passwd
```

```
../../../etc/passwd%00.png
```