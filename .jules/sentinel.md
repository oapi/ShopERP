## 2024-05-18 - Path Traversal bypass via missing trailing slash and url encoding
**Vulnerability:** Path traversal possible because `filePath.startsWith(PUBLIC_DIR)` was used to check file boundaries, but `PUBLIC_DIR` lacked a trailing slash.
**Learning:** This permitted partial directory name matches (e.g. `public-secret` starting with `public`). In addition, `new URL()` does not normalize URL-encoded path separators like `%2E%2E%2F`. When `decodeURIComponent()` is called afterward, the encoded sequences become active traversal elements (`../`), bypassing basic prefix matching.
**Prevention:** Use `path.relative()` to correctly evaluate if a resolved path attempts to escape the root boundary.
