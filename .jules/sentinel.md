## 2024-08-14 - Fix Path Traversal in Static File Server
**Vulnerability:** The static file server used `!filePath.startsWith(PUBLIC_DIR)` to validate paths. Due to the way path normalization and URI decoding interacted, it allowed a malicious user to access files in sibling directories (like `public-secrets`) using URL-encoded path traversal sequences (e.g., `/..%2fpublic-secrets%2fsecret.txt`).
**Learning:** `startsWith` is insufficient for preventing path traversal as it can be bypassed if the requested path is a sibling directory that shares the same prefix.
**Prevention:** Always use `path.relative(baseDir, resolvedPath)` and ensure the result does not equal '..', start with '..' + path.sep, or resolve to an absolute path.
