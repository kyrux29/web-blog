---
title: "2.1 - SQL injection"
date: 2026-05-14
category: "Tutorial"
series: "Injection Attacks"
seriesOrder: 2
tags: []
draft: false
---

## SQL injection (SQLi) là gì?

**SQL injection** là một lỗ hổng bảo mật web cho phép người tấn công can thiệp vào các truy vấn được tạo bởi ứng dụng web vào Database của nó. Điều này có thể cho phép kẻ tấn công nhìn thấy được những data mà bình thường không thể truy xuất. Bao gồm cả data thuộc về những user khác, hoặc một vài các data khác mà ứng dụng có thể truy xuất đến. Trong nhiều trường hợp, kẻ tấn công có thể  modify lại hoặc delete những data này, gây ra những thay đổi về nội dung hoặc hành vi nào đó của ứng dụng.

Trong một vài tình huống, kẻ tấn công có thể leo quyền (escalate) một cuộc tấn công SQLi để thỏa hiệp với server nền tảng hoặc các cơ sở hạ tầng back-end khác. Nó cũng có thể có kahr năng dẫn đến những cuộc tấn công DoS (Denial-of-Service).

## Tác động của một cuộc tấn công SQLi thành công là gì?

Một cuộc tấn công **SQLi** thành công có thể truy cập trái phép vào những dữ liệu nhạy cảm, như Passwords, thông tin chi tiết thẻ tín dụng, CCCD, thông tin người dùng,...

Các cuộc tấn công **SQLi** đã được sử dụng trong nhiều vụ data breach (rò rỉ dữ liệu) nghiêm trọng trong nhiều những năm qua. Chúng đã gây ra thiệt hại về uy tín và bị phạt theo quy định. Trong một số trường hợp, attacker có thể chiếm được một persistent backdoor (cửa sau tồn tại lâu dài) vào hệ thống của tổ chức, dẫn đến tình trạng compromise kéo dài mà không bị phát hiện.

## Làm thế nào để phát hiện lỗ hổng SQLi

Ta có thể phát hiện lỗ hổng SQLi thủ công bằng cách thực hiện một bộ các kiểm tra hệ thống trên từng **entry point** trong application. Để làm được điều này, ta sẽ thường gửi:

* Một ký tự nháy đơn `'` và quan sát các lỗi hoặc các sự bất thường khác.
* Một số cú pháp **SQL** đặc thù sao cho biểu thức đánh giá về **giá trị gốc** (base/original value) của entry point và về một giá trị khác, rồi so sánh hệ thống phản hồi để tìm khác biệt có hệ thống.
* Các điều kiện boolean như `OR 1=1` và `OR 1=2`, rồi quan sát sự khác nhau trong các phản hồi của ứng dụng.
* Các **payload** được thiết kế để gây time delays khi thực thi trong câu truy vấn SQL, và so sánh thời gian phản hồi.
* **OAST payloads** (Out-Of-Band Application Security Testing) được thiết kế để kích hoạt tương tác mạng ngoài băng tần (out-of-band network interaction) khi chạy trong câu truy vấn SQL, và giám sát mọi tương tác phát sinh.

Ngoài ra, ta có thể tìm phần lớn các lỗ hổng SQLi một cách nhanh chóng và đáng tin cậy bằng cách sử dụng **Burp Scanner**.

## SQLi ở các phần khác nhau của câu truy vấn

Phần lớn lỗ hổng SQLi xảy ra trong mệnh đề `WHERE` của câu truy vấn `SELECT`. Phần lớn các tester có kinh nghiệm đều quen thuộc với kiểu SQLi này.

Tuy nhiên, lỗ hổng SQLi có thể xảy ra ở bất kỳ vị trí nào trong câu truy vấn, và ở trong những kiểu truy vấn khác nhau. Một số vị trí phổ biến mà SQLi thường xuất hiện gồm:

* Trong câu `UPDATE` , bên trong những giá trị được update hoặc mệnh đề `WHERE`.
* Trong câu `INSERT`, bên trong những giá trị được thêm vào.
* Trong câu `SELECT`, bên trong bảng hoặc tên cột.
* Trong câu `SELECT`, bên trong mệnh đề `ORDER BY`.

## Các ví dụ về SQL injection

Có nhiều lỗ hổng, phương thức tấn công và kỹ thuật **SQL injection** xảy ra trong các tình huống khác nhau. Một vài ví dụ phổ biến về **SQL injection** bao gồm:

