## 2025-01-01 - Enhance Static File Boundary Checks
**Vulnerability:** The static file server used a generic prefix check to enforce boundaries.
**Learning:** We need to ensure that the resolved relative path does not fall outside the intended public boundary, otherwise unexpected behavior can occur.
**Prevention:** Always validate path boundaries using `path.relative(PUBLIC_DIR, filePath)` and ensure the result does not start with `..` or is an absolute path.
