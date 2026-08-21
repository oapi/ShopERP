## 2024-05-18 - Module-level Query Caching in node:sqlite
**Learning:** In `node:sqlite`, `db.prepare()` compilation overhead is significant, especially when executed inside frequently called functions (like iterative helpers during pagination or N+1 subqueries). Benchmarks showed an uncached execution takes ~550ms vs ~140ms cached (almost 4x slower).
**Action:** Always pre-compile `node:sqlite` statements at the module scope (outside function bodies) when using `db.prepare()` unless the query involves highly dynamic table/column names where pre-compilation is impossible.
