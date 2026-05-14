---
title: "5.5 - DOM-based XSS"
date: 2026-05-14
category: "Tutorial"
series: "Cross-Site Attacks"
seriesOrder: 5
tags: []
draft: false
---

## DOM là gì?

**DOM (Document Object Model)** là _mô hình đối tượng của tài liệu HTML_ mà **trình duyệt tạo ra khi đọc một trang web**.\
Nói đơn giản:

> DOM là **cách trình duyệt “hiểu” và biểu diễn** cấu trúc của trang web — giống như một cây gồm các phần tử (node) như `<html>`, `<body>`, `<div>`, `<p>`...

Ví dụ, giả sử file HTML là:

```html
<html>
  <body>
    <h1>Hello</h1>
    <p id="msg">Welcome</p>
  </body>
</html>
```

Khi trang này được load, trình duyệt sẽ tạo **DOM Tree** như sau:

```html
Document
 └── html
     └── body
         ├── h1  → "Hello"
         └── p (id="msg") → "Welcome"

```

Và JavaScript có thể **truy cập và thay đổi DOM này**, ví dụ:

```javascript
document.getElementById("msg").innerHTML = "Hi!";
```

Khi dòng này chạy, trình duyệt thay đổi nội dung thẻ `<p>` trên trang thành **"Hi!"** mà không cần tải lại trang.

Thêm 2 khái niệm quan trọng trong phần này là **Source** và **Sink:**

* **Source**: nơi dữ liệu đến từ (ví dụ `location.search`, `location.hash`, `document.referrer`, input form, `postMessage`, v.v).
* **Sink**: nơi dữ liệu được _tiêu thụ_ (ví dụ gán vào DOM hoặc được `eval`), nếu sink cho phép thực thi HTML/JS thì nguy cơ XSS xuất hiện.

Tại sao sink quan trọng?

* Để một DOM-based XSS xảy ra cần có **taint flow** từ một source tới một sink có khả năng thực thi hoặc parse HTML. Vì vậy khi tìm XSS thì phải tìm cả source **và** sink, và xem dữ liệu có đi tới sink đó không và ở trong context nào.

## DOM-based XSS là gì?

Lỗ hổng **DOM-based XSS** thường xuất hiện khi JavaScript trên client lấy dữ liệu từ một nguồn mà attacker kiểm soát, ví dụ như URL, và chuyển dữ liệu đó tới một _sink_ hỗ trợ thực thi mã động như `eval()` hoặc `innerHTML`. Điều này cho phép attacker thực thi mã JavaScript độc hại trong trình duyệt nạn nhân, thường là cho phép chiếm đoạt tài khoản của user nạn nhân.

Để thực hiện một cuộc tấn công DOM-based XSS, ta cần đặt dữ liệu vào source sao cho dữ liệu đó được truyền đến một _sink_ và gây ra việc thực thi mã độc tùy ý

**Source** phổ biến nhất cho DOM XSS là URL (thường được truy cập qua đối tượng `window.location`). Attacker có thể xây dựng một link để đưa user nạn nhân đến một trang chứa lỗ hỏng cùng với payload trong query string hoặc fragment của URL. Trong một số trường hợp nhất định, chẳng hạn như trang 404 hoặc website chạy bằng PHP, payload còn có thể nằm ngay trong path của URL.

(Để hiểu sâu về dòng chảy dữ liệu “taint flow” giữa sources và sinks, ta sẽ cùng tìm hiểu tiếp)

## Cách test lỗ hỏng DOM-based XSS

Phần lớn DOM XSS có thể tìm nhanh bằng Burp Suite scanner, nhưng kiểm tra thủ công thường cần **trình duyệt có developer tools** (ví dụ Chrome). Quy trình chung: lần lượt thử từng source khả dĩ và test từng source độc lập.

