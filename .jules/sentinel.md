## $(date +%Y-%m-%d) - Fix Path Traversal in Static File Serving
**Vulnerability:** Path Traversal via URL-encoded characters and partial directory matching.
**Learning:** In Node.js native routing, `new URL()` does not normalize URL-encoded path separators (e.g., `%2E%2E%2F`). If `decodeURIComponent()` is called on `url.pathname` afterwards, the encoded sequences become active traversal elements (`../`), which bypasses simple prefix matching like `startsWith()`. This enforces the requirement to use `path.relative(PUBLIC_DIR, filePath)` for final boundary validation.
**Prevention:** Always use `path.relative()` and check against `..` and absolute paths instead of relying on string prefix matching (like `startsWith()`) when verifying directory boundaries for file access.
