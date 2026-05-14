---
title: "3.1 - Access control vulnerabilities and privilege escalation"
date: 2026-05-14
category: "Tutorial"
series: "ACCESS CONTROL"
seriesOrder: 3
tags: []
draft: false
---

## Access Control là gì?

Access control (kiểm soát truy cập) là việc áp dụng các ràng buộc lên ai hoặc cái gì được ủy quyền thực hiện các hành động hoặc truy cập tài nguyên. Trong ngữ cảnh của các ứng dụng web, kiểm soát truy cập phụ thuộc vào authentication và session management:

* Authentication xác nhận rằng người dùng đúng là người mà họ đã tuyên bố.
* Session management (quản lý phiên) xác định các HTTP requests nào tiếp theo đang được thực hiện bởi cùng một người dùng đó.
* Access control xác định xem người dùng có được phép thực hiện hành động mà họ đang cố gắng thực hiện hay không (đúng với phân quyền của user). Ví dụ trong 1 trang web mạng xã hội thì admin có quyền thêm, xóa người dùng thông thường, người dùng thông thường chỉ có quyền xem, bình luận hay đăng bài,...

Broken access controls (Kiểm soát truy cập bị hỏng/lỗi) rất phổ biến và thường thể hiện một lỗ hổng bảo mật nghiêm trọng. Việc thiết kế và quản lý các kiểm soát truy cập là một vấn đề phức tạp và luôn thay đổi, áp dụng các ràng buộc về kinh doanh, tổ chức và pháp lý vào một triển khai kỹ thuật. Các quyết định thiết kế kiểm soát truy cập phải được đưa ra bởi con người và mắt xích con người thường sẽ có tiềm năng xảy ra lỗi là rất cao để khai thác.

### Vertical access controls (Kiểm soát truy cập theo chiều dọc)

Vertical access controls là các cơ chế hạn chế quyền truy cập vào các chức năng nhạy cảm hoặc riêng biệt cho các loại người dùng cụ thể hay còn gọi là phân quyền người dùng.

Với vertical access controls, các loại người dùng khác nhau có quyền truy cập vào các chức năng khác nhau trong ứng. Ví dụ, một administrator có thể sửa đổi hoặc xóa bất kỳ tài khoản người dùng nào, trong khi một người dùng bình thường không có quyền truy cập vào các hành động này. Vertical access controls có thể là các triển khai chi tiết hơn của các mô hình bảo mật được thiết kế để thực thi các chính sách kinh doanh như separation of duties (phân tách nhiệm vụ) và least privilege (đặc quyền tối thiểu). Khai thác lỗ hổng này thường được gọi là privilege escalation (leo thang đặc quyền)

### Horizontal access controls (Kiểm soát truy cập theo chiều ngang)

Horizontal access controls là các cơ chế hạn chế quyền truy cập tài nguyên cho các người dùng cụ thể.

Với horizontal access controls, các người dùng khác nhau có quyền truy cập vào một tập hợp con các tài nguyên cùng loại. Ví dụ, một ứng dụng ngân hàng sẽ cho phép người dùng xem giao dịch và thực hiện thanh toán từ tài khoản của chính họ, nhưng không phải từ tài khoản của bất kỳ người dùng nào khác. Lỗ hổng ở phần này thường dẫn đến lỗ hổng nghiêm trọng khác là IDOR (Insecure Direct Object References)

### Context-dependent access controls (Kiểm soát truy cập phụ thuộc vào ngữ cảnh)

Context-dependent access controls hạn chế quyền truy cập vào chức năng và tài nguyên dựa trên trạng thái của ứng dụng hoặc tương tác của người dùng với nó.

Context-dependent access controls ngăn người dùng thực hiện các hành động sai trình tự. Ví dụ, một trang web bán lẻ có thể ngăn người dùng sửa đổi nội dung giỏ hàng sau khi họ đã thực hiện thanh toán.

## Examples of broken access controls (Các ví dụ về kiểm soát truy cập bị hỏng)

