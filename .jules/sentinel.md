## 2024-10-11 - Prevent Path Traversal in Static File Serving
**Vulnerability:** Path traversal using url-encoded `%2E%2E%2F` allows accessing arbitrary files outside the `PUBLIC_DIR`.
**Learning:** `new URL()` does not normalize URL-encoded path separators. `decodeURIComponent` after `new URL()` introduces un-normalized `../` elements that bypass simple `startsWith` checks on `PUBLIC_DIR` when `path.normalize` collapses the final absolute path.
**Prevention:** Use `path.relative()` to check if the normalized requested path escapes the intended base directory (i.e., starts with `..` or is an absolute path).

## 2024-10-11 - Prevent SQL Injection via Stacked Queries in System Restore
**Vulnerability:** The `/api/system/restore` endpoint blindly interpolates hardcoded table names from `const tables = [...]` into an un-parameterized `INSERT INTO ${t}` query during the restore process. However, because it's looping over a hardcoded array of standard tables, it might not be exploitable via user input unless `t` is user-controlled (it isn't). Wait, let's check `db.exec` usage again.
**Learning:** `db.exec()` can execute multiple statements.
**Prevention:** Avoid `db.exec()` for interpolation, though the tables array is hardcoded.
