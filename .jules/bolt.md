## 2024-11-20 - Hoist db.prepare to prevent recompilation
**Learning:** In node:sqlite, dynamically calling `db.prepare()` inside functions like `accountBalance` or `customerBalance` recompiles the SQL string on every execution, causing significant performance overhead (~4x slower) when these functions are called in loops (e.g., when fetching all accounts).
**Action:** Always hoist `db.prepare()` statements to the module scope so they are compiled exactly once at application startup.
