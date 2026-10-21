## 2024-05-18 - Hoisting db.prepare() to avoid N+1 compilation overhead
**Learning:** In node:sqlite, dynamically calling db.prepare() inside a function recompiles the SQL string on every execution. When these functions (like customerBalance) are called in a loop over large datasets (e.g., in paginated API responses), it causes severe N+1 compilation performance overhead.
**Action:** Always hoist db.prepare() calls to the module scope so the statement is compiled exactly once at application startup.
