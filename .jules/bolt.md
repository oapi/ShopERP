## 2024-10-18 - Hoisting db.prepare in Loops
**Learning:** In node:sqlite, dynamically calling db.prepare() inside a function recompiles the SQL string on every execution, causing significant performance overhead in loops (e.g. iterating over 1000 customers).
**Action:** Always hoist db.prepare() to the module scope so the statement is compiled exactly once at application startup.
