## 2026-09-08 - Fix path traversal vulnerability in static file serving
**Vulnerability:** The static file serving logic used `.startsWith()` for boundary verification against a directory path (`/app/public`) without a trailing slash. This allowed arbitrary access to any directory sharing the same prefix (e.g., `/app/public-secret`), leading to a path traversal vulnerability.
**Learning:** `filePath.startsWith(PUBLIC_DIR)` is inadequate if `PUBLIC_DIR` doesn't end with a path separator (`/`), causing partial directory name matches.
**Prevention:** Use `path.relative(DIRECTORY, filePath)` and strictly verify that the resulting relative path doesn't traverse upwards (`relativePath === '..' || relativePath.startsWith('..' + path.sep) || path.isAbsolute(relativePath)`).