1. **Test các HTML sink**
   * Để kiểm tra DOM XSS trong HTML sink, ta đặt một chuỗi alphanumeric ngẫu nhiên vào source (như `location.search`), sau đó dùng devtools để inspect HTML và tìm vị trí chuỗi xuất hiện.
   * Lưu ý: View Source của browser sẽ không có tác dụng để test DOM XSS vì nó không phản ánh những thay đổi do JavaScript thực hiện trên DOM. Trong developer tools của Chrome, ta có thể sử dụng Ctrl + F / Cmd + F (Elements) và tìm string.
   * Với mỗi vị trí xuất hiện string của ta trong DOM, ta cần xác định **context** (giữa thẻ, trong attribute có dấu nháy kép, trong JS string, v.v). Dựa vào context này, tinh chỉnh input (ví dụ chèn dấu nháy kép nếu ở attribute) để xem nó được hoạt động như thế nào, có thể phá vỡ context và chèn payload hay không. Ví dụ, nếu chuỗi của ta xuất hiện trong thuộc tính được trích dẫn trong ngoặc kép thì liệu có thể tìm cách để thoát ra khỏi thuộc tính đó không.
   * Lưu ý rằng các trình duyệt khác nhau sẽ xử lý URL-encoding khác nhau, Chrome/Firefox/Safari thường URL-encode `location.search và location.hash`, trong khi IE11 và Edge (pre-Chromium) thì không URL-encode các sources này , nếu dữ liệu bị encode trước khi xử lý thì tấn công XSS sẽ khó xảy ra.
2. **Test các JavaScript execution sink**
   * Việc test sẽ khó hơn một chút vì input có thể không xuất hiện trong DOM. Ta cần dùng JavaScript **debugger** để tìm xem input có được gửi tới sink hay không và nó được gửi đến bằng cách nào.
   * Tìm trong mã JS của trang những chỗ tham chiếu đến source (ví dụ search toàn bộ mã với `location`). Trong Chrome: Ctrl + Shift + F (Cmd + Alt + F trên Mac) để search toàn bộ JS.
   * Khi tìm được nơi source được đọc, ta có thể dùng JavaScript debugger để đặt breakpoint và theo dõi flow của nó, kiểm tra xem source có được gán cho biến khác không? Nếu trong trường hợp này thì dùng chức năng search tiếp để theo dõi các biến trung gian cho tới khi chúng tới sink. Hover biến trong debugger để xem giá trị trước khi nó được gửi đến sink. Sau đó, như với HTML sink, tinh chỉnh input để thử xem có thể thực hiện một cuộc tấn công XSS không.
3.  **Dùng DOM Invader (Burp)**

    Identify và exploit DOM XSS trong thực tế có thể là một quá trình rất tẻ nhạt (thường phải duyệt thủ công qua các JS phức tạp/minified). Nếu dùng trình duyệt của Burp, extension **DOM Invader** sẽ tự động hỗ trợ tìm nhiều source và sink và giúp tiết kiệm công sức.

## Exploiting DOM XSS với các source và sink khác nhau

Về nguyên tắc, một website dễ bị **DOM-based XSS** khi tồn tại một đường dẫn có thể thực thi (executable path) mà qua đó dữ liệu có thể lan truyền từ **source** tới **sink**. Trong thực tế, các source và sink khác nhau có những đặc tính và hành vi khác nhau ảnh hưởng tới khả năng khai thác, và quyết định những kỹ thuật cần dùng. Ngoài ra, các mã script của trang web có thể thực hiện validation hoặc xử lý khác trên dữ liệu, điều này cần được tính và cân nhắc tới khi cố gắng khai thác lỗ hổng. Có nhiều loại **sink** liên quan tới DOM-based vulnerabilities, dưới đây là một ví dụ cho sink `document.write`.

`document.write` sink có thể chèn thẳng phần tử, nên payload đơn giản có thể là:

```javascript
document.write('... <script>alert(document.domain)</script> ...');
```

Tuy nhiên, hãy lưu ý rằng trong một số trường hợp, nội dung được ghi bởi `document.write` có thể bao gồm một số phần HTML sẵn có xung quanh mà bạn cần phải tính đến khi khai thác. Ví dụ, bạn có thể cần phải đóng một số thẻ HTML đang mở trước khi chèn payload JavaScript của mình.

