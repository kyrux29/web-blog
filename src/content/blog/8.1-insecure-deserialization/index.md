---
title: "8.1 - Insecure deserialization"
date: 2026-05-14
category: "Tutorial"
series: "Insecure deserialization"
seriesOrder: 8
tags: []
draft: false
---

<figure><img src="./images/image (5).png" alt=""><figcaption></figcaption></figure>

## Serialization là gì?

Serialization là quá trình chuyển đổi các dạng cấu trúc dữ liệu phức tạp, như là object và các fields của chúng, trở thành một dạng "phẳng" hơn để có thể gửi và nhận dưới dạng các luồng bytes tuần tự. Tuần sự hóa data khiến cho chung trở nên đơn giản hơn để:

* Ghi dữ liệu phức tạp vào các inter-process memory, file hoặc database
* Gửi dữ liệu phức tạp, chẳng hạn như qua mạng, giữa các thành phần khác nhau của ứng dụng hoặc trong lệnh gọi API

Điều quan trọng là khi serializing một đối tượng, các trạng thái của chúng phải được duy trì, nghĩa là các thuộc tính của đối tượng phải được giữ nguyên cùng với các giá trị được gán của chúng.

### Serialization vs deserialization

Deserialization là quá trình khôi phục một luồng byte trở thành một bản sao với đầy đủ các chức năng của đối tượng gốc, và ở trạng thái chính xác như lúc nó được serialization. Các logic của website có thể tương tác với chúng như các object bình thường khác.

<figure><img src="./images/image (2).png" alt=""><figcaption></figcaption></figure>

Nhiều ngôn ngữ lập trình cung cấp các hỗ trợ chính thức cho việc serialization. Các objects được tuần tự hóa như thế nào dựa vào ngôn ngữ. Một số ngôn ngữ tuần tự hóa các objects trở thành dạng binary, trong khi đó một số khác ở dạng string,.... Một lưu ý là tất cả các thuộc tính nguyên bản của object phải được lưu trữ trong luồng data, bao gồm cả các trường private. Để ngăn một trường được tuần tự hóa, trường đó phải được đánh dấu rõ ràng là "tạm thời" trong phần khai báo lớp.

Lưu ý rằng khi làm việc với các ngôn ngữ lập trình khác nhau, serialization có thể được gọi là marshalling (Ruby) hay pickling (Python). Và những thuật ngữ này đều đồng nghĩa với seriarization trong context này.

## Vậy thì insecure deserialization (giải mã tuần tự hóa không an toàn) là gì?

Insecure deserialization xảy ra khi một trang web thực hiện quá trình giải tuần tự hóa dữ liệu do người dùng kiểm soát. Điều này có khả năng cho phép kẻ tấn công thao túng các serialized objects  nhằm đưa dữ liệu độc hại vào mã nguồn của ứng dụng.

Thậm chí, kẻ tấn công có thể thay thế một đối tượng tuần tự hóa bằng một đối tượng thuộc về một class (lớp) hoàn toàn khác. Đáng lo ngại là bất kỳ đối tượng nào thuộc các class sẵn có trên hệ thống web đều sẽ bị giải tuần tự hóa và khởi tạo (instantiated), bất kể ứng dụng đang mong đợi class nào. Vì lý do này, insecure deserialization đôi khi còn được gọi là lỗ hổng "object injection" (chèn đối tượng).

Một đối tượng thuộc class không mong đợi có thể gây ra ngoại lệ (exception). Tuy nhiên, tại thời điểm đó, thiệt hại có thể đã xảy ra rồi. Nhiều cuộc tấn công dựa trên deserialization đã hoàn tất _trước khi_ quá trình giải tuần tự hóa kết thúc. Điều này có nghĩa là bản thân quá trình deserialization có thể kích hoạt một cuộc tấn công, ngay cả khi các chức năng của trang web không trực tiếp tương tác với đối tượng độc hại đó. Do đó, các trang web có logic dựa trên các ngôn ngữ lập trình kiểu tĩnh (strongly typed languages) vẫn có thể bị tổn thương bởi các kỹ thuật này.

## Lỗ hổng Insecure Deserialization phát sinh như thế nào?

Insecure deserialization (Giải tuần tự hóa không an toàn) thường phát sinh do sự thiếu hiểu biết chung về mức độ nguy hiểm của việc giải tuần tự hóa các dữ liệu do người dùng kiểm soát (user-controllable data). Lý tưởng nhất là không bao giờ nên giải tuần tự hóa dữ liệu đầu vào của người dùng.

Tuy nhiên, đôi khi các chủ sở hữu trang web nghĩ rằng họ an toàn vì họ đã triển khai một số hình thức kiểm tra bổ sung đối với dữ liệu đã được giải tuần tự hóa. Cách tiếp cận này thường không hiệu quả vì gần như không thể triển khai validation hoặc sanitization để tính đến mọi tình huống có thể xảy ra. Những bước kiểm tra này về cơ bản cũng có lỗ hổng vì chúng dựa trên việc kiểm tra dữ liệu _sau khi_ nó đã được giải tuần tự hóa, điều mà trong nhiều trường hợp là quá muộn để ngăn chặn cuộc tấn công.

Lỗ hổng cũng có thể phát sinh do các đối tượng được giải tuần tự hóa thường được mặc định là đáng tin cậy. Đặc biệt là khi sử dụng các ngôn ngữ có định dạng tuần tự hóa nhị phân (binary serialization format), các lập trình viên có thể nghĩ rằng người dùng không thể đọc hoặc thao túng dữ liệu một cách hiệu quả. Tuy nhiên, dù có thể đòi hỏi nhiều công sức hơn, kẻ tấn công hoàn toàn có thể khai thác các đối tượng tuần tự hóa nhị phân giống như cách chúng khai thác các định dạng dựa trên chuỗi (string-based formats).

Các cuộc tấn công dựa trên deserialization cũng trở nên khả thi do số lượng lớn các dependencies tồn tại trong các trang web hiện đại. Một trang web điển hình có thể tích hợp nhiều thư viện khác nhau, và mỗi thư viện lại có các dependencies riêng của chúng. Điều này tạo ra một lượng khổng lồ các classes và methods rất khó để quản lý an toàn. Vì kẻ tấn công có thể tạo ra các instances của bất kỳ class nào trong số này, nên rất khó để dự đoán method nào có thể được gọi lên dữ liệu độc hại. Điều này đặc biệt đúng nếu kẻ tấn công có thể liên kết (chain) một chuỗi dài các lời gọi method không lường trước được, truyền dữ liệu vào một sink hoàn toàn không liên quan đến nguồn ban đầu. Do đó, gần như không thể dự đoán được luồng đi của dữ liệu độc hại và bịt kín mọi lỗ hổng tiềm ẩn.

Tóm lại, có thể khẳng định rằng việc giải tuần tự hóa các đầu vào không đáng tin cậy một cách an toàn là điều không thể.

## Tác động của Insecure Deserialization là gì?

Tác động của insecure deserialization có thể rất nghiêm trọng vì nó cung cấp một entry point làm tăng đáng kể attack surface. Nó cho phép kẻ tấn công tái sử dụng các đoạn code có sẵn của ứng dụng theo những cách gây hại, dẫn đến vô số lỗ hổng khác, thường là Remote Code Execution (Thực thi mã từ xa).

Ngay cả trong những trường hợp không thể RCE, insecure deserialization vẫn có thể dẫn đến privilege escalation, arbitrary file access và các cuộc tấn công DOS.