## 2024-05-15 - Node.js native routing path traversal vulnerability
**Vulnerability:** Path traversal possible by bypassing `startsWith(PUBLIC_DIR)` using URL-encoded sequences (`%2E%2E%2F`) combined with partial directory matching (e.g. `public-secret`).
**Learning:** `new URL()` does not normalize URL-encoded path separators. If `decodeURIComponent()` is called afterwards, the string contains active traversal elements (`../`) that bypass simple prefix matching but are eventually resolved by `path.join`, leading to arbitrary file access outside the intended directory.
**Prevention:** Always use `path.relative(ROOT, filePath)` and check if it starts with `..` or is absolute to enforce strict boundaries.
