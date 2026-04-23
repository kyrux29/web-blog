---
title: "NextPath"
password: "123"
date: 2026-04-23
platform: "HackTheBox"
category: "Web"
difficulty: "Medium"
tags: ["web", "hackthebox"]
draft: false
---

# NextPath
## Challenge Information
- **Category**: Web Exploitation
- **Event**: none
- **Author**: JOR1AN
- **Difficulty**: Medium
- **URL**: https://app.hackthebox.com/challenges/NextPath?tab=play_challenge
- **Tags**: #web #Path_Traversal 
---
## 1. Description
>Find the next path in your career or even some vulnerabilities along the way. Anyway, good luck on your travels!
## 2. Overview
Một challenge Path Traversal cực kỳ lắt léo :v
## 3. Reconnaissance
Vì là một bài whitebox nên thường giao diện không có quá nhiều chức năng để khai thác:

![](./images/Pasted%20image%2020260331180256.png)

Ta sẽ vào source để đọc luôn, ta có cấu trúc source như sau:

```
NextPath/
├── Dockerfile    
├── build-docker.sh
├── flag.txt
└── app/
    ├── package.json
    ├── next.config.js
    ├── team/
    └── pages/
        ├── index.js
        └── api/
            └── team.js
```

Mục tiêu chính là `/flag.txt` nằm ở bên ngoài thư mục app

Kiểm tra `Dockerfile`:

![](./images/Pasted%20image%2020260331181019.png)

-> Ứng dụng chạy bằng Node.js 18 trên Alpine Linux

Kiểm tra `/pages/index.js`:

![](./images/Pasted%20image%2020260331181515.png)

-> Dựa vào các đường dẫn này ta sẽ thử gọi ở URL trên trình duyệt:

![](./images/Pasted%20image%2020260331181604.png)

-> Ta có thể thấy path này gọi đến api -> file `team.js` và truyền tham số `id=2` vào để xử lý -> Nghĩ đến lỗ hổng Path Traversal, nhưng vì là bài whitebox nên ta chưa cần thử vội mà kiểm tra thêm file xử lý của tham số.

Kiểm tra `/pages/api/team.js`:

![](./images/Screenshot%202026-03-31%20182606.png)

Dựa vào file này ta cũng phát hiện được khá nhiều khe hở để lách:

1. `const ID_REGEX = /^[0-9]+$/m;`: 
   - Cờ `/m` (multiline) sẽ làm thay đổi cách hoạt động của cả `^` và `$`, cụ thể:
	   - **Bình thường:** `^` và `$` so khớp đầu và cuối của cả chuỗi.
	   - **Có cờ `/m`:** `^` và `$` sẽ so khớp đầu và cuối của mỗi dòng.
   - Hàm `.test(string)` chỉ cần có ít nhất một dòng hợp lệ thì nó sẽ trả về `true`.
   - Ví dụ:

   ```js
	/^[0-9]+$/m.test("1\n../../flag.txt") // true
	/^[0-9]+$/.test("1\n../../flag.txt") // false
   ```

2. `query.id.includes("/") || query.id.includes("..")`:
   - Ở hàm `.includes(...)`, nếu `query.id` là một array thì nó sẽ gọi `Array.prototype.includes` thay vì `String.prototype.includes`.
   - Với Array, hàm này sẽ chỉ kiểm tra xem có tồn tại phần tử nào khớp với phần `...` của nó hay không chứ không còn là kiểm tra chuỗi con trong string.
   - Ví dụ:
   ```js
   "../../flag.txt".includes("..") //true
   ["../../flag.txt"].includes("..") //false
   ["../../flag.txt"].includes("/") //false
   ```

Nhưng làm sao để truyền được array vào tham số `id`? Điều này đã được Next.js Pages Router hỗ trợ, cụ thể: khi truyền 2 tham số cùng tên nhau trên url, Next.JS sẽ tự chuyển thành mảng

Ví dụ: `?id=1&id=2` → `query.id = ["1", "2"]`

-> Ta có cơ sở đề viết payload bypass được 2 lớp phòng thủ đầu, nhưng phần khó nhất vẫn là hệ thống sẽ tự thêm đuôi `.png` vào và chỉ lấy 100 ký tự đầu của path

