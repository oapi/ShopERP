## 2023-10-23 - Path Boundary Validation
**Issue:** Node.js static file serving validated boundaries using `filePath.startsWith(PUBLIC_DIR)`, which is unreliable for prefix-matching when handling encoded sequences like `/%2e%2e%2f`.
**Learning:** `new URL()` does not decode `%2f`, bypassing initial normalization. When decoded later, strings like `/app/public_secret.txt` will still pass `startsWith('/app/public')` despite escaping the intended directory.
**Prevention:** Always use `path.relative(ROOT, filePath)` and verify the result does not start with `..` and is not absolute. Return a generic 404 instead of 403 to prevent path existence leakage.
