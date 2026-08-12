## 2026-08-12 - Prevent Clickjacking on Static Branch
**Vulnerability:** Clickjacking due to `frame-ancestors` directive not being supported in CSP `<meta>` tags.
**Learning:** When securing a static branch (e.g. 'gh-pages') and HTTP headers cannot be set, relying on `<meta>` tag CSP for anti-clickjacking is insufficient.
**Prevention:** Implement a client-side frame-busting script (inline style + script) directly in `index.html` to prevent framing.