Các lỗ hổng kiểm soát truy cập bị hỏng (Broken access control vulnerabilities) tồn tại khi một người dùng có thể truy cập tài nguyên hoặc thực hiện các hành động mà lẽ ra họ không được phép làm.

### Vertical privilege escalation (Leo thang đặc quyền theo chiều dọc)

Nếu một người dùng có thể giành quyền truy cập vào chức năng mà họ không được phép truy cập, thì đây là vertical privilege escalation. Ví dụ, nếu một người dùng không có quyền quản trị có thể truy cập vào trang quản trị (admin page) nơi họ có thể xóa tài khoản người dùng, thì đây là leo thang đặc quyền dọc.

#### Unprotected functionality (Chức năng không được bảo vệ)

Ở dạng cơ bản nhất, leo thang đặc quyền dọc nảy sinh ở nơi mà ứng dụng không thực thi bất kỳ biện pháp bảo vệ nào cho các chức năng nhạy cảm. Ví dụ, các chức năng quản trị có thể được liên kết (gắn link) từ trang chào mừng của quản trị viên nhưng không có trên trang chào mừng của người dùng thường. Tuy nhiên, một người dùng vẫn có thể truy cập các chức năng quản trị này bằng cách duyệt trực tiếp tới URL admin liên quan.

Ví dụ, một trang web có thể lưu trữ chức năng nhạy cảm tại URL sau:&#x20;

```http
https://insecure-website.com/admin
```

URL này có thể truy cập được bởi bất kỳ người dùng nào, không chỉ riêng những người dùng quản trị - những người có đường dẫn đến chức năng này trong giao diện người dùng của họ.

Trong một số trường hợp, URL quản trị có thể bị tiết lộ ở các vị trí khác, chẳng hạn như trong tệp `robots.txt`:

```http
https://insecure-website.com/robots.txt
```

Ngay cả khi URL không bị tiết lộ ở bất cứ đâu, kẻ tấn công vẫn có thể sử dụng một danh sách từ khóa thường đặt cho trang quản trị (wordlist) để brute-force các trang nhạy cảm này.

#### **Security by obscurity trong kiểm soát truy cập**

Trong một số trường hợp, các chức năng nhạy cảm được che giấu bằng cách gán cho nó một URL khó đoán (less predictable URL). Đây là một ví dụ của cái gọi là "security by obscurity" (bảo mật bằng sự che giấu). Tuy nhiên, việc ẩn giấu chức năng nhạy cảm không cung cấp khả năng kiểm soát truy cập hiệu quả vì người dùng có thể khám phá ra URL đã bị làm mờ (obfuscated URL) theo nhiều cách khác nhau.

Hãy tưởng tượng một ứng dụng lưu trữ các chức năng quản trị tại URL sau:&#x20;

```
https://insecure-website.com/administrator-panel-yb556
```

URL này có thể không bị kẻ tấn công đoán ra một cách trực tiếp. Tuy nhiên, ứng dụng vẫn có thể làm rò rỉ (leak) URL đó cho người dùng. URL có thể bị tiết lộ trong mã JavaScript có nhiệm vụ xây dựng giao diện người dùng dựa trên vai trò (role) của người dùng:

```js
<script>
	var isAdmin = false;
	if (isAdmin) {
		...
		var adminPanelTag = document.createElement('a');
		adminPanelTag.setAttribute('href', 'https://insecure-website.com/administrator-panel-yb556');
		adminPanelTag.innerText = 'Admin panel';
		...
	}
</script>
```

Đoạn script này thêm một liên kết vào giao diện người dùng (UI) nếu họ là người dùng quản trị (admin user). Tuy nhiên, đoạn script chứa URL này lại hiển thị với tất cả người dùng bất kể vai trò của họ là gì.

#### Các phương pháp kiểm soát truy cập dựa trên tham số

Một số ứng dụng xác định quyền truy cập hoặc vai trò của người dùng tại thời điểm đăng nhập, và sau đó lưu trữ thông tin này ở một vị trí mà người dùng có thể kiểm soát (user-controllable location). Vị trí này có thể là:

