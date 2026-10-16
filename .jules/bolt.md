## 2024-05-24 - Database Preparation Hoisting
**Learning:** In Node.js `node:sqlite` module, calling `db.prepare()` is expensive because it compiles the SQL string. When `db.prepare()` is dynamically called inside functions that are invoked frequently (like calculating balances in loops over hundreds of rows), it causes severe performance overhead.
**Action:** Always hoist `db.prepare()` statements to the module scope (or outside loops) so they are compiled exactly once at application startup or function initialization, saving significant overhead during hot paths.
