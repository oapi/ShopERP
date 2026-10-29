## 2026-10-29 - Prefix-Matching Path Traversal
**Vulnerability:** Node.js static file serving using `startsWith(PUBLIC_DIR)` without a trailing slash allows prefix-matching path traversal (e.g., accessing sibling directories like `/app/public_secret` using `../public_secret`).
**Learning:** `path.normalize` and `path.join` resolve `../` sequences, but if the resolved path starts with the prefix of `PUBLIC_DIR`, `startsWith` fails to block it.
**Prevention:** Use `path.relative(PUBLIC_DIR, filePath)` and ensure it does not start with `..` and is not absolute. Return 404 to avoid leaking path existence.