Sink `innerHTML` không chấp nhận các phần tử `script` trên bất kỳ trình duyệt hiện đại nào, và các sự kiện `svg onload` cũng sẽ không được kích hoạt (fire). Điều này có nghĩa là bạn sẽ cần sử dụng các phần tử thay thế như `img` hoặc `iframe`.

Các trình xử lý sự kiện (event handlers) như `onload` và `onerror` có thể được sử dụng kết hợp với các phần tử này. Ví dụ:

```javascript
element.innerHTML='... <img src=1 onerror=alert(document.domain)> ...'
```

Đây là kiến thức cực kỳ quan trọng khi bạn khai thác lỗ hổng DOM-based XSS. Rất nhiều người khi mới học thường mắc kẹt ở đây vì cố gắng chèn `<script>alert(1)</script>` vào `innerHTML` nhưng mãi không thấy nó chạy.

1\. Tại sao thẻ `<script>` không chạy? Đây không phải là lỗi, mà là tính năng bảo mật được quy định trong chuẩn HTML5.

* Khi ta gán một chuỗi vào `innerHTML`, trình duyệt sẽ phân tích cú pháp (parse) chuỗi đó thành các phần tử DOM.
* Tuy nhiên, các thẻ `<script>` được tạo ra theo cách này sẽ được đánh dấu là "non-executable" (không được thực thi). Trình duyệt vẫn hiển thị thẻ script trong DOM (inspect sẽ thấy), nhưng đoạn code bên trong sẽ bị bỏ qua.

2\. Tại sao `svg onload` không chạy nhưng `img onerror` lại chạy?

* `svg onload`: Sự kiện `load` của SVG (và cả `body onload`) thường chỉ kích hoạt khi tài liệu được phân tích cú pháp lần đầu tiên (page load). Khi bạn chèn động vào `innerHTML`, thời điểm "page load" đã qua, nên nó không kích hoạt.
* `img onerror`:
  * Trong ví dụ: `<img src=1 onerror=...>`
  * Trình duyệt cố gắng tải hình ảnh từ đường dẫn `src=1`.
  * Vì đường dẫn `1` không tồn tại (lỗi 404), sự kiện `error` lập tức xảy ra.
  * Trình xử lý `onerror` bắt được sự kiện này và thực thi đoạn mã JavaScript độc hại.

3\. Mẹo Pentest: Nếu bạn gặp sink là `innerHTML`, hãy quên thẻ `<script>` đi. Thay vào đó, hãy dùng payload kinh điển sau:

* `<img src=x onerror=alert(1)>`
* `<iframe src="javascript:alert(1)">` (Lưu ý: iframe có thể bị chặn bởi CSP).
* `<details ontoggle=alert(1)>` (Cần người dùng click vào, nhưng đôi khi hữu dụng).

### Sources và sinks trong các thư viện phụ thuộc của bên thứ ba (Third-party dependencies)

Các ứng dụng web hiện đại thường được xây dựng bằng cách sử dụng nhiều thư viện và framework của bên thứ ba, những thứ này thường cung cấp thêm các chức năng và khả năng cho các nhà phát triển. Điều quan trọng cần nhớ là một số trong số này cũng là các sources (nguồn) và sinks (điểm đến) tiềm năng cho lỗ hổng DOM XSS.

#### DOM XSS trong jQuery

Nếu một thư viện JavaScript như jQuery đang được sử dụng, hãy coi chừng các sinks có thể thay đổi các phần tử DOM trên trang.

Ví dụ, hàm `attr()` của jQuery có thể thay đổi các thuộc tính (attributes) của các phần tử DOM. Nếu dữ liệu được đọc từ một source do người dùng kiểm soát (user-controlled source) như URL, sau đó được truyền vào hàm `attr()`, thì có thể thao túng giá trị được gửi đi để gây ra XSS.

Ví dụ, ở đây chúng ta có một đoạn JavaScript thay đổi thuộc tính `href` của một thẻ neo (anchor element - thẻ `<a>`) sử dụng dữ liệu từ URL:

```javascript
$(function() {
	$('#backLink').attr("href",(new URLSearchParams(window.location.search)).get('returnUrl'));
});
```