* **Retrieving hidden data** (lấy dữ liệu ẩn): ta có thể sửa đổi câu truy vấn SQL để trả về thêm các kết quả mà mình mong muốn.
* **Subverting application logic** (làm sai lệch logic ứng dụng): ta có thể thay đổi câu truy vấn để can thiệp vào logic xử lý của ứng dụng.
* **UNION attacks** (tấn công `UNION`): ta có thể truy xuất dữ liệu từ các bảng khác nhau trong database bằng `UNION`.
* **Blind SQL injection** (SQL injection túi mù): kết quả của câu truy vấn do ta điều khiển không được trả trực tiếp trong phản hồi của ứng dụng, nên phải suy luận thông tin từ những hành vi/độ trễ/phản hồi gián tiếp để tìm kiếm lỗ hổng.

## Retrieving hidden data (lấy dữ liệu ẩn)

Hãy tưởng tượng một ứng dụng shopping đang hiển thị những sản phẩm với nhiều thể loại khác nhau. Khi user click vào mục loại **Gifts**, trình duyệt của họ sẽ gửi requests URL:

```http
https://insecure-website.com/products?category=Gifts
```

Điều này khiến ứng dụng tạo ra một truy vấn SQL để lấy chi tiết về những sản phẩm có liên quan từ database:

```sql
SELECT * FROM products WHERE category = 'Gifts' AND released = 1
```

Câu truy vấn trên yêu cầu database phải trả về:

* `*`: Lấy tất cả các cột
* `FROM products` : Từ bảng products
* `WHERE category = 'Gifts' AND released = 1` : những hàng mà ở đó cột `category` là 'Gifts' và cột `released` là 1.

Điều kiện `released = 1`  được sử dụng để ẩn đi những sản phẩm vẫn chưa phát hành nếu ta thiết kế những sản phẩm chưa phát hành sẽ có `released = 0` .

Dễ thấy ứng dụng không thực hiện bất kỳ biện pháp nào để phòng thủ những cuộc tấn công SQLi. Điều này có nghĩa là attacker có thể xây dựng một cuộc tấn công như ví dụ sau:

```http
https://insecure-website.com/products?category=Gifts'--
```

Điều này tạo ra câu truy vấn SQL sau:

```sql
SELECT * FROM products WHERE category = 'Gifts'--' AND released = 1
```

Cách điền entry point này ta dễ dàng có thể thấy câu truy vấn SQL đã trở thành:

```sql
SELECT * FROM products WHERE category = 'Gifts'
```

và phần còn lại:

```sql
--' AND released = 1
```

đã trở thành một đoạn chú thích (chú thích trong SQL cú pháp là `--chú thích`). Kết quả mọi sản phẩm đều được hiển thị kể cả những sản phẩm chưa phát hành (vì điều kiện ràng buộc đã bị mất).

Một ví dụ nữa tương tự nhưng có thể khiến ứng dụng hiển thị tất cả sản phẩm ở mọi `category` kể cả những `category` bị ẩn:

```http
https://insecure-website.com/products?category=Gifts'+OR+1=1--
```

Điều này sẽ tạo ra câu truy vấn SQL sau:

```sql
SELECT * FROM products WHERE category = 'Gifts' OR 1=1--' AND released = 1
```

Câu truy vấn này sẽ trả về thông tin tất cả các cột của tất cả những sản phẩm có `category = 'Gifts'` , sau đó vì có thêm điều kiện `OR 1=1` , vì 1 = 1 luôn luôn đúng nên câu truy vấn sẽ trả về tất cả những sản phẩm có trong bảng products.

> Cẩn thận khi tiêm điều kiện OR 1=1 vào câu truy vấn SQL. Ngay cả khi nó dường như vô hại trong trường hợp đang tiêm vào, nhưng trong một số trường hợp các ứng dụng sử dụng dữ liệu từ một yêu cầu cho nhiều truy vấn khác nhau, nếu điều kiện tiêm vào được sử dụng trong các câu truy vấn `UPDATE` hay `DELETE` , nó sẽ gây mất mát dữ liệu hoặc gây ra những điều không mong muốn khác.

## Subverting application logic (làm sai lệch logic của ứng dụng)

Giả sử một ứng dụng cho phép các user đăng nhập bằng username và password. Nếu một user submits username là `wiener` và password là `bluecheese`, ứng dụng sẽ kiểm tra thông tin bằng cách thực hiện truy vấn SQL sau:

```sql
SELECT * FROM users WHERE username = 'wiener' AND password = 'bluecheese'
```

Nếu câu truy vấn này trả về thông tin chi tiết của user thì login thành công, ngược lại thì sẽ login thất bại.

Trong trường hợp này, attacker có thể login vào như một user bình thường mà không cần mật khẩu. Có thể dùng — để xóa phần kiểm tra password trong mệnh đề `WHERE` bằng cách biến nó thành phần chú thích trong cầu truy vấn. Ví dụ, nhập tên người dùng là `administrator'—` và để trống mật khẩu thì ứng dụng sẽ tạo ra câu truy vấn sau:

