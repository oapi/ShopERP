## 2026-10-21 - Prefix-Matching Path Traversal
**Vulnerability:** Static file handler used `filePath.startsWith(PUBLIC_DIR)` which allows access to sibling directories (e.g. `/app/public_secret` matches `/app/public`).
**Learning:** String prefix checks without trailing slashes are an insecure pattern for directory boundaries in Node.js.
**Prevention:** Always use `path.relative(DIR, filePath)` and assert it doesn't start with `..` and is not absolute, and fail securely with 404 instead of 403 to prevent path enumeration.