* Một trường ẩn (hidden field).
* Một cookie.
* Một tham số chuỗi truy vấn (query string parameter) được thiết lập sẵn.

Ứng dụng đưa ra các quyết định kiểm soát truy cập dựa trên giá trị được gửi lên đó. Ví dụ:

```http
https://insecure-website.com/login/home.jsp?admin=true
https://insecure-website.com/login/home.jsp?role=1
```

Cách tiếp cận này là không an toàn vì người dùng có thể sửa đổi giá trị và truy cập vào chức năng mà họ không được ủy quyền, chẳng hạn như các chức năng quản trị.

Đây là một trong những lỗi sơ đẳng nhất nhưng vẫn tồn tại, đặc biệt là trong các hệ thống cũ hoặc các ứng dụng được viết vội vàng.

Lỗi này xuất phát từ việc lập trình viên mắc phải nguyên tắc tối thượng trong bảo mật: **"Never trust client input"**. Lập trình viên tin rằng nếu họ đặt `admin=false` trong một thẻ `<input type="hidden">`, người dùng sẽ không nhìn thấy và không sửa được. Nhưng thực tế:

1. Với Hidden Field: Hacker chỉ cần nhấn F12 (Inspect Element) và sửa `value="false"` thành `value="true"` rồi nhấn Submit.
2. Với Cookie: Hacker dùng các tiện ích mở rộng (extension) như "Cookie Editor" hoặc dùng Burp Suite để sửa giá trị cookie `role=user` thành `role=admin` trước khi request được gửi đi.
3. Với URL Parameter: Đơn giản là sửa trực tiếp trên thanh địa chỉ trình duyệt.

Ví dụ thực tế hiện đại (JWT - JSON Web Token): Ngày nay, lỗi này thường biến tướng dưới dạng JWT. Nhiều lập trình viên lưu thông tin `{"role": "admin"}` trong token nhưng quên xác thực chữ ký (Signature Verification) hoặc dùng thuật toán "None". Hacker có thể giải mã token (base64 decode), sửa JSON thành admin, rồi mã hóa lại để chiếm quyền.

#### Broken access control resulting from platform misconfiguration (Kiểm soát truy cập bị hỏng do cấu hình sai nền tảng)

Một số ứng dụng thực thi kiểm soát truy cập tại tầng nền tảng (platform layer). Họ làm điều này bằng cách hạn chế quyền truy cập vào các URL cụ thể và các phương thức HTTP dựa trên vai trò của người dùng. Ví dụ, một ứng dụng có thể cấu hình một quy tắc như sau:

```http
DENY: POST, /admin/deleteUser, managers
```

Quy tắc này từ chối quyền truy cập vào phương thức `POST` trên URL `/admin/deleteUser`, đối với người dùng thuộc nhóm `managers`. Nhiều vấn đề có thể xảy ra trong tình huống này, dẫn đến việc vượt qua kiểm soát truy cập (access control bypasses).

Một số framework ứng dụng hỗ trợ các HTTP headers không chuẩn (non-standard) khác nhau, có thể được sử dụng để ghi đè (override) URL trong yêu cầu gốc, chẳng hạn như `X-Original-URL` và `X-Rewrite-URL`.

Nếu một trang web sử dụng các kiểm soát nghiêm ngặt ở phía front-end để hạn chế truy cập dựa trên URL, nhưng ứng dụng lại cho phép URL bị ghi đè thông qua một request header, thì có thể vượt qua các kiểm soát truy cập bằng cách sử dụng một yêu cầu như sau:

```http
POST / HTTP/1.1
X-Original-URL: /admin/deleteUser
...
```

Đây là một kỹ thuật tấn công rất hay, thường nhắm vào sự "bất đồng bộ" giữa các lớp bảo mật.

