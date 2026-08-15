## 2024-05-15 - [Path Traversal Sibling Directory Bypass]
**Vulnerability:** Path traversal sibling directory bypass in static file server due to using `startsWith` for path validation.
**Learning:** Checking `path.normalize(p).startsWith(PUBLIC_DIR)` is vulnerable if there is a directory named `public_secret` in the same parent directory as `public`. `startsWith` would return true for `/app/public_secret` because it starts with `/app/public`.
**Prevention:** Always use `path.relative(baseDir, targetDir)` and verify the result does not equal `..`, start with `..` + `path.sep`, or resolve to an absolute path to securely validate boundaries.
