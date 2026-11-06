## 2024-03-08 - Hoist db.prepare in loops
**Learning:** In `node:sqlite`, dynamically calling `db.prepare()` inside a function recompiles the SQL string on every execution, causing severe performance overhead when the function is called inside loops (e.g., calculating balances for a list of entities).
**Action:** Always hoist `db.prepare()` to the module scope so the statement is compiled exactly once at application startup.