1. Cơ chế hoạt động:
   * Lớp bảo mật (Firewall/Front-end): Nhìn vào dòng đầu tiên của request: `POST / HTTP/1.1`. Nó thấy người dùng đang truy cập trang chủ (`/`), điều này hoàn toàn hợp lệ và an toàn -> Cho qua.
   * Lớp ứng dụng (Backend Framework - ví dụ PHP Symfony, ASP.NET): Khi nhận được request, nó kiểm tra xem có header `X-Original-URL` hay không. Nếu có, nó sẽ ưu tiên xử lý logic dựa trên đường dẫn trong header đó (`/admin/deleteUser`) thay vì đường dẫn thực tế (`/`).
   * Kết quả: Hacker đánh lừa được bảo vệ ở cửa nhưng vẫn ra lệnh cho hệ thống thực thi hành động nhạy cảm.
2. Các Header tương tự cần thử (Fuzzing): Khi pentest lỗi này, ngoài `X-Original-URL` và `X-Rewrite-URL`, ta có thể thử thêm:
   * `X-Custom-IP-Authorization` (để giả mạo IP nội bộ)
   * `X-Forwarded-For`
   * `X-Host`
3. HTTP Verb Tampering (Một biến thể khác): Đôi khi cấu hình chỉ chặn `DENY: POST`. Hacker có thể đổi phương thức thành `GET` hoặc `HEAD` (ví dụ: `GET /admin/deleteUser?username=target`). Nếu ứng dụng backend hỗ trợ xử lý xóa user qua phương thức GET (do code ẩu), hoặc framework tự động chuyển đổi phương thức (method tunneling), hacker sẽ vượt qua được luật cấm POST.

#### Kỹ thuật tấn công thay thế sử dụng HTTP Method

Một kỹ thuật tấn công thay thế liên quan đến HTTP method (phương thức HTTP) được sử dụng trong yêu cầu. Các kiểm soát phía front-end được mô tả trong các phần trước hạn chế quyền truy cập dựa trên URL và HTTP method.

Một số trang web chấp nhận các HTTP request methods khác nhau khi thực hiện cùng một hành động. Nếu một kẻ tấn công có thể sử dụng phương thức GET (hoặc một phương thức khác) để thực hiện các hành động trên một restricted URL (URL bị hạn chế), họ có thể vượt qua (bypass) kiểm soát truy cập được triển khai tại platform layer (tầng nền tảng).

_Ví dụ cụ thể:_

1. Cấu hình bảo mật (File `.htaccess` hoặc cấu hình Web Server): Quản trị viên cấu hình để chặn người thường xóa tài khoản, quy tắc thường trông như thế này: `DENY POST /admin/deleteUser` _(Nghĩa là: Cấm mọi yêu cầu dạng POST gửi đến trang xóa user)._
2.  Mã nguồn ứng dụng (PHP/Java/Python): Lập trình viên lại viết code xử lý lỏng lẻo:

    PHP

    ```php
    // Thay vì dùng $_POST['id'], lập trình viên dùng $_REQUEST['id']
    $id = $_REQUEST['id'];
    deleteUser($id);
    ```

    _(Lưu ý: Trong PHP, `$_REQUEST` nhận dữ liệu từ cả GET, POST và COOKIE)._
3. Kịch bản tấn công:
   * Hacker gửi: `POST /admin/deleteUser` -> Bị chặn (Block) bởi cấu hình server.
   * Hacker đổi sang: `GET /admin/deleteUser?id=123` -> Thành công (Bypass).
     * Lý do: Cấu hình server chỉ cấm POST, không cấm GET. Code ứng dụng thì chấp nhận cả GET.

Các phương thức lạ khác (Esoteric Headers): Ngoài `GET` và `POST`, hacker còn thử các phương thức ít gặp hơn để xem server có xử lý không, ví dụ:

* `HEAD`: Giống GET nhưng không trả về nội dung (body). Dùng để kiểm tra xem file có tồn tại hay không mà không bị log quá nhiều.
* `PUT`, `DELETE`: Đôi khi các API RESTful quên tắt các phương thức này.

