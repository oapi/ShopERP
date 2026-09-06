## 2025-02-06 - Path Boundary Bypass in Node.js Static File Serving
**Vulnerability:** A path traversal vulnerability existed in the static file serving logic due to the use of `startsWith()` for path boundary validation.
**Learning:** `new URL()` does not normalize URL-encoded path separators (`%2E%2E%2F`). After `decodeURIComponent()` is called on `url.pathname`, encoded sequences become active traversal elements (`../`), bypassing simple prefix matching like `startsWith()`. This is particularly dangerous for Node.js native routing.
**Prevention:** Always use `path.relative(PUBLIC_DIR, filePath)` and check if the relative path starts with `..` or is absolute to enforce strict boundaries.