Ta có thể khai thác điều này bằng cách sửa đổi URL sao cho source `location.search` chứa một URL JavaScript độc hại. Sau khi JavaScript của trang áp dụng URL độc hại này vào thuộc tính `href` của liên kết quay lại ("back link"), việc nhấp vào liên kết đó sẽ thực thi mã độc:

```javascript
?returnUrl=javascript:alert(document.domain)
```

1\. Cơ chế Source & Sink:

* Source: Là nơi dữ liệu từ kẻ tấn công đi vào ứng dụng JavaScript.
  * Ví dụ: `location.search`, `location.hash`, `document.referrer`, `window.name`.
* Sink: Là nơi dữ liệu đó được thực thi hoặc render ra giao diện một cách không an toàn.
  * Ví dụ native JS: `innerHTML`, `document.write()`, `eval()`.
  * Ví dụ jQuery: `attr()`, `html()`, `$()`.

2\. Tại sao `attr()` lại nguy hiểm trong ví dụ trên? Hàm `attr()` trong jQuery dùng để gán giá trị cho thuộc tính HTML.

* Khi ta gán `href` của thẻ `<a>` bằng một giá trị bắt đầu bằng `javascript:`, trình duyệt sẽ hiểu đây là Pseudo-protocol (giao thức giả).
* Thay vì chuyển hướng người dùng đến một trang web, trình duyệt sẽ thực thi đoạn mã JavaScript đi sau dấu hai chấm.
* Lưu ý: Nếu code dùng `attr("href", ...)` thì nguy hiểm. Nhưng nếu code dùng `attr("class", ...)` hoặc `attr("title", ...)` thì thường an toàn hơn (trừ khi attacker có thể thoát khỏi dấu nháy).

3\. Selector Injection (Một lỗi jQuery khác): Ngoài `attr()`, sink nguy hiểm nhất của jQuery thực ra là chính hàm khởi tạo `$()`.

* Nếu bạn viết: `$(location.hash)`
* Attacker nhập URL: `#<img src=x onerror=alert(1)>`
* jQuery sẽ tự động tạo ra thẻ `img` và chèn vào trang -> XSS nổ ngay lập tức.

Một sink tiềm năng khác cần lưu ý là hàm selector `$()` của jQuery, hàm này có thể được sử dụng để chèn (inject) các đối tượng độc hại vào DOM.

jQuery từng cực kỳ phổ biến, và một lỗ hổng DOM XSS kinh điển đã bị gây ra bởi các trang web sử dụng selector này kết hợp với source `location.hash` để tạo hiệu ứng hoạt họa hoặc tự động cuộn (auto-scrolling) đến một phần tử cụ thể trên trang. Hành vi này thường được triển khai bằng cách sử dụng một trình xử lý sự kiện `hashchange` dễ bị tổn thương, tương tự như sau:

```javascript
$(window).on('hashchange', function() {
	var element = $(location.hash);
	element[0].scrollIntoView();
});
```

Vì `hash` là thành phần do người dùng kiểm soát (user controllable), một kẻ tấn công có thể sử dụng nó để chèn một vector XSS vào sink selector `$()`. Các phiên bản gần đây hơn của jQuery đã vá lỗ hổng cụ thể này bằng cách ngăn chặn việc chèn HTML vào một selector khi đầu vào bắt đầu bằng ký tự thăng (`#`). Tuy nhiên, ta vẫn có thể tìm thấy mã nguồn tồn tại lỗ hổng này trong thực tế.

Để thực sự khai thác lỗ hổng kinh điển này, ta sẽ cần tìm một cách để kích hoạt sự kiện `hashchange` mà không cần tương tác của người dùng. Một trong những cách đơn giản nhất để làm điều này là gửi mã khai thác (exploit) thông qua một `iframe`:

```html
<iframe src="https://vulnerable-website.com#" onload="this.src+='<img src=1 onerror=alert(1)>'">
```

Trong ví dụ này, thuộc tính `src` trỏ đến trang dễ bị tấn công với một giá trị hash rỗng. Khi `iframe` được tải xong, một vector XSS được nối thêm vào hash, khiến sự kiện `hashchange` được kích hoạt (fire).