#### Broken access control resulting from URL-matching discrepancies (Kiểm soát truy cập bị hỏng do sự sai lệch trong khớp nối URL)

Các trang web có thể khác nhau về mức độ nghiêm ngặt trong việc khớp path của một yêu cầu đến với một endpoint đã được định nghĩa. Ví dụ, chúng có thể chấp nhận việc viết hoa/thường không nhất quán, do đó một yêu cầu gửi đến `/ADMIN/DELETEUSER` vẫn có thể được ánh xạ (mapped) tới endpoint `/admin/deleteUser`. Nếu cơ chế kiểm soát truy cập kém linh hoạt hơn, nó có thể coi đây là hai endpoint khác nhau và kết quả là thất bại trong việc thực thi các hạn chế chính xác.

Các sự sai lệch tương tự có thể nảy sinh nếu các nhà phát triển sử dụng Spring framework đã bật tùy chọn `useSuffixPatternMatch`. Điều này cho phép các đường dẫn có phần file extension tùy ý được ánh xạ tới một endpoint tương đương không có phần mở rộng tệp. Nói cách khác, một yêu cầu tới `/admin/deleteUser.anything` vẫn sẽ khớp với mẫu `/admin/deleteUser`. Trước phiên bản Spring 5.3, tùy chọn này được bật theo mặc định.

Trên các hệ thống khác, ta có thể gặp phải sự sai lệch trong việc liệu `/admin/deleteUser` và `/admin/deleteUser/` có được coi là các endpoint riêng biệt hay không. Trong trường hợp này, ta có thể bypass các kiểm soát truy cập bằng cách thêm một dấu gạch chéo ở cuối (trailing slash) vào đường dẫn.

### Horizontal privilege escalation (Leo thang đặc quyền theo chiều ngang)

Horizontal privilege escalation xảy ra nếu một người dùng có thể giành quyền truy cập vào các tài nguyên thuộc về một người dùng khác, thay vì tài nguyên của chính họ cùng loại đó. Ví dụ, nếu một nhân viên có thể truy cập hồ sơ của các nhân viên khác cũng như hồ sơ của chính họ, thì đây là leo thang đặc quyền ngang (các tài khoản cùng cấp).

Các cuộc tấn công horizontal privilege escalation có thể sử dụng các phương pháp khai thác tương tự như vertical privilege escalation. Ví dụ, một người dùng có thể truy cập trang tài khoản của chính họ bằng URL sau:

```http
https://insecure-website.com/myaccount?id=123
```

Nếu kẻ tấn công sửa đổi giá trị của tham số `id` thành giá trị của một người dùng khác, họ có thể giành quyền truy cập vào trang tài khoản của người dùng đó, cũng như các dữ liệu và chức năng liên quan.

> Lưu ý Đây là một ví dụ về lỗ hổng Insecure Direct Object Reference (IDOR) (Tham chiếu đối tượng trực tiếp không an toàn). Loại lỗ hổng này nảy sinh ở nơi các giá trị tham số do người dùng kiểm soát, được sử dụng để truy cập trực tiếp vào các tài nguyên hoặc chức năng.

Trong một số ứng dụng, tham số có thể khai thác không có giá trị dễ đoán (predictable value). Ví dụ, thay vì dùng một con số tăng dần, một ứng dụng có thể sử dụng Globally Unique Identifiers (GUIDs) để định danh người dùng. Điều này có thể ngăn kẻ tấn công đoán hoặc dự đoán định danh của người dùng khác. Tuy nhiên, các GUID thuộc về người dùng khác có thể bị tiết lộ ở những nơi khác trong ứng dụng nơi người dùng được tham chiếu tới, chẳng hạn như trong tin nhắn người dùng hoặc các bài đánh giá.

