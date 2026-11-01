## 2024-05-24 - Prefix-matching Path Traversal in Static Server
**Vulnerability:** Node.js static file serving validated boundaries using `filePath.startsWith(PUBLIC_DIR)`. Because `PUBLIC_DIR` lacks a trailing slash, paths like `../public_secret/` can successfully match the prefix (e.g. `/app/public` matches `/app/public_secret`).
**Learning:** Checking string prefixes for path validation without a trailing directory separator is insufficient and allows traversal to sibling directories.
**Prevention:** Use `path.relative(BASE_DIR, targetPath)` and ensure the result doesn't start with `..` and is not absolute. Also return a 404 instead of 403 to prevent path existence leakage.
