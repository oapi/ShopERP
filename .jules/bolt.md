## 2024-05-23 - Hoisted db.prepare in Loops
**Learning:** In node:sqlite, calling db.prepare() dynamically inside loops recompiles the query each time, adding significant overhead.
**Action:** Always hoist db.prepare() to the module scope so it is compiled exactly once.