```sql
SELECT * FROM users WHERE username = 'administrator'--' AND password = ''
```

Truy vấn này sẽ trả về thông tin tài khoản có username là `administrator` và đăng nhập thành công vào tài khoản của user này.

## Retrieving data from other database tables (Lấy dữ liệu từ các bảng  khác trong database) <a href="#retrieving-data-from-other-database-tables" id="retrieving-data-from-other-database-tables"></a>

Trong những trường hợp mà ứng dụng phản hồi lại bằng kết quả của một câu truy vấn SQL, attacker có thể sử dụng lỗ hỏng SQLi để lấy data từ các bản khác trong database. Ta có thể sử dụng từ khóa `UNION` để thực thi thêm truy vấn `SELECT` và nối các kết quả này vào truy vấn ban đầu.

Ví dụ, nếu ứng dụng thực thi câu truy vấn chứa input user là `Gifts` như sau:

```sql
SELECT name, description FROM products WHERE category = 'Gifts'
```

Attacker có thể gửi input:

```sql
' UNION SELECT username, password FROM users--
```

câu truy vấn trở thành

```sql
SELECT name, description 
FROM products 
WHERE category = '' 
UNION SELECT username, password 
FROM users--
```

Lúc này ứng dụng sẽ trả về tất cả usernames và passwords cùng với tên và mô tả của mọi sản phẩm.

### Tấn cống SQL Injection UNION như thế nào?

Khi một ứng dụng có lỗ hỏng **SQL injection**, và kết quả của truy vấn được trả về trong các response của ứng dụng, ta có thể sử dụng từ khóa `UNION` để truy xuất dữ liệu từ các bảng khác trong database. Việc này thường được gọi là **SQL injection UNION attack**.

Từ khóa `UNION` cho phép ta có thể thực thi thêm một hoặc nhiều truy vấn `SELECT` và nối kết quả này vào truy vấn ban đầu. Ví dụ:

```sql
SELECT a, b FROM table1 UNION SELECT c, d FROM table2
```

Truy vấn SQL này sẽ trả về một tập kết quả duy nhất gồm 2 cột , chứa giá trị từ cột `a` và `b` trong `table1` và cột `c` và `d` trong `table2`.

Để truy vấn `UNION` hoạt động, có 2 yêu cầu chính bắt buộc phải đáp ứng:

* Các truy vấn con riêng lẻ (individual queries) phải trả về **cùng số cột**.
* Kiểu dữ liệu của một cột phải tương thích nhau giữa các truy vấn con riêng lẻ.

Hay có thể gọi là 2 bảng khi `UNION` phải khả hợp nhau.

Ví dụ 1:

```sql
SELECT id, username
FROM users
WHERE id = 1
UNION
SELECT id, email
FROM admins
WHERE id = 1;
```

Ở ví dụ này cả 2 truy vấn đều trả về 2 cột và mỗi cột của mỗi truy vấn tương ứng với nhau đều cùng kiểu dữ liệu (cột 1 là INT và cột 2 là VARCHAR).&#x20;

Ví dụ 2:

```sql
SELECT id, username
FROM users
WHERE id = 1
UNION
SELECT id, email, created_at
FROM admins
WHERE id = 1;
```

Ví dụ này sẽ báo lỗi vì bảng 1 trả về 2 cột mà bảng 2 trả về 3 cột. Cũng tương tự nếu như cùng số cột nhưng khác nhau hoặc không tương thích nhau về kiểu dữ liệu với từng cột tương ứng nhau thì cũng có thể gây ra lỗi hoặc kết quả không mong muốn.

Để thực hiện một cuộc tấn công **SQLi UNION**, phải chắc chắn rằng đã đáp ứng được hai yêu cầu này:

* Có bao nhiêu cột được trả về từ query ban đầu.
* Những cột nào được trả về từ truy vấn ban đầu có kiểu dữ liệu phù hợp để chứa kết quả từ query injected vào.

### Xác định số cột cần thiết&#x20;

Khi thực hiện một cuộc tấn công SQL injection UNION, có phương pháp hiệu quả để xác định có bao nhiêu cột được trả về từ truy vấn ban đầu.

Một phương pháp là tiêm một chuỗi lần lượt các mệnh đề `ORDER BY` và tăng chỉ số cột được chỉ định cho tới khi xuất hiện lỗi. Ví dụ, nếu điểm tiêm (injection point) là một chuỗi được đặt trong dấu nháy trong mệnh đề `WHERE` của truy vấn gốc thì ta có thể submit:

