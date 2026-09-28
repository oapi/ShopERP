
## 2024-10-27 - Path Traversal bypass via `startsWith` and partial directory match
**Vulnerability:** A static file server used `filePath.startsWith(PUBLIC_DIR)` to protect out-of-bounds files. Because `PUBLIC_DIR` did not have a trailing slash (e.g. `/app/public`), a user could navigate to a sibling directory starting with the same prefix (e.g. `/app/public-secret`) by encoding path separators in the request like `/..%2fpublic-secret`.
**Learning:** Checking `startsWith` on absolute paths without a trailing slash does not ensure directory boundaries. Further, `new URL().pathname` followed by `decodeURIComponent()` decodes `..%2f` to `../`, changing the parsed structure.
**Prevention:** Always use `path.relative(baseDir, targetDir)` and verify that the relative path is not `..`, does not start with `..` followed by `path.sep`, and is not an absolute path.
