## 2024-05-15 - Prevent URL Decoded Path Traversal
**Vulnerability:** Static file serving was vulnerable to path traversal where paths prefixed with URL-encoded sequences (`/%2e%2e%2f`) bypassed initial `startsWith` validation, leaking file existence (403) or content.
**Learning:** `new URL()` does not normalize encoded slashes (`%2f`). Applying `decodeURIComponent` after `new URL` parsing reintroduces traversal characters (`../`), allowing them to bypass prefix checks. Furthermore, returning 403 on traversal attempts leaks the existence of sensitive sibling files.
**Prevention:** Always use `path.relative()` to compute the path difference, and check that the resulting path does not start with `..` and is not absolute. Return a generic 404 response to avoid leaking file presence.
