## 2024-05-01 - Fix path traversal vulnerability in static file serving
**Vulnerability:** Path traversal possible due to insecure `startsWith(PUBLIC_DIR)` check in Node.js native server static file handling.
**Learning:** Checking if a resolved path starts with a directory path string is vulnerable to sibling directory bypasses. For instance, if `PUBLIC_DIR` is `/app/public`, a path like `/app/public-dev/secrets.txt` will pass the `startsWith` check but points to a different, potentially sensitive sibling directory.
**Prevention:** Use `path.relative(baseDir, resolvedPath)` and verify the relative path does not equal `..`, start with `..` followed by `path.sep`, and is not an absolute path (`path.isAbsolute`).
