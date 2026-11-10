## 2025-03-08 - Path Traversal in Static File Serving
**Vulnerability:** Node.js `new URL()` does not decode `%2f` as a directory separator. Using `decodeURIComponent` after `new URL()` can reintroduce path traversal sequences (`../`) that bypass initial parsing and standard string-based prefix checks (e.g. `filePath.startsWith(PUBLIC_DIR)`).
**Learning:** Path normalization and resolution should always be strictly validated using `path.relative` to ensure the resolved path does not start with `..` and is not absolute, rather than relying on prefix string matching.
**Prevention:** Always use `path.relative(baseDir, targetDir)` and check that the relative path is secure (does not start with `..` and is not absolute). Return generic 404s to avoid disclosing path existence.
