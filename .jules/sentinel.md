## 2026-10-26 - Static File Serving Boundary Enforcement
**Vulnerability:** Static file server path validation allowed bypassing restrictions due to prefix-matching (`filePath.startsWith(PUBLIC_DIR)`) without trailing slashes and decoding URL components after `new URL()`.
**Learning:** `new URL()` doesn't decode URL encoded slashes, and basic prefix matching is insecure as it allows accessing sibling directories with the same prefix. `path.relative` is necessary for robust boundary checking.
**Prevention:** Always use `path.relative` combined with checking for `..` or absolute paths, and use generic 404 responses instead of 403 to prevent path existence leakage.