```sql
' ORDER BY 1--
' ORDER BY 2--
' ORDER BY 3--
...
```

Dãy payload này sửa đổi truy vấn gốc để sắp xếp kết quả theo các cột khác nhau trong tập kết quả. Trong `ORDER BY` ta có thể chỉ định cột bằng **index**, vì vậy ta không cần biết tên các cột. Khi chỉ số cột được chỉ định vượt quá số cột thực tế trong result set, database sẽ trả về lỗi, như:

```sql
The ORDER BY position number 3 is out of range of the number of items in the select list.
```

Ứng dụng có thể trả về trực tiếp thông báo lỗi của cơ sở dữ liệu trong HTTP response, nhưng cũng có thể trả về một phản hồi lỗi chung chung. Trong một số trường hợp, nó có thể đơn giản là không trả về bất kỳ kết quả nào. Dù bằng cách nào, miễn là ta có thể phát hiện được những sự khác biệt trong phản hồi thì ta có thể suy ra được có bao nhiêu cột sẽ được trả về trong truy vấn.

Phương pháp thứ 2 là gửi một chuỗi các payload `UNION SELECT` với số lượng chỉ định giá trị `NULL` khác nhau, ví dụ:

```sql
' UNION SELECT NULL--
' UNION SELECT NULL,NULL--
' UNION SELECT NULL,NULL,NULL--
...
```

Nếu số lượng `NULL` không khớp với số cột, database sẽ trả về lỗi, ví dụ:

```sql
All queries combined using a UNION, INTERSECT or EXCEPT operator must have an equal number of expressions in their target lists.
```

Chúng ta sử dụng `NULL` làm giá trị trả về từ truy vấn `SELECT` bị injection vì các kiểu dữ liệu trong từng cột của truy vấn gốc phải tương thích với kiểu dữ liệu trong từng cột của truy vấn được tiêm vào. Và ta dùng `NULL` vì `NULL` có khá năng chuyển đổi để tương thích với phần lớn các kiểu dữ liệu phổ biến, nên nó tối đa hóa khả năng payload thành công khi đếm đúng số cột.

Tương tự kỹ thuật `ORDER BY`, ứng dụng có thể trả về lỗi database trong HTTP response, hoặc trả về lỗi chung chung, hoặc đơn giản là không trả kết quả. Khi số lượng `NULL` khớp với số cột, cơ sở dữ liệu sẽ trả về một hàng bổ sung chứa toàn bộ `NULL` ở mọi cột trong result set. Ảnh hưởng lên HTTP response phụ thuộc vào mã nguồn ứng dụng. Nếu may mắn, bạn sẽ thấy nội dung bổ sung trong phản hồi, như là một hàng thêm trong bảng HTML. Nếu không, các giá trị `NULL` có thể kích hoạt các lỗi khác (ví dụ `NullPointerException`). Trường hợp tệ nhất, response có thể trả về trông giống như khi số lượng `NULL` không đúng, điều này làm cho phương pháp này kém hiệu quả.

### Database-specific syntax <a href="#database-specific-syntax" id="database-specific-syntax"></a>

Ở Oracle, mọi truy vấn `SELECT` đều phải sử dụng từ khóa `FROM` và chỉ định định đến một bảng xác định. Có một bảng tích hợp sẵn trong Oracle được gọi là `DUAL` có thể được dùng cho mục đích này.  Do đó các injection query trên Oracle sẽ cần giống như sau:

```sql
' UNION SELECT NULL FROM DUAL--
```

Các payload mô tả ở trên dùng chuỗi chú thích là hai dấu gạch `--` để chú thích phần còn lại của truy vấn gốc sau injection point. Trên **MySQL**, chuỗi `--` phải được theo sau bởi một dấu cách. Ngoài ra, ký tự `#` cũng có thể được dùng để bắt đầu cho chú thích.

