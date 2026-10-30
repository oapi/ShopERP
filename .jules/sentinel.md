## 2026-10-30 - Path Traversal in Static File Serving
**Vulnerability:** Path traversal vulnerability allowing access to files outside `PUBLIC_DIR` by using URL-encoded sequences like `/%2e%2e%2f`.
**Learning:** `new URL()` does not decode `%2f` (slash) as a directory separator, meaning paths like `/%2e%2e%2f` bypass URL normalization. When `decodeURIComponent()` is applied after `new URL()`, it reintroduces path traversal sequences (`../`) that evade initial URL parsing and subsequent `startsWith` prefix matching.
**Prevention:** Always use `path.relative(PUBLIC_DIR, filePath)` and ensure it does not start with `..` and is not absolute to validate boundaries properly. Return a generic 404 to prevent path existence leakage.
