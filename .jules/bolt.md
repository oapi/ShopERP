## 2024-05-15 - [Performance: Hoist Prepared Statements in node:sqlite]
**Learning:** Dynamically calling `db.prepare()` inside loops or hot paths (like `getAuthUser` and list rendering balance functions) recompiles the SQL string on every execution, causing severe performance overhead in `node:sqlite`.
**Action:** Always hoist `db.prepare()` to the module scope so the statement is compiled exactly once at application startup.