> Lưu ý Ngay cả các phiên bản mới hơn của jQuery vẫn có thể bị lỗ hổng thông qua sink selector `$()`, miễn là bạn có toàn quyền kiểm soát đầu vào của nó từ một source mà không yêu cầu tiền tố `#`.

Đây là một kỹ thuật tấn công rất thông minh dựa trên hành vi của trình duyệt và thư viện jQuery:

1\. Tại sao `$()` lại nguy hiểm? Hàm `$()` của jQuery (hoặc `jQuery()`) có tính năng "đa năng":

* Nếu truyền vào một selector (ví dụ: `#myId`, `.myClass`), nó sẽ tìm kiếm phần tử đó trong DOM.
* Nhưng nếu truyền vào một chuỗi HTML (ví dụ: `<img ...>`), nó sẽ TẠO MỚI phần tử đó và thêm vào bộ nhớ (dù chưa gắn vào DOM cây chính, nhưng code JS bên trong thẻ đó vẫn có thể chạy trong một số trường hợp, đặc biệt là `onerror`).

2\. Cơ chế của Payload Iframe:

* `<iframe src="...#">`: Ban đầu iframe tải trang web với hash rỗng.
* `onload="..."`: Ngay khi trang tải xong, sự kiện `onload` của iframe chạy đoạn JS: `this.src += '<img...>'`.
* Mấu chốt: Việc thay đổi phần `hash` (sau dấu `#`) của URL KHÔNG làm tải lại trang (reload), nhưng nó KÍCH HOẠT sự kiện `hashchange` bên trong trang web nạn nhân.
* Listener `$(window).on('hashchange', ...)` bắt được sự kiện này, lấy nội dung hash mới (chính là `<img src=1 onerror=alert(1)>`) và ném vào hàm `$()`.
* jQuery thấy chuỗi bắt đầu bằng `<` nên hiểu là tạo thẻ HTML -> XSS nổ.

3\. Tại sao bản vá (Patch) của jQuery lại kiểm tra dấu `#`? Để ngăn chặn việc này, jQuery đã thêm logic: _"Nếu chuỗi bắt đầu bằng `#`, tôi sẽ coi đó là selector thuần túy và chỉ tìm kiếm ID, tôi sẽ không bao giờ tạo thẻ HTML nữa"_. => Đó là lý do tại sao ở phần Lưu ý cuối cùng, nếu input không bắt buộc phải có `#` ở đầu (ví dụ: `var input = location.search`), thì bản vá của jQuery trở nên vô dụng và ta vẫn tấn công được.

#### DOM XSS in AngularJS (DOM XSS trong AngularJS)

Nếu một framework như AngularJS được sử dụng, kẻ tấn công có thể thực thi JavaScript mà không cần dấu ngoặc nhọn (`<` `>`) hoặc các sự kiện (events).

Khi một trang web sử dụng thuộc tính `ng-app` trên một phần tử HTML, nó sẽ được xử lý bởi AngularJS. Trong trường hợp này, AngularJS sẽ thực thi JavaScript nằm bên trong cặp dấu ngoặc nhọn kép (`{{ }}`) có thể xuất hiện trực tiếp trong HTML hoặc bên trong các thuộc tính.

Đây là một kỹ thuật tấn công rất đặc biệt, thường được gọi là Client-Side Template Injection (CSTI). Đối với dân Pentest, đây là "vũ khí bí mật" để vượt qua các bộ lọc (WAF) chỉ chăm chăm chặn thẻ `<script>` hay các ký tự đặc biệt như `<` `>`.

1\. Cơ chế tấn công: AngularJS sử dụng `{{ }}` để binding dữ liệu (hiển thị biến ra màn hình). Tuy nhiên, nó cũng cho phép tính toán biểu thức bên trong đó.

* Ví dụ cơ bản: Nếu bạn nhập `{{ 1+1 }}` vào ô input và trang web hiển thị số `2` -> Trang web đó đang dùng AngularJS và có khả năng bị lỗ hổng này.

