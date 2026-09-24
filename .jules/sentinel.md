## 2024-05-15 - [Path Traversal in Node.js File Server]
**Vulnerability:** Path traversal possible due to `startsWith` partial matching without trailing slash checking (e.g., `/app/public-secret` matches `startsWith('/app/public')`).
**Learning:** In Node.js native routing, `decodeURIComponent()` on URL paths followed by `path.join` and `path.normalize` allows paths that escape the intended root if validation only uses `startsWith` on a directory without a trailing slash.
**Prevention:** Use `path.relative` and ensure the relative path doesn't start with `..` or is an absolute path.
