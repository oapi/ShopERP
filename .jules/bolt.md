## 2024-10-27 - Hoist Prepared Statements in Node.js node:sqlite
**Learning:** In the `node:sqlite` module, dynamically calling `db.prepare()` inside functions recompiles the SQL string on every execution. This causes severe performance overhead when the function is called in loops (e.g., iterating through accounts to compute balances).
**Action:** Hoist `db.prepare()` statements outside the loops/functions, putting them at the module scope so they are compiled exactly once at application startup.