2\. Sandbox Escape (Vượt ngục): Tuy nhiên, AngularJS có một cơ chế bảo vệ gọi là Sandbox để ngăn bạn gọi các hàm nguy hiểm như `alert()` hay `window` trực tiếp trong `{{ }}`. Ví dụ, `{{ alert(1) }}` thường sẽ không chạy. Để khai thác, hacker phải sử dụng kỹ thuật Sandbox Escape - lợi dụng các hàm nội tại của JavaScript (như `constructor`, `charAt`, `toString`) để "leo" ra ngoài sandbox và thực thi code.

3\. Payload mẫu (Dành cho phiên bản AngularJS cũ): Một payload kinh điển để vượt qua sandbox trông sẽ phức tạp như thế này (thay vì chỉ là `alert(1)`):

```javascript
{{ constructor.constructor('alert(1)')() }}
```

* `constructor`: Trong JavaScript, mọi đối tượng đều có thuộc tính constructor. Trong Scope của Angular, từ khóa này đôi khi trỏ đến hàm tạo của đối tượng hiện tại.
* `.constructor('alert(1)')`: Hacker đang cố gắng gọi `Function constructor` (hàm tạo Function) của JavaScript. Nó tương đương với việc tạo ra một hàm mới: `new Function('alert(1)')`.
* `()` cuối cùng: Thực thi hàm mới tạo đó.

Hoặc phức tạp hơn đối với các phiên bản mới hơn:

```javascript
{{a=toString().constructor.prototype;a.charAt=a.trim;$eval('a,alert(1),a')}}
```

Tóm lại: Nếu bạn thấy source code trang web có `ng-app` hoặc `angular.min.js`, hãy thử ngay phép toán `{{7*7}}`. Nếu nó hiện ra `49`, bạn đã tìm thấy "kho báu".

### DOM XSS combined with reflected and stored data (DOM XSS kết hợp với dữ liệu phản xạ và lưu trữ)

Một số lỗ hổng dựa trên DOM thuần túy (pure DOM-based) nằm gói gọn trong một trang duy nhất. Nếu một tập lệnh (script) đọc dữ liệu nào đó từ URL và ghi nó vào một sink nguy hiểm, thì lỗ hổng hoàn toàn nằm ở phía máy khách (client-side).

Tuy nhiên, các nguồn (sources) không bị giới hạn ở dữ liệu được trình duyệt phơi bày trực tiếp - chúng cũng có thể bắt nguồn từ trang web (phía server). Ví dụ, các trang web thường phản xạ (reflect) các tham số URL trong phản hồi HTML từ máy chủ. Điều này thường liên quan đến XSS thông thường (normal XSS), nhưng nó cũng có thể dẫn đến các lỗ hổng Reflected DOM XSS.

Trong một lỗ hổng Reflected DOM XSS, máy chủ xử lý dữ liệu từ yêu cầu (request), và lặp lại (echoes) dữ liệu đó vào trong phản hồi. Dữ liệu được phản xạ có thể được đặt vào một chuỗi ký tự JavaScript (JavaScript string literal), hoặc một mục dữ liệu trong DOM, chẳng hạn như một trường biểu mẫu. Một tập lệnh trên trang sau đó xử lý dữ liệu được phản xạ theo cách không an toàn, cuối cùng ghi nó vào một sink nguy hiểm.

```javascript
eval('var data = "reflected string"');
```

Các trang web cũng có thể lưu trữ dữ liệu trên máy chủ và phản xạ nó ở nơi khác. Trong một lỗ hổng Stored DOM XSS, máy chủ nhận dữ liệu từ một yêu cầu, lưu trữ nó, và sau đó bao gồm dữ liệu đó trong một phản hồi sau này. Một tập lệnh trong phản hồi sau này chứa một sink xử lý dữ liệu theo cách không an toàn.

```javascript
element.innerHTML = comment.author
```

### Những sicks có thể dẫn đến DOM-XSS

```
document.write()
document.writeln()
document.domain
element.innerHTML
element.outerHTML
element.insertAdjacentHTML
element.onevent
```

jQuery:

```
add()
after()
append()
animate()
insertAfter()
insertBefore()
before()
html()
prepend()
replaceAll()
replaceWith()
wrap()
wrapInner()
wrapAll()
has()
constructor()
init()
index()
jQuery.parseHTML()
$.parseHTML()
```