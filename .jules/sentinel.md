## 2023-10-25 - Fix prefix-matching boundary bypass
**Vulnerability:** Node.js static file serving validated boundaries using `filePath.startsWith(PUBLIC_DIR)` without a trailing slash, allowing access to sibling directories (e.g., `/app/public_secret` via `../public_secret`) if `decodeURIComponent` reintroduces traversal sequences.
**Learning:** `new URL()` does not decode `%2f` (slash) as a directory separator, meaning paths bypass URL normalization. Prefix matching for path traversal mitigation is flawed.
**Prevention:** Use `path.relative` to ensure the relative path does not start with `..` and is not absolute, and return a generic 404 to prevent path existence leakage.
