## 2024-05-25 - Prevent SQL compilation in loops
**Learning:** In `node:sqlite`, calling `db.prepare()` dynamically inside a function recompiles the SQL string on every execution, causing severe performance overhead when the function is called inside loops (like generating accounts lists).
**Action:** Always hoist `db.prepare()` to the module scope so the SQL statement is compiled exactly once at application startup.
