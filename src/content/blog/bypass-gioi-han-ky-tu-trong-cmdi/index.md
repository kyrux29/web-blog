---
title: "BYPASS giới hạn ký tự trong cmdi"
date: 2026-05-14
category: "Tutorial"
series: "Các kỹ thuật đặc biệt"
seriesOrder: 9
tags: []
draft: false
---

Trong các challenge CTF về OS command injection, ta sẽ gặp những challenge không những block các ký tự hay dùng mà còn giới hạn cả số lượng ký tự. Dẫn đêns việc file flag đã tìm thấy nhưng không thể `cat` được vì tên file dài hơn số ký tự cho phép.

Để giải quyết vấn đề này, ta có thể inject từng ký tự một của flag vào một file sau đó dùng \`sh \<tên file>\` để thực thi.