## 2024-05-24 - Hoist db.prepare out of dynamic functions
**Learning:** In `node:sqlite`, calling `db.prepare()` inside a function recompiles the SQL string on every execution, causing severe performance overhead in loops (e.g., when fetching balances for paginated results).
**Action:** Always hoist `db.prepare()` to the module scope so the statement is compiled exactly once at application startup.