Trong một số trường hợp, ứng dụng có phát hiện ra việc người dùng không được phép truy cập tài nguyên, và trả về một lệnh chuyển hướng (redirect) đến trang đăng nhập. Tuy nhiên, phản hồi chứa lệnh chuyển hướng đó vẫn có thể bao gồm một số dữ liệu nhạy cảm thuộc về người dùng mục tiêu, do đó cuộc tấn công vẫn thành công.

#### Access control vulnerabilities in multi-step processes (Các lỗ hổng kiểm soát truy cập trong quy trình nhiều bước)

Nhiều trang web triển khai các chức năng quan trọng thông qua một chuỗi các bước. Điều này là phổ biến khi:

* Nhiều loại đầu vào hoặc tùy chọn cần được thu thập.
* Người dùng cần xem lại và xác nhận chi tiết trước khi hành động được thực hiện.

Ví dụ, chức năng quản trị để cập nhật chi tiết người dùng có thể bao gồm các bước sau:

1. Tải biểu mẫu chứa chi tiết cho một người dùng cụ thể.
2. Gửi các thay đổi.
3. Xem lại các thay đổi và xác nhận.

Đôi khi, một trang web sẽ triển khai các kiểm soát truy cập nghiêm ngặt (rigorous access controls) trên một số bước trong số này, nhưng lại bỏ qua các bước khác. Hãy tưởng tượng một trang web nơi các kiểm soát truy cập được áp dụng chính xác cho bước thứ nhất và thứ hai, nhưng không áp dụng cho bước thứ ba.

Trang web giả định rằng người dùng sẽ chỉ đến được bước 3 nếu họ đã hoàn thành các bước đầu tiên, vốn đã được kiểm soát đúng cách. Một kẻ tấn công có thể giành quyền truy cập trái phép vào chức năng bằng cách bỏ qua hai bước đầu tiên và gửi trực tiếp yêu cầu cho bước thứ ba với các tham số cần thiết.

Đây là lỗi logic về "Trusting the Workflow" (Tin tưởng vào quy trình làm việc) thay vì kiểm tra quyền hạn thực tế.

1\. Tại sao Lập trình viên mắc lỗi này? Lập trình viên thường tư duy theo luồng giao diện (UI Flow):

* _Người dùng bấm nút A -> Hiện Form B -> Bấm Save -> Xử lý C._ Họ nghĩ rằng: "Vì mình không hiển thị nút Save cho người dùng thường, nên họ không thể kích hoạt Xử lý C được". Tuy nhiên, HTTP là giao thức Stateless (phi trạng thái). Server không tự động nhớ "người này vừa đi qua bước B". Nếu hacker gửi thẳng request tới bước C, và bước C không kiểm tra lại quyền `isAdmin`, hành động sẽ được thực thi.

2\. Ví dụ thực tế (Mua hàng online):

* Bước 1: Chọn món hàng giá $1000.
* Bước 2: Điền thông tin thanh toán (Server kiểm tra thẻ tín dụng).
* Bước 3: Xác nhận đơn hàng (Trang `POST /checkout/confirm`).

Nếu lập trình viên chỉ kiểm tra tiền ở Bước 2, hacker có thể dùng công cụ như Burp Suite để:

* Bỏ qua Bước 2.
* Gửi thẳng request tới Bước 3: `POST /checkout/confirm?item_id=1000`.
* Kết quả: Đơn hàng được tạo mà không cần thanh toán.

3\. Cách khắc phục: Mọi bước (Step), đặc biệt là bước cuối cùng thực thi hành động (Commit/Save/Delete), đều phải thực hiện lại quy trình Authentication (Xác thực) và Authorization (Phân quyền) độc lập, không dựa vào giả định từ bước trước đó.

#### Referer-based access control (Kiểm soát truy cập dựa trên Referer)

Một số trang web dựa việc kiểm soát truy cập vào Referer header được gửi trong yêu cầu HTTP. Referer header có thể được các trình duyệt thêm vào các yêu cầu để chỉ ra trang nào đã khởi tạo yêu cầu đó.

