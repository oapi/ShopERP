## 2026-10-10 - Path Traversal bypass via decodeURIComponent after new URL
**Vulnerability:** Path traversal in static file handler bypassing prefix check.
**Learning:** In Node.js native routing, `new URL()` does not normalize URL-encoded path separators (e.g., `%2E%2E%2F`). If `decodeURIComponent()` is called on `url.pathname` afterwards, the encoded sequences become active traversal elements (`../`), which bypasses simple prefix matching like `startsWith()`. This enforces the requirement to use `path.relative(PUBLIC_DIR, filePath)` for final boundary validation.
**Prevention:** Always use `path.relative()` to validate file boundaries after full decoding and normalization.
