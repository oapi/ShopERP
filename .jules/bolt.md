## 2024-11-20 - Hoist node:sqlite db.prepare statements
**Learning:** In node:sqlite, dynamically calling db.prepare() inside a function recompiles the SQL string on every execution, causing severe performance overhead in loops.
**Action:** Always hoist db.prepare() to the module scope so the statement is compiled exactly once at application startup.
