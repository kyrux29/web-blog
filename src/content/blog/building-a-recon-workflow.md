---
title: "Building a Fast Recon Workflow"
date: 2026-04-18
description: "A practical checklist for enumerating modern web targets efficiently."
tags:
  - recon
  - automation
  - osint
draft: false
---

Good recon creates reliable attack surface maps before exploitation starts.

## Core stack

- `subfinder` for passive domain discovery
- `httpx` to probe live services
- `nuclei` for template-based checks

```bash
subfinder -d target.tld -silent | httpx -silent | tee live-hosts.txt
```
