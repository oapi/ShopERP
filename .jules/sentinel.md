## 2026-08-12 - startsWith Path Traversal Bypass
**Vulnerability:** Sibling directory path traversal vulnerability (e.g. accessing `/app/public_secret` instead of `/app/public`).
**Learning:** Checking path containment with `startsWith` (e.g., `filePath.startsWith('/app/public')`) is insecure because it matches any path prefix, including sibling directories like `/app/public_secret/flag.txt`.
**Prevention:** Use `path.relative(baseDir, filePath)` and ensure the result is not `..`, doesn't start with `..` + `path.sep`, and is not an absolute path to strictly enforce directory containment.