-> Vậy ta phải tìm cách để path có đúng 104 ký tự, trong đó 100 ký tự dẫn đến `flag.txt` và 4 ký tự cuối là `.png`.
## 4. Exploitation
Đầu tiên ta cần xác định thư mục hiện tại đang đứng và thư mục đang chứa `flag.txt`, dựa vào cây thư mục ở phần đầu, ta có thể gọi đến file `flag.txt` bằng đường dẫn `../../../../flag.txt`.

Ta sẽ biến đường dẫn thành dạng array và bypass regex như sau:
`["1\n2", "../../../../flag.txt"]`
Trong đó:
- `toString()` = `"1\n2,../../../../flag.txt"` -> bypass được regex nhờ `/m` và "1"
- `Array.includes("..")` → `false` (không element nào bằng `".."`)
- `Array.includes("/")` → `false` (không element nào bằng `"/"`)

Để bypass 100 ký tự, ta thử:

- `["1111111...1\n2", "../../../../flag.txt"]` 
-> fail do `path.join("11111...1111\n2", "1\n2,../../../../flag.txt.png")` sẽ chuẩn hóa thành `../../flag.txt.png`.

Lúc này mình có tra và nhận ra rằng trên Linux:
- `/proc/self/root` là symlink đến `/`
- `proc/1/root/` cũng là symlink đến `/`
- `path.join` không chuẩn hóa các symlink này

-> `proc/self/root/` và `proc/1/root/` có thể thỏa mãn để bypass hàm

Bây giờ ta sẽ làm một phép toán đơn giản để tính cần bao nhiêu `../` và bao nhiều `/proc/self/root` để đủ 100 ký tự:

```
"../" × M  +  "proc/self/root/" × P  +  "flag.txt"
 3M chars      15P chars                 8 chars
 
 -> 3M + 15P + 8 = 100
 -> M + 5P = 92/3 (vô lý)
 
 "../" × M  +  "proc/1/root/" × P  +  "flag.txt"
 3M chars      12P chars               8 chars
 
 -> 3M + 12P + 8 = 100
 -> 3(M + 4P) = 92 (vô lý)
```

Ta có thể dễ dàng nhận ra được 12 và 15 đều là bội của 3 mà 92 lại không phải là bội của 3-> fail
-> Cần một số lượng chars không chia hết cho 3.

Lúc này ta thử dùng `/proc/thread-self/root/` (22 chars)

```
"../" × M  +  "proc/thread-self/root/" × P  +  "flag.txt"
 3M chars      22P chars                        8 chars
 
 -> 3M + 22P = 92
 Với P = 2 -> M = 16 (thỏa mãn)
 Với P = 3 -> M = 70/3
 Với P = 4 -> M = 4/3
```

Với P = 2 và M = 16 và 8 ký tự của `flag.txt` thì ta sẽ vừa đủ 100 và lúc này có nối thêm `.png` ta vẫn sẽ giữ được đúng mục đích ban đầu.

Payload:
```
"../" x 16 + "proc/thread-self/root/" × 2 + "flag.txt"
```

URL encode:
```
..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2Fproc%2Fthread-self%2Froot%2Fproc%2Fthread-self%2Froot%2Fflag.txt
```

![](./images/Pasted%20image%2020260331223606.png)

Vẫn sai =((( 

Sau khi phân tích lại thì mình để ý hàm `const filepath = path.join("team", query.id + ".png");` thì khi đưa payload vào sẽ được chuẩn hóa thành `team/1\n2,../../'` (16 lần) + `/flag.txt.png`
-> Sau đó path sẽ được join sửa thành `../` (13 lần) + `/flag.txt.png` nên sẽ không tìm thấy flag

-> Chỉ cần thêm 3 cái `../` là xong =))

Payload URL encode:
```
..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2Fproc%2Fthread-self%2Froot%2Fproc%2Fthread-self%2Froot%2Fflag.txt
```

![](./images/Pasted%20image%2020260331224918.png)

>h@ppy h@ck!n9 
>*(BKSEC)*
