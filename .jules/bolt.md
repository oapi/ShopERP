## 2025-05-18 - Prevent SQLite overhead by hoisting db.prepare
**Learning:** In Node.js built-in `node:sqlite`, dynamically calling `db.prepare()` inside a frequently executed function (e.g. inside a loop calculating customer, supplier or account balances) recompiles the SQL string on every execution, causing severe performance overhead (roughly 10x slower).
**Action:** Always hoist `db.prepare()` to the module scope so the statement is compiled exactly once at application startup.
