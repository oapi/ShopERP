## 2024-05-15 - Prevent Path Boundary Enforcement Issue via Prefix Matching
**Issue:** Static file serving checked boundary with `filePath.startsWith(PUBLIC_DIR)`. Without a trailing slash, this allowed prefix matching.
**Learning:** `startsWith` on paths without a trailing slash is insufficient to enforce boundary into sibling directories that share a common prefix.
**Prevention:** Use `path.relative(PUBLIC_DIR, filePath)` and ensure it does not start with `..` and is not an absolute path. Return a generic 404 instead of 403 to prevent path existence leakage.
