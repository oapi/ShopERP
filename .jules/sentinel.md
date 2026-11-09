## 2024-11-09 - Path Traversal bypass with prefix-matching
**Vulnerability:** Static file serving uses `filePath.startsWith(PUBLIC_DIR)` which is vulnerable to prefix-matching path traversal, allowing access to sibling directories (e.g., `/app/public_secret` via `../public_secret`).
**Learning:** `startsWith` on strings is insufficient for path boundary validation. If `PUBLIC_DIR` is `/app/public` and requested file normalizes to `/app/public_secret/test.txt`, `startsWith` returns `true` because `/app/public` is a prefix of `/app/public_secret/test.txt`.
**Prevention:** Use trailing slashes or properly validate with `path.relative` to ensure the requested path is actually a subdirectory of the target.
