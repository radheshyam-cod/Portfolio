## 2024-08-14 - Clickjacking Defense on Static Branch
**Vulnerability:** The application was vulnerable to clickjacking because it relied on a `<meta>` tag for its Content Security Policy (CSP), but the `frame-ancestors` directive is ignored by browsers when delivered via a meta tag.
**Learning:** For compiled static artifacts (e.g., gh-pages) where HTTP response headers cannot be configured, CSP alone is insufficient for clickjacking protection.
**Prevention:** Always implement a client-side frame-busting script (e.g., an inline style that hides the body unless `self === top`) directly in `index.html` on static branches to ensure cross-frame restrictions are enforced.
