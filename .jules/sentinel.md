## 2026-10-20 - Ensure boundary enforcement in static file serving
**Modification:** Improve file path handling for static file serving.
**Learning:** Improve file serving.
**Action:** Use \`path.relative(PUBLIC_DIR, filePath)\` and verify it does not start with \`..\` and is not absolute, and return a generic 404 to avoid leaking path existence.
