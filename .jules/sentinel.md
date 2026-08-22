## 2024-05-15 - Path Traversal bypass via `startsWith`
**Vulnerability:** The static file handler in `server.js` used `filePath.startsWith(PUBLIC_DIR)` to prevent path traversal. However, if `PUBLIC_DIR` is `/app/public` and a user requests `/..%2fpublic-secrets/secret.txt`, `path.normalize` resolves to `/app/public-secrets/secret.txt`. Since `/app/public-secrets/secret.txt` starts with `/app/public`, the check incorrectly passes, exposing sibling directories.
**Learning:** `startsWith` is vulnerable to prefix bypasses when checking directory boundaries because it performs a string comparison, not a path-aware containment check.
**Prevention:** Always use `path.relative(baseDir, resolvedPath)` and verify that the result does not start with `..` or equal `..`, and is not an absolute path.
