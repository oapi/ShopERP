## 2024-05-23 - SQLite Prepared Statements Overhead in Loops
**Learning:** In `node:sqlite`, dynamically calling `db.prepare()` inside functions recompiles the SQL string on every execution, causing severe performance overhead when those functions are used in loops (like calculating balances for lists of accounts or customers).
**Action:** Always hoist `db.prepare()` to the module scope so the statement is compiled exactly once at application startup.