Để biết thêm chi tiết về các database-specific syntax ở các DBMS khác nhau, xem thêm [SQL injection cheat sheet](https://portswigger.net/web-security/sql-injection/cheat-sheet).

### Tìm các cột có kiểu dữ liệu có ích

Một cuộc tấn công **SQLi UNION** cho phép ta truy xuất kết quả từ truy vấn được tiêm. Các dữ liệu mà ta muốn lấy thường ở dạng string, điều này có nghĩa là ta cần tìm một hoặc nhiều cột trong các kết quả truy vấn gốc có kiểu dữ liệu là string hoặc tương thích được với string.

Sau khi xác định được số cột cần thiết, ta có thể thăm dò từng cột để kiểm tra xem cột đó có thể chứa dữ liệu string hay không bằng cách ta sẽ gửi một loạt payload `UNION SELECT` và đặt một giá trị dạng string vào từng cột lần lượt. Ví dụ, nếu truy vấn trả về bốn cột, ta sẽ gửi:

```sql
' UNION SELECT 'a',NULL,NULL,NULL--
' UNION SELECT NULL,'a',NULL,NULL--
' UNION SELECT NULL,NULL,'a',NULL--
' UNION SELECT NULL,NULL,NULL,'a'--
```

Nếu kiểu dữ liệu cột không tương thích với kiểu dữ liệu string, truy vấn tiêm vào sẽ gây ra lỗi database, ví dụ:

```sql
Conversion failed when converting the varchar value 'a' to data type int.
```

Nếu không có lỗi nào xảy ra, và response của ứng dụng chứa các nội dung thêm vào bao gồm giá trị string được tiêm, thì cột mà ta cố tình chèn giá trị string phù hợp để dùng nhằm truy xuất dữ liệu chuỗi.

### Sử dụng một cuộc tấn công SQLi UNION để lấy dữ liệu

Khi ta xác định được số cột được trả về của truy vấn gốc và tìm thấy cột nào chứa data dạng string, lúc này ta đã xác định được ví dụ chứa các dữ liệu hay ho.

Giả sử rằng:

* Truy vấn gốc trả về 2 cột, cả 2 đều chứa string data
* Injection point là một chuỗi được trích dẫn trong mệnh đề WHERE.
* Database chứa một bảng được gọi là `users` với các cột là `username` và `password`&#x20;

Trong ví dụ này, ta có thể lấy nội dung của bảng `users` bằng cách gửi input như sau:

```sql
' UNION SELECT username, password FROM users--
```

Để thực hiện cuộc tấn công này, ta cần biết rằng có một bảng tên là `users` có hai cột là `username` và `password`. Nếu không có thông tin này, ta sẽ phải đoán tên các bảng và cột. Tất cả các hệ quản trị cơ sở dữ liệu hiện đại đều cung cấp cách để kiểm tra cấu trúc database và xác định những bảng cùng cột mà chúng chứa.

### Lấy đồng thời nhiều giá trị trong một cột

Trong một số trường hợp, truy vấn trong ví dụ trước chỉ trả về **một cột** duy nhất.

Ta có thể lấy nhiều giá trị cùng lúc trong **một cột** đó bằng cách nối chuỗi (concatenate) các giá trị lại với nhau. ta có thể chèn thêm một ký tự phân cách để dễ phân biệt các giá trị được ghép vào. Ví dụ, trên **Oracle**:

```sql
' UNION SELECT username || '~' || password FROM users--
```

Ở đây dùng chuỗi hai dấu gạch `||` (toán tử string concatenation trên Oracle). Truy vấn bị injection sẽ nối giá trị của `username` và `password` lại với nhau và ngăn cách chúng bởi ký tự `~`.

Kết quả:

```sql
...
administrator~s3cure
wiener~peter
carlos~montoya
...

```

Các DBMS khác nhau dùng cú pháp nối chuỗi khác nhau, xem ở  [SQL injection cheat sheet](https://portswigger.net/web-security/sql-injection/cheat-sheet).

## Lỗ hổng Blind SQL injection

Trong nhiều trường hợp **SQL injection** là **blind vulnerabilities** (lỗ hổng mù). Điều này nghĩa là ứng dụng không trả bất kỳ kết quả nào của truy vấn SQL hay chi tiết về các lỗi database trong phản hồi.&#x20;

Nhiều kỹ thuật như tấn công `UNION` không có hiệu quả đối với blind SQLi. Điều này là do chúng dựa vào việc xem kết quả của truy vấn được tiêm vào trong các phản hồi của ứng dụng. Blind vulnerabilities vẫn có thể bị khai thác để truy cập dữ liệu nhạy cảm trái phép, nhưng các kỹ thuật liên quan phải dùng thường phức tạp và khó thực hiện hơn.

Các kỹ thuật sau có thể được dùng để khai thác blind SQL injection, tuỳ theo bản chất lỗ hổng và hệ quản trị cơ sở dữ liệu:

* Ta có thể thay đổi logic của truy vấn để gây nên một khác biệt có thể phát hiện trong phản hồi của ứng dụng, tùy thuộc vào true/false của một điều kiện đơn. Việc này có thể bao gồm chèn một điều kiện mới vào logic boolean, hoặc có điều kiện gây ra một lỗi (ví dụ **divide-by-zero** — chia cho 0).
* Ta có thể có điều kiện kích hoạt **time delay** trong xử lý truy vấn. Điều này cho phép ta có thể suy luận tính đúng/sai của điều kiện dựa trên thời gian ứng dụng trả về.
* Ta có thể gây ra một tương tác mạng **out-of-band** bằng kỹ thuật **OAST** (Out-Of-Band Application Security Testing). Kỹ thuật này rất mạnh và hiệu quả trong những tình huống mà các kỹ thuật khác không thực hiện được. Thường thì ta có thể trực tiếp exfiltrate dữ liệu qua kênh out-of-band. Ví dụ, đặt dữ liệu vào một DNS lookup tới một domain do ta kiểm soát.

### Khai thác blind SQL injection bằng cách gây phản hồi có điều kiện

Hãy xem xét một ứng dụng sử dụng tracking cookies để thu thập dữ liệu phân tích về việc sử dụng. Các requests gửi đến ứng dụng bao gồm một header Cookie như sau:

`Cookie: TrackingId=u5YD3PapBcR4lN3e7Tj4`

Khi một request chứa cookie `TrackingId` được xử lý, ứng dụng sử dụng một truy vấn SQL để xác định xem đây có phải là người dùng đã được nhận diện hay không:

```sql
SELECT TrackingId FROM TrackedUsers WHERE TrackingId = 'u5YD3PapBcR4lN3e7Tj4'
```

Truy vấn này dính lỗ hổng SQL injection, nhưng kết quả từ truy vấn không được trả về cho user. Tuy nhiên, ứng dụng có phản ứng khác nhau tùy thuộc vào việc truy vấn có trả về dữ liệu hay không. Nếu ta gửi một `TrackingId` đã được nhận diện, truy vấn sẽ trả về dữ liệu và ta sẽ nhận được thông điệp "Welcome back" trong message response.

Hành vi này là đủ để có thể khai thác lỗ hổng blind SQL injection. Ta có thể truy xuất thông tin bằng cách kích hoạt các phản hồi khác nhau một cách có điều kiện, tùy thuộc vào injected condition.

Để hiểu cách khai thác này hoạt động, giả sử có hai yêu cầu được gửi đi chứa các giá trị cookie `TrackingId` lần lượt như sau:

`…xyz' AND '1'='1` `…xyz' AND '1'='2`

* Giá trị đầu tiên khiến truy vấn trả về kết quả, bởi vì điều kiện được chèn vào `AND '1'='1` là đúng (true). Kết quả là, thông điệp "Welcome back" được hiển thị.
* Giá trị thứ hai khiến truy vấn không trả về bất kỳ kết quả nào, bởi vì điều kiện được chèn vào là sai (false). Thông điệp "Welcome back" không được hiển thị.

Điều này cho phép chúng ta xác định câu trả lời cho bất kỳ điều kiện đơn lẻ nào được chèn vào, và trích xuất dữ liệu từng phần một.

Ví dụ, giả sử có một bảng tên là `Users` với các cột `Username` và `Password`, và một người dùng tên là `Administrator`. Bạn có thể xác định mật khẩu cho người dùng này bằng cách gửi một chuỗi các đầu vào (inputs) để kiểm tra mật khẩu từng ký tự một.

Để thực hiện việc này, hãy bắt đầu với đầu vào sau:

```sql
xyz' AND SUBSTRING((SELECT Password FROM Users WHERE Username = 'Administrator'), 1, 1) > 'm
```

Đầu vào này trả về thông điệp "Welcome back", chỉ ra rằng điều kiện được chèn vào là đúng (true), và do đó ký tự đầu tiên của mật khẩu lớn hơn `m`.

Tiếp theo, chúng ta gửi đầu vào sau:

```sql
xyz' AND SUBSTRING((SELECT Password FROM Users WHERE Username = 'Administrator'), 1, 1) > 't
```

Đầu vào này không trả về thông điệp "Welcome back", chỉ ra rằng điều kiện được chèn vào là sai (false), và do đó ký tự đầu tiên của mật khẩu không lớn hơn `t`.

Cuối cùng, chúng ta gửi đầu vào sau, và nó trả về thông điệp "Welcome back", qua đó xác nhận rằng ký tự đầu tiên của mật khẩu là `s`:

```sql
xyz' AND SUBSTRING((SELECT Password FROM Users WHERE Username = 'Administrator'), 1, 1) = 's
```

Chúng ta có thể tiếp tục quá trình này để xác định một cách có hệ thống mật khẩu đầy đủ cho người dùng `Administrator`.

> Lưu ý Hàm `SUBSTRING` được gọi là `SUBSTR` trên một số loại cơ sở dữ liệu.

### Error-based SQL injection (SQL injection dựa trên lỗi)

Error-based SQL injection đề cập đến các trường hợp mà ta có thể sử dụng các thông báo lỗi để trích xuất hoặc suy luận dữ liệu nhạy cảm từ cơ sở dữ liệu, ngay cả trong các ngữ cảnh blind. Các khả năng khai thác phụ thuộc vào cấu hình của cơ sở dữ liệu và các loại lỗi mà ta có thể kích hoạt:

* Ta có thể khiến ứng dụng return một response lỗi cụ thể dựa trên kết quả của một biểu thức boolean. Ta có thể khai thác điều này theo cách tương tự như các conditional responses mà chúng ta đã xem xét ở phần trước. Để biết thêm thông tin, hãy xem _Exploiting blind SQL injection by triggering conditional errors_ (Khai thác blind SQL injection bằng cách kích hoạt các lỗi có điều kiện).
* Bạn có thể kích hoạt các thông báo lỗi hiển thị (output) dữ liệu được trả về bởi truy vấn. Điều này thực sự biến các lỗ hổng SQL injection vốn dĩ là blind trở thành các lỗ hổng visible (có thể nhìn thấy kết quả). Để biết thêm thông tin, hãy xem tiếp phần dưới đây.

### Khai thác blind SQL injection bằng cách kích hoạt các lỗi có điều kiện

Một số ứng dụng thực thi các truy vấn SQL nhưng hành vi của chúng không thay đổi (không có dấu hiệu nhận biết câu truy vấn được thực thi hay không), bất kể truy vấn đó có trả về dữ liệu hay không. Kỹ thuật trong phần trước sẽ không thể hoạt động vì việc chèn các điều kiện boolean khác nhau không tạo ra sự khác biệt nào đối với phản hồi của ứng dụng.

Thường có thể khiến ứng dụng trả về một phản hồi khác tùy thuộc vào việc lỗi SQL có xảy ra hay không. Ta có thể sửa đổi truy vấn để nó gây ra lỗi database chỉ khi điều kiện là đúng (true). Rất thường xuyên, một lỗi không được xử lý (unhandled error) do database ném ra sẽ gây ra sự khác biệt trong phản hồi của ứng dụng, chẳng hạn như một thông báo lỗi. Điều này cho phép bạn suy luận tính đúng sai của điều kiện được chèn vào.

Để xem cách này hoạt động như thế nào, giả sử có hai yêu cầu được gửi đi chứa các giá trị cookie `TrackingId` lần lượt như sau:

```sql
xyz123' AND (SELECT CASE WHEN (1=2) THEN 1/0 ELSE 'a' END)='a
```

và

```sql
xyz123' AND (SELECT CASE WHEN (1=1) THEN 1/0 ELSE 'a' END)='a
```

Các đầu vào này sử dụng từ khóa `CASE` để kiểm tra một điều kiện và trả về một biểu thức khác nhau tùy thuộc vào việc biểu thức đó có đúng hay không:

* Với đầu vào đầu tiên, biểu thức `CASE` trả về giá trị là `'a'`, điều này không gây ra bất kỳ lỗi nào.
* Với đầu vào thứ hai, nó trả về giá trị là `1/0`, điều này gây ra lỗi chia cho 0 (divide-by-zero error).

Nếu lỗi này gây ra sự khác biệt trong phản hồi HTTP của ứng dụng, ta có thể sử dụng điều này để xác định xem điều kiện được chèn vào có đúng (true) hay không.

Sử dụng kỹ thuật này, ta có thể truy xuất dữ liệu bằng cách kiểm tra từng ký tự một:

```sql
xyz' AND (SELECT CASE WHEN (Username = 'Administrator' AND SUBSTRING(Password, 1, 1) > 'm') THEN 1/0 ELSE 'a' END FROM Users)='a
```

### Trích xuất dữ liệu nhạy cảm thông qua các thông báo lỗi SQL chi tiết

Việc cấu hình sai cơ sở dữ liệu đôi khi dẫn đến các thông báo lỗi chi tiết (verbose error messages). Những thông báo này có thể cung cấp thông tin hữu ích cho attacker là chúng ta. Ví dụ, hãy xem xét thông báo lỗi xuất hiện sau khi chèn một dấu nháy đơn vào tham số `id` sau đây

```sql
Unterminated string literal started at position 52 in SQL SELECT * FROM tracking 
WHERE id = '''. Expected char
```

Thông báo này hiển thị toàn bộ câu truy vấn mà ứng dụng đã xây dựng bằng cách sử dụng (input) của chúng ta. Chúng ta có thể thấy rằng trong trường hợp này, chúng ta đang injecting) vào một chuỗi được bao bởi dấu nháy đơn bên trong một mệnh đề `WHERE`. Điều này giúp việc xây dựng một truy vấn hợp lệ chứa payload độc hại trở nên dễ dàng hơn. Việc vô hiệu hóa (commenting out) phần còn lại của truy vấn sẽ ngăn dấu nháy đơn thừa phá vỡ cú pháp.

Thỉnh thoảng, bạn có thể khiến ứng dụng tạo ra một thông báo lỗi chứa một phần dữ liệu được trả về bởi truy vấn. Điều này thực sự biến một lỗ hổng blind SQL injection (vốn dĩ mù) trở thành một lỗ hổng visible (có thể nhìn thấy dữ liệu).

Bạn có thể sử dụng hàm `CAST()` để đạt được điều này. Nó cho phép bạn chuyển đổi từ kiểu dữ liệu này sang kiểu dữ liệu khác. Ví dụ, hãy tưởng tượng một truy vấn chứa câu lệnh sau:

```sql
CAST((SELECT example_column FROM example_table) AS int)
```

Thông thường, dữ liệu mà bạn đang cố đọc là một chuỗi (string). Việc cố gắng chuyển đổi dữ liệu này sang một kiểu dữ liệu không tương thích, chẳng hạn như `int`, có thể gây ra lỗi tương tự như sau:

```sql
ERROR: invalid input syntax for type integer: "Example data"
```

Loại truy vấn này cũng có thể hữu ích nếu giới hạn ký tự (character limit) ngăn cản bạn kích hoạt các phản hồi có điều kiện (conditional responses).

### Khai thác blind SQL injection bằng cách kích hoạt độ trễ thời gian

Nếu ứng dụng bắt các lỗi cơ sở dữ liệu khi truy vấn SQL được thực thi và xử lý chúng một cách khéo léo (gracefully), sẽ không có bất kỳ sự khác biệt nào trong phản hồi của ứng dụng. Điều này có nghĩa là kỹ thuật trước đó về việc kích hoạt các lỗi có điều kiện (conditional errors) sẽ không hoạt động.

Trong tình huống này, thường có thể khai thác lỗ hổng blind SQL injection bằng cách kích hoạt độ trễ thời gian tùy thuộc vào việc điều kiện được chèn vào là đúng hay sai. Vì các truy vấn SQL thường được ứng dụng xử lý một cách đồng bộ (synchronously), việc làm chậm quá trình thực thi của một truy vấn SQL cũng sẽ làm chậm phản hồi HTTP. Điều này cho phép bạn xác định tính đúng đắn của điều kiện được chèn vào dựa trên thời gian cần thiết để nhận được phản hồi HTTP.

Các kỹ thuật để kích hoạt độ trễ thời gian là đặc thù cho từng loại cơ sở dữ liệu đang được sử dụng. Ví dụ, trên Microsoft SQL Server, bạn có thể sử dụng câu lệnh sau để kiểm tra một điều kiện và kích hoạt độ trễ tùy thuộc vào việc biểu thức có đúng hay không:

```sql
'; IF (1=2) WAITFOR DELAY '0:0:10'--
'; IF (1=1) WAITFOR DELAY '0:0:10'--
```

* Đầu vào đầu tiên trong số này không kích hoạt độ trễ, bởi vì điều kiện `1=2` là sai (false).
* Đầu vào thứ hai kích hoạt một độ trễ 10 giây, bởi vì điều kiện `1=1` là đúng (true).

Sử dụng kỹ thuật này, chúng ta có thể truy xuất dữ liệu bằng cách kiểm tra từng ký tự một:

```sql
'; IF (SELECT COUNT(Username) FROM Users WHERE Username = 'Administrator' AND SUBSTRING(Password, 1, 1) > 'm') = 1 WAITFOR DELAY '0:0:{delay}'--
```

Tuy nhiên, trong thực tế Pentest, ta sẽ gặp các DB khác và cú pháp gây trễ (sleep) của chúng hoàn toàn khác nhau:

* MySQL: Dùng hàm `SLEEP(seconds)`. Ví dụ: `AND SLEEP(10)--`
* PostgreSQL: Dùng hàm `pg_sleep(seconds)`. Ví dụ: `|| pg_sleep(10)--`
* Oracle: Phức tạp hơn, thường dùng `dbms_pipe.receive_message`.

Payload cho PostgreSQL:

```sql
TrackingId=9mgI0RmQp4MOzCZl' AND (CASE WHEN (1=1) THEN (SELECT 1 FROM pg_sleep(10)) ELSE 1 END) = 1--
```

## Second-order SQL injection (bậc 2)

## Kiểm tra database

## SQL injection trong các bối cảnh khác nhau

## Làm thế nào để ngăn chặn SQL injection