Ví dụ, một ứng dụng thực thi nghiêm ngặt các kiểm soát truy cập trên trang quản trị chính tại `/admin`, nhưng đối với các trang con như `/admin/deleteUser` thì chỉ kiểm tra Referer header. Nếu Referer header có chứa URL `/admin` chính, thì yêu cầu đó được chấp nhận.

Trong trường hợp này, Referer header có thể được kiểm soát hoàn toàn bởi kẻ tấn công. Điều này có nghĩa là họ có thể giả mạo (forge) các yêu cầu trực tiếp đến các trang con nhạy cảm bằng cách cung cấp Referer header được yêu cầu, và giành quyền truy cập trái phép.

Đây là một lỗi thiết kế xuất phát từ sự ngây thơ của lập trình viên khi tin tưởng vào trình duyệt.

1. Sự thật thú vị về chính tả: Bạn có để ý từ này viết là `Referer` chứ không phải từ tiếng Anh đúng là `Referrer` (thiếu một chữ 'r' ở giữa) không?
   * Đây là một lỗi chính tả trong bản dự thảo chuẩn HTTP ban đầu (RFC 1945).
   * Đến khi người ta nhận ra thì đã quá muộn để sửa vì hàng triệu hệ thống đã sử dụng nó. Do đó, trong kỹ thuật HTTP, chúng ta luôn viết là Referer, nhưng khi viết văn bản tiếng Anh thông thường thì dùng Referrer.
2. Tại sao lập trình viên lại dùng cách này? Họ nghĩ rằng: _"Chỉ có ai đang ở trang `/admin` mới có thể bấm nút Delete, vậy nên trình duyệt sẽ tự động gửi `Referer: /admin`. Nếu hacker copy link `/admin/deleteUser` dán vào tab mới, Referer sẽ rỗng -> Chặn lại."_ => Suy nghĩ này đúng với người dùng bình thường, nhưng sai hoàn toàn với Hacker. Hacker không dùng trình duyệt theo cách thông thường; họ dùng công cụ chặn bắt gói tin (Proxy).
3. Cách tấn công thực tế:
   * Bắt request nhạy cảm bằng Burp Suite Repeater.
   * Thêm hoặc sửa dòng: `Referer: https://insecure-website.com/admin`
   * Gửi request -> Bypass thành công.

#### Location-based access control (Kiểm soát truy cập dựa trên vị trí)

Một số trang web thực thi kiểm soát truy cập dựa trên vị trí địa lý của người dùng. Điều này có thể áp dụng, ví dụ, cho các ứng dụng ngân hàng hoặc các dịch vụ truyền thông nơi áp dụng các quy định pháp luật của nhà nước hoặc các hạn chế kinh doanh.

Các kiểm soát truy cập này thường có thể bị vượt qua (circumvented) bằng cách sử dụng web proxies, VPNs, hoặc thao túng các cơ chế định vị phía máy khách (client-side geolocation mechanisms).

## How to prevent access control vulnerabilities (Cách ngăn chặn các lỗ hổng kiểm soát truy cập)

Các lỗ hổng kiểm soát truy cập có thể được ngăn chặn bằng cách áp dụng phương pháp tiếp cận defense-in-depth (phòng thủ chiều sâu) và tuân thủ các nguyên tắc sau:

* Không bao giờ chỉ dựa vào obfuscation (sự che giấu/làm mờ) để kiểm soát truy cập.
* Trừ khi một tài nguyên được chủ đích cho phép truy cập công khai, hãy từ chối truy cập theo mặc định (deny access by default).
* Bất cứ khi nào có thể, hãy sử dụng một cơ chế duy nhất trên toàn bộ ứng dụng (single application-wide mechanism) để thực thi các kiểm soát truy cập.
* Ở cấp độ mã nguồn (code level), bắt buộc các nhà phát triển phải khai báo quyền truy cập được phép cho từng tài nguyên, và từ chối truy cập theo mặc định.
* Kiểm toán (audit) và kiểm thử (test) kỹ lưỡng các kiểm soát truy cập để đảm bảo chúng hoạt động đúng như thiết kế.