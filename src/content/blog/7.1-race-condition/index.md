---
title: "7.1 - Race condition"
date: 2026-05-14
category: "Tutorial"
series: "BUSINESS LOGIC&#x20;"
seriesOrder: 7
tags: []
draft: false
---

## Race condition là gì?

Race conditions là một loại lỗ hổng phổ biến có liên quan mật thiết đến các lỗi logic nghiệp vụ (business logic flaws). Chúng xảy ra khi các trang web xử lý các yêu cầu một cách đồng thời (concurrently) mà không có các biện pháp bảo vệ đầy đủ.

Điều này có thể dẫn đến việc nhiều luồng (threads) riêng biệt tương tác với cùng một dữ liệu tại cùng một thời điểm, dẫn đến một "sự va chạm" (collision) gây ra hành vi không mong muốn trong ứng dụng. Một cuộc tấn công race condition sử dụng các yêu cầu được căn chỉnh thời gian cẩn thận để gây ra các va chạm có chủ đích và khai thác hành vi không mong muốn này cho các mục đích xấu.

Khoảng thời gian mà một sự va chạm (collision) có thể xảy ra được gọi là "cửa sổ cuộc đua" (race window). Đây có thể là một phần nhỏ của giây giữa hai tương tác với cơ sở dữ liệu, ví dụ vậy.

Giống như các lỗi logic khác, tác động của một race condition phụ thuộc rất nhiều vào ứng dụng và chức năng cụ thể mà nó xảy ra.

Đây là một trong những lỗ hổng thú vị và khó phát hiện nhất, thường được xếp vào dạng nâng cao (Advanced).

Cốt lõi của Race Condition thường là lỗi TOCTOU (Time-of-Check to Time-of-Use).

* Time-of-Check: Thời điểm hệ thống kiểm tra điều kiện (Ví dụ: "Tài khoản còn tiền không?").
* Race Window: Khoảng thời gian trễ giữa lúc kiểm tra xong và lúc thực hiện hành động.
* Time-of-Use: Thời điểm hệ thống thực hiện hành động (Ví dụ: "Trừ tiền").

Nếu hacker chèn được một hành động khác vào đúng cái Race Window đó, hệ thống sẽ bị sai lệch.

**Ví dụ kinh điển:** Rút tiền ngân hàng Giả sử bạn có $100 trong tài khoản. Quy trình rút tiền gồm 3 bước:

1. Load số dư: $100.
2. Kiểm tra: $100 >= $100 (Hợp lệ).
3. Trừ tiền: $100 - $100 = $0. Update database.

Nếu bạn gửi 2 lệnh rút $100 cùng một lúc (dùng script hoặc công cụ):

* Luồng A: Load số dư ($100) -> Kiểm tra (OK).
* Luồng B: Load số dư (Vẫn là $100 vì Luồng A chưa kịp trừ) -> Kiểm tra (OK).
* Luồng A: Trừ tiền -> Còn $0.
* Luồng B: Trừ tiền -> Còn -$100 (hoặc lỗi logic tùy code). => Bạn rút được $200 dù chỉ có $100.

## Limit overrun race conditions (Race condition vượt quá giới hạn)

Loại race condition nổi tiếng nhất cho phép bạn vượt quá một loại giới hạn nào đó do logic nghiệp vụ (business logic) của ứng dụng đặt ra.

Ví dụ: Xem xét một cửa hàng trực tuyến cho phép ta nhập mã khuyến mãi trong quá trình thanh toán để nhận giảm giá một lần cho đơn hàng. Để áp dụng giảm giá này, ứng dụng có thể thực hiện các quy trình cấp cao sau:

1. Kiểm tra xem mã này đã được tài khoản đang dùng sử dụng hay chưa.
2. Áp dụng giảm giá vào tổng đơn hàng.
3. Cập nhật thông tin bản ghi trong cơ sở dữ liệu để phản ánh thực tế là ta đã sử dụng mã này (có thể là bật tắt cờ).

Nếu sau đó ta vẫn cố gắng sử dụng lại mã này, các bước kiểm tra ban đầu vẫn sẽ được thực hiện và đến bước check sẽ phát hiện mã này ta đã dùng rồi và ứng dụng sẽ tự hủy quy trình.

<figure><img src="./images/image (3).png" alt=""><figcaption></figcaption></figure>

Bây giờ hãy xem xét điều gì sẽ xảy ra nếu một người dùng chưa từng áp dụng mã giảm giá này trước đó cố gắng áp dụng nó hai lần vào cùng một thời điểm gần như chính xác:

<figure><img src="./images/image (4).png" alt=""><figcaption></figcaption></figure>

Như ta có thể thấy, ứng dụng chuyển đổi qua một trạng thái phụ tạm thời (temporary sub-state); nghĩa là, một trạng thái mà nó đi vào và sau đó thoát ra trước khi quá trình xử lý yêu cầu hoàn tất. Trong trường hợp này, trạng thái phụ bắt đầu khi máy chủ bắt đầu xử lý yêu cầu đầu tiên, và kết thúc khi nó cập nhật cơ sở dữ liệu để chỉ ra rằng bạn đã sử dụng mã này. Điều này tạo ra một race window nhỏ (hay có thể hiểu là khoảng chờ của ứng dụng để xử lý yêu cầu), trong đó ta có thể lừa ứng dụng bằng cách gửi nhiều request trong race window này và sử dụng mã giảm giá này nhiều lần.

Có nhiều biến thể của loại tấn công này, bao gồm:

* Đổi thẻ quà tặng nhiều lần.
* Đánh giá một sản phẩm nhiều lần.
* Rút hoặc chuyển tiền mặt vượt quá số dư tài khoản của bạn.
* Tái sử dụng một giải pháp CAPTCHA duy nhất.
* Vượt qua giới hạn tốc độ chống brute-force (anti-brute-force rate limit).

Vượt quá giới hạn là một kiểu con của cái gọi là lỗ hổng "thời điểm kiểm tra đến thời điểm sử dụng" (time-of-check to time-of-use - TOCTOU). Bản chất của TOCTOU (Time-of-Check to Time-of-Use) trong trường hợp này:

* Time-of-Check: `SELECT * FROM used_coupons WHERE user_id = ...` (Kiểm tra xem đã dùng chưa).
* _GAP (Khoảng trống)_: Đây là lúc CPU chuyển ngữ cảnh hoặc Database đang chờ I/O.
* Time-of-Use: `INSERT INTO used_coupons ...` (Đánh dấu là đã dùng).

Nếu Request 2 chui lọt vào cái _GAP_ kia, nó sẽ thấy kết quả của bước Check vẫn là "Chưa dùng", và nó sẽ chạy tiếp.

_Tại sao Database Transaction không chặn được?_ "Tại sao dùng Transaction (ACID) rồi mà vẫn bị?". Vấn đề nằm ở Isolation Level (Mức độ cô lập) của Database.

* Hầu hết các Database (MySQL, PostgreSQL) mặc định để mức Read Committed.
* Mức này chỉ bảo đảm không đọc phải dữ liệu rác, nhưng KHÔNG ngăn chặn được việc 2 transaction cùng đọc 1 dữ liệu tại cùng 1 thời điểm (Non-repeatable reads).
* Để chặn triệt để, lập trình viên phải dùng khóa bi quan (Pessimistic Locking) như `SELECT ... FOR UPDATE` (khóa dòng dữ liệu lại ngay khi đọc) hoặc nâng Isolation Level lên Serializable (nhưng sẽ làm chậm hệ thống).

### Detecting and exploiting limit overrun race conditions with Burp Repeater (Phát hiện và khai thác race condition vượt quá giới hạn với Burp Repeater)

Quy trình phát hiện và khai thác các race condition dạng vượt quá giới hạn là tương đối đơn giản. Về mặt tổng quan, tất cả những gì bạn cần làm là:

1. Xác định một endpoint dùng một lần (single-use) hoặc bị giới hạn tốc độ (rate-limited) mà có tác động bảo mật hoặc mục đích hữu ích nào đó.
2. Gửi nhiều yêu cầu đến endpoint này liên tiếp thật nhanh để xem bạn có thể vượt quá giới hạn này không.

Thách thức chính là căn chỉnh thời gian các yêu cầu sao cho ít nhất hai cửa sổ cuộc đua (race windows) xếp hàng thẳng nhau, gây ra sự va chạm. Cửa sổ này thường chỉ tính bằng mili-giây và thậm chí có thể ngắn hơn.

Ngay cả khi bạn gửi tất cả các yêu cầu vào chính xác cùng một thời điểm, trong thực tế vẫn có nhiều yếu tố bên ngoài không thể kiểm soát và không thể dự đoán ảnh hưởng đến thời điểm máy chủ xử lý từng yêu cầu và theo thứ tự nào.

Burp Suite 2023.9 bổ sung các khả năng mới mạnh mẽ cho Burp Repeater, cho phép bạn dễ dàng gửi một nhóm các yêu cầu song song (parallel requests) theo cách giúp giảm đáng kể tác động của một trong những yếu tố này, cụ thể là độ trễ biến thiên của mạng (network jitter). Burp tự động điều chỉnh kỹ thuật mà nó sử dụng để phù hợp với phiên bản HTTP được máy chủ hỗ trợ:

* Đối với HTTP/1, nó sử dụng kỹ thuật đồng bộ hóa byte cuối cùng (last-byte synchronization) cổ điển.
* Đối với HTTP/2, nó sử dụng kỹ thuật tấn công gói đơn (single-packet attack), được trình diễn lần đầu bởi PortSwigger Research tại Black Hat USA 2023.

Kỹ thuật tấn công gói đơn cho phép bạn vô hiệu hóa hoàn toàn sự can thiệp từ jitter mạng bằng cách sử dụng một gói TCP duy nhất để hoàn thành 20-30 yêu cầu đồng thời.

Mặc dù bạn thường có thể sử dụng chỉ hai yêu cầu để kích hoạt một khai thác, việc gửi một số lượng lớn yêu cầu như thế này giúp giảm thiểu độ trễ nội bộ, còn được gọi là jitter phía máy chủ (server-side jitter). Điều này đặc biệt hữu ích trong giai đoạn khám phá ban đầu. Chúng tôi sẽ đề cập đến phương pháp này chi tiết hơn.

**Cách làm trong Burp Repeater:**

1. Chuột phải vào Request -> Send to Repeater.
2. Nhân bản (Ctrl+R) thành 10-20 tabs.
3. Bấm dấu `+` để tạo Group, kéo tất cả tabs vào Group đó.
4. Chọn chế độ gửi: Send group in parallel (HTTP/2).
5. Bấm Send Group.

### Detecting and exploiting limit overrun race conditions with Turbo Intruder (Phát hiện và khai thác race condition vượt quá giới hạn với Turbo Intruder)

Ngoài việc cung cấp hỗ trợ gốc (native support) cho tấn công gói đơn (single-packet attack) trong Burp Repeater, chúng tôi cũng đã cải tiến tiện ích mở rộng Turbo Intruder để hỗ trợ kỹ thuật này. Bạn có thể tải xuống phiên bản mới nhất từ BApp Store.

Turbo Intruder yêu cầu một chút thành thạo về Python, nhưng nó phù hợp với các cuộc tấn công phức tạp hơn, chẳng hạn như những cuộc tấn công yêu cầu thử lại nhiều lần (multiple retries), thời gian gửi yêu cầu so le (staggered request timing), hoặc một số lượng yêu cầu cực lớn.

Để sử dụng tấn công gói đơn trong Turbo Intruder:

1. Đảm bảo mục tiêu hỗ trợ HTTP/2. Tấn công gói đơn không tương thích với HTTP/1.
2. Thiết lập các tùy chọn cấu hình `engine=Engine.BURP2` và `concurrentConnections=1` cho request engine.
3. Khi xếp hàng các yêu cầu của bạn, hãy nhóm chúng lại bằng cách gán chúng vào một cổng (gate) được đặt tên bằng đối số `gate` cho phương thức `engine.queue()`.
4. Để gửi tất cả các yêu cầu trong một nhóm nhất định, hãy mở cổng tương ứng bằng phương thức `engine.openGate()`.

```python
def queueRequests(target, wordlists):
    engine = RequestEngine(endpoint=target.endpoint,
                            concurrentConnections=1, # Chỉ dùng 1 kết nối TCP để nhồi nhiều request
                            engine=Engine.BURP2
                            )
    
    # Xếp hàng 20 request vào cổng số '1'
    for i in range(20):
        engine.queue(target.req, gate='1')
    
    # Mở cổng số '1' để gửi tất cả request song song
    engine.openGate('1')
```

Để biết thêm chi tiết, hãy xem mẫu `race-single-packet-attack.py` được cung cấp trong thư mục ví dụ mặc định của Turbo Intruder.

Nếu Burp Repeater là "súng ngắn" (nhanh, tiện, dễ dùng), thì Turbo Intruder chính là "súng máy hạng nặng" (mạnh, tùy biến cao, nhưng khó dùng hơn). Với nền tảng lập trình của bạn (Java/IT2), việc đọc code Python này sẽ rất dễ dàng.

## Hidden multi-step sequences (Chuỗi đa bước ẩn)

Trong thực tế, một yêu cầu duy nhất có thể khởi tạo cả một quy trình đa bước phía sau hậu trường, chuyển đổi ứng dụng qua nhiều trạng thái ẩn mà nó đi vào rồi lại thoát ra trước khi quá trình xử lý yêu cầu hoàn tất. Chúng ta sẽ gọi đây là các "trạng thái phụ" (sub-states).

Nếu ta có thể xác định một hoặc nhiều yêu cầu HTTP gây ra tương tác với cùng một dữ liệu, ta có khả năng lạm dụng các trạng thái phụ này để phơi bày các biến thể nhạy cảm về thời gian của các loại lỗi logic thường gặp trong quy trình làm việc đa bước. Điều này cho phép thực hiện các khai thác race condition đi xa hơn nhiều so với lỗi vượt quá giới hạn (limit overruns).

Ví dụ, ta có thể đã quen thuộc với các quy trình xác thực đa yếu tố (MFA) bị lỗi cho phép ta thực hiện phần đầu tiên của quá trình đăng nhập bằng thông tin xác thực đã biết, sau đó điều hướng thẳng đến ứng dụng thông qua việc duyệt bắt buộc (forced browsing), bỏ qua hoàn toàn MFA một cách hiệu quả.

Đoạn mã giả (pseudo-code) sau đây minh họa cách một trang web có thể dễ bị tấn công bởi một biến thể race condition của cuộc tấn công này:

```python
session['userid'] = user.userid
if user.mfa_enabled:
    session['enforce_mfa'] = True
    # tạo và gửi mã MFA cho người dùng
    # chuyển hướng trình duyệt đến biểu mẫu nhập mã MFA
```

Như có thể thấy, đây thực tế là một chuỗi đa bước nằm trong khoảng thời gian của một yêu cầu duy nhất. Quan trọng nhất, nó chuyển qua một trạng thái phụ mà trong đó người dùng tạm thời có một phiên đăng nhập hợp lệ, nhưng MFA vẫn chưa được thực thi. Một kẻ tấn công có khả năng khai thác điều này bằng cách gửi một yêu cầu đăng nhập cùng lúc với một yêu cầu đến một endpoint nhạy cảm, đã được xác thực.

Vì các lỗ hổng này khá đặc thù cho từng ứng dụng, điều quan trọng là trước tiên phải hiểu methodology rộng hơn mà ta cần áp dụng để xác định chúng một cách hiệu quả, cả trong các bài Lab và trong thực tế.

_Tại sao Lập trình viên lại mắc lỗi này?_ Lập trình viên thường tư duy theo dòng chảy tuyến tính:

* _Bước 1:_ Gán User vào Session (Để hệ thống biết là ai đang login).
* _Bước 2:_ Kiểm tra xem User này có bật 2FA không.
* _Bước 3:_ Nếu có, đánh dấu cờ "Cần nhập OTP".

Họ nghĩ rằng: "Mọi thứ diễn ra trong vài mili-giây, làm sao mà user kịp làm gì được?". Nhưng với Race Condition, vài mili-giây giữa _Bước 1_ và _Bước 3_ là cả một thế kỷ. Tại thời điểm _Bước 1_ vừa chạy xong, trong bộ nhớ Server (RAM/Redis), cái Session ID đó đã "Sạch" (Authenticated) và chưa bị dính cái cờ "Cần nhập OTP".

Hacker sẽ gửi 2 request song song (dùng kỹ thuật Single-packet attack):

* Request A (Login): Kích hoạt đoạn code trên.
* Request B (Get Admin Panel): Kèm theo cookie của session (nếu đoán được hoặc session cố định).
* Nếu Request B đến Server đúng vào lúc Request A vừa chạy xong dòng 1 nhưng chưa chạy dòng 3 -> Bypass thành công.

## Methodology (Phương pháp luận)

Để phát hiện và khai thác các chuỗi đa bước ẩn, chúng tôi đề xuất phương pháp sau đây, được tóm tắt từ whitepaper _Smashing the state machine: The true potential of web race conditions_ bởi PortSwigger Research.

#### 1 - Predict potential collisions (Dự đoán các va chạm tiềm năng)

Việc kiểm thử mọi endpoint là không thực tế. Sau khi lập bản đồ trang web mục tiêu như bình thường, bạn có thể giảm số lượng endpoint cần kiểm thử bằng cách tự đặt các câu hỏi sau:

* Endpoint này có quan trọng về bảo mật không? Nhiều endpoint không đụng đến các chức năng quan trọng, vì vậy chúng không đáng để kiểm thử.
* Có tiềm năng va chạm không? Để có một va chạm thành công, bạn thường cần hai hoặc nhiều yêu cầu kích hoạt các thao tác trên cùng một bản ghi (same record). Ví dụ, hãy xem xét các biến thể sau của việc triển khai đặt lại mật khẩu:
  * Với ví dụ thứ nhất, việc yêu cầu đặt lại mật khẩu song song cho hai người dùng khác nhau khó có khả năng gây va chạm vì nó dẫn đến thay đổi trên hai bản ghi khác nhau.
  * Tuy nhiên, cách triển khai thứ hai cho phép bạn chỉnh sửa cùng một bản ghi với các yêu cầu cho hai người dùng khác nhau.

#### 2 - Probe for clues (Dò tìm manh mối)

Để nhận ra manh mối, trước tiên bạn cần đo điểm chuẩn (benchmark) xem endpoint hoạt động như thế nào trong điều kiện bình thường. Bạn có thể làm điều này trong Burp Repeater bằng cách nhóm tất cả các yêu cầu của bạn và sử dụng tùy chọn Send group in sequence (Gửi nhóm theo trình tự - các kết nối riêng biệt).

Tiếp theo, gửi cùng nhóm yêu cầu đó cùng một lúc bằng cách sử dụng kỹ thuật tấn công gói đơn (hoặc đồng bộ byte cuối nếu HTTP/2 không được hỗ trợ) để giảm thiểu độ trễ mạng (jitter). Bạn có thể làm điều này trong Burp Repeater bằng cách chọn tùy chọn Send group in parallel (Gửi nhóm song song). Hoặc, bạn có thể sử dụng tiện ích mở rộng Turbo Intruder có sẵn trên BApp Store.

Bất cứ điều gì cũng có thể là manh mối. Chỉ cần tìm kiếm một số dạng sai lệch (deviation) so với những gì bạn đã quan sát được trong quá trình đo điểm chuẩn. Điều này bao gồm sự thay đổi trong một hoặc nhiều phản hồi, nhưng đừng quên các hiệu ứng bậc hai (second-order effects) như nội dung email khác nhau hoặc sự thay đổi rõ ràng trong hành vi của ứng dụng sau đó.

_Tại sao phải "Benchmark"?_ Đây là bước so sánh đối chứng (Control Group).

* Gửi request A rồi đến B (Sequence) -> Server trả về kết quả X.
* Gửi request A và B cùng lúc (Parallel) -> Server trả về kết quả Y.
* Nếu X khác Y (về độ dài, mã lỗi, thời gian phản hồi...) -> Có biến! (Đây chính là "Clue").
* Nếu không gửi tuần tự trước, ta sẽ không biết kết quả Y đó là do lỗi hay là tính năng bình thường của Web.

#### 3 - Prove the concept (Chứng minh khái niệm)

Cố gắng hiểu chuyện gì đang xảy ra, loại bỏ các yêu cầu thừa thãi, và đảm bảo bạn vẫn có thể tái hiện các hiệu ứng đó.

Các race condition nâng cao có thể gây ra các nguyên thủy (primitives) bất thường và độc đáo, vì vậy con đường dẫn đến tác động tối đa không phải lúc nào cũng rõ ràng ngay lập tức. Có thể sẽ hữu ích khi coi mỗi race condition như một điểm yếu cấu trúc **(structural weakness)** hơn là một lỗ hổng cô lập. Race Condition thường không phải là do code sai một dòng lệnh (như SQL Injection), mà do Thiết kế hệ thống (System Design) sai lầm ngay từ đầu khi xử lý đa luồng.&#x20;

Ví dụ: Việc lưu trữ state tạm thời vào một biến toàn cục thay vì biến cục bộ của Session là một lỗi thiết kế dẫn đến Race Condition, dù code logic `if/else` vẫn đúng.

## Multi-endpoint race conditions (Race condition đa điểm cuối)

Có lẽ dạng trực quan nhất của các race condition này là những dạng liên quan đến việc gửi yêu cầu đến nhiều endpoint cùng một lúc.

Hãy nghĩ về lỗi logic cổ điển trong các cửa hàng trực tuyến, nơi bạn thêm một mặt hàng vào giỏ hàng, thanh toán cho nó, sau đó thêm nhiều mặt hàng hơn vào giỏ hàng trước khi thực hiện duyệt bắt buộc (force-browsing) tới trang xác nhận đơn hàng.

> Lưu ý Nếu bạn chưa quen với cách khai thác này, hãy xem bài Lab "Insufficient workflow validation" trong chủ đề Lỗ hổng logic nghiệp vụ của chúng tôi.

Một biến thể của lỗ hổng này có thể xảy ra khi việc xác thực thanh toán và xác nhận đơn hàng được thực hiện trong quá trình xử lý của một yêu cầu duy nhất. Máy trạng thái (state machine) cho trạng thái đơn hàng có thể trông giống như sau:

Trong trường hợp này, bạn có khả năng thêm nhiều mặt hàng vào giỏ hàng của mình trong cửa sổ cuộc đua nằm giữa thời điểm thanh toán được xác thực và thời điểm đơn hàng cuối cùng được xác nhận.

#### Aligning multi-endpoint race windows (Căn chỉnh các cửa sổ cuộc đua đa điểm cuối)

Khi kiểm thử các race condition đa điểm cuối, bạn có thể gặp vấn đề khi cố gắng xếp hàng các cửa sổ cuộc đua cho từng yêu cầu, ngay cả khi bạn gửi tất cả chúng vào chính xác cùng một thời điểm bằng kỹ thuật tấn công gói đơn.

Vấn đề phổ biến này chủ yếu do hai yếu tố sau gây ra:

1. Độ trễ do kiến trúc mạng: Ví dụ, có thể có độ trễ bất cứ khi nào máy chủ front-end thiết lập kết nối mới tới back-end. Giao thức được sử dụng cũng có thể có tác động lớn.
2. Độ trễ do xử lý đặc thù của endpoint: Các endpoint khác nhau vốn dĩ có thời gian xử lý khác nhau, đôi khi chênh lệch đáng kể, tùy thuộc vào hoạt động mà chúng kích hoạt (ví dụ: truy vấn DB nặng hay nhẹ).

May mắn thay, có những giải pháp tiềm năng cho cả hai vấn đề này.

#### Connection warming (Làm nóng kết nối)

Độ trễ kết nối back-end thường không can thiệp vào các cuộc tấn công race condition vì chúng thường làm chậm các yêu cầu song song một cách đều nhau, do đó các yêu cầu vẫn được đồng bộ.

Điều cần thiết là phải phân biệt được những độ trễ này với những độ trễ do các yếu tố đặc thù của endpoint gây ra. Một cách để làm điều này là "làm nóng" kết nối bằng một hoặc nhiều yêu cầu không quan trọng (inconsequential requests) để xem liệu điều này có làm mượt các thời gian xử lý còn lại hay không. Trong Burp Repeater, bạn có thể thử thêm một yêu cầu `GET` cho trang chủ vào đầu nhóm tab của mình, sau đó sử dụng tùy chọn Send group in sequence (single connection).

* Nếu yêu cầu đầu tiên vẫn có thời gian xử lý lâu hơn, nhưng các yêu cầu còn lại hiện được xử lý trong một cửa sổ ngắn, bạn có thể bỏ qua độ trễ rõ ràng đó và tiếp tục kiểm thử như bình thường.
* Nếu bạn vẫn thấy thời gian phản hồi không nhất quán trên một endpoint duy nhất, ngay cả khi sử dụng kỹ thuật gói đơn, đây là dấu hiệu cho thấy độ trễ back-end đang can thiệp vào cuộc tấn công của bạn. Bạn có thể khắc phục điều này bằng cách sử dụng Turbo Intruder để gửi một số yêu cầu làm nóng kết nối trước khi tiếp tục với các yêu cầu tấn công chính.

#### Abusing rate or resource limits (Lạm dụng giới hạn tốc độ hoặc tài nguyên)

Nếu việc làm nóng kết nối không tạo ra sự khác biệt, có nhiều giải pháp khác cho vấn đề này.

Sử dụng Turbo Intruder, bạn có thể đưa vào một độ trễ ngắn phía máy khách (client-side delay). Tuy nhiên, vì điều này liên quan đến việc chia tách các yêu cầu tấn công thực tế của bạn qua nhiều gói TCP, bạn sẽ không thể sử dụng kỹ thuật tấn công gói đơn. Do đó, trên các mục tiêu có độ trễ biến thiên cao (high-jitter targets), cuộc tấn công khó có thể hoạt động đáng tin cậy bất kể bạn đặt độ trễ là bao nhiêu.

Thay vào đó, bạn có thể giải quyết vấn đề này bằng cách lạm dụng một tính năng bảo mật phổ biến.

Các máy chủ web thường trì hoãn việc xử lý các yêu cầu nếu có quá nhiều yêu cầu được gửi quá nhanh. Bằng cách gửi một số lượng lớn các yêu cầu giả (dummy requests) để cố tình kích hoạt giới hạn tốc độ hoặc tài nguyên, bạn có thể gây ra một độ trễ phía máy chủ (server-side delay) phù hợp. Điều này làm cho cuộc tấn công gói đơn trở nên khả thi ngay cả khi yêu cầu thực thi bị trì hoãn.

## Single-endpoint race conditions (Race condition đơn điểm cuối)

Việc gửi các yêu cầu song song với các giá trị khác nhau đến một endpoint duy nhất đôi khi có thể kích hoạt các race condition mạnh mẽ.

Hãy xem xét một cơ chế đặt lại mật khẩu lưu trữ ID người dùng và token đặt lại trong phiên làm việc (session) của người dùng.

Trong kịch bản này, việc gửi hai yêu cầu đặt lại mật khẩu song song từ cùng một phiên, nhưng với hai tên người dùng khác nhau, có khả năng gây ra sự va chạm sau:

Hãy chú ý trạng thái cuối cùng khi tất cả các hoạt động hoàn tất:

* `session['reset-user'] = victim`
* `session['reset-token'] = 1234`

Phiên làm việc hiện chứa ID người dùng của nạn nhân, nhưng token đặt lại hợp lệ (1234) lại được gửi cho kẻ tấn công.

> Lưu ý Để cuộc tấn công này hoạt động, các hoạt động khác nhau được thực hiện bởi mỗi tiến trình phải xảy ra theo đúng thứ tự. Nó có thể sẽ yêu cầu thử nhiều lần, hoặc một chút may mắn, để đạt được kết quả mong muốn.

Xác nhận địa chỉ email, hoặc bất kỳ hoạt động nào dựa trên email, thường là mục tiêu tốt cho các race condition đơn điểm cuối. Các email thường được gửi trong một luồng nền (background thread) sau khi máy chủ phát hành phản hồi HTTP cho máy khách, làm cho các race condition dễ xảy ra hơn.

## Session-based locking mechanisms (Cơ chế khóa dựa trên phiên)

Một số framework cố gắng ngăn chặn việc hỏng dữ liệu ngẫu nhiên (accidental data corruption) bằng cách sử dụng một số dạng khóa yêu cầu (request locking). Ví dụ, mô-đun xử lý session gốc của PHP chỉ xử lý một yêu cầu trên mỗi session tại một thời điểm.

Việc phát hiện ra hành vi này là cực kỳ quan trọng vì nếu không nó có thể che giấu các lỗ hổng dễ dàng khai thác. Nếu bạn nhận thấy rằng tất cả các yêu cầu của bạn đang được xử lý một cách tuần tự (sequentially), hãy thử gửi từng yêu cầu bằng cách sử dụng một token phiên (session token) khác nhau.