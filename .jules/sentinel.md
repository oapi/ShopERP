## 2026-08-09 - Fix Path Traversal via Sibling Directory Bypass
**Vulnerability:** A static file server used `filePath.startsWith(PUBLIC_DIR)` to verify that requested files were within the public directory.
**Learning:** `startsWith` is vulnerable to sibling directory attacks if the requested path starts with the same string as the target directory (e.g. `/app/public` and `/app/public-secret`).
**Prevention:** Use `path.relative(baseDir, targetDir)` and check that the resulting relative path does not equal `..`, does not start with `..` + `path.sep`, and is not an absolute path.
