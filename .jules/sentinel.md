## 2025-02-15 - Boundary Enforcement in Static File Serving
**Vulnerability:** Boundary evasion via path manipulation.
**Learning:** Using `startsWith` for boundary checks with user-provided paths is insufficient because URL normalization sequences bypassed the logic before decoding.
**Prevention:** Enforce boundaries using `path.relative(PUBLIC_DIR, filePath)` and checking against `startsWith('..')` or `path.isAbsolute()` to safely restrict file scope, and return generic 404 to avoid leaking path existence.
