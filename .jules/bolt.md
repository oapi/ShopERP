## 2024-05-24 - Hoisting node:sqlite db.prepare statements
**Learning:** In the `node:sqlite` native library, dynamically calling `db.prepare()` inside a function (like `accountBalance` or `customerBalance`) recompiles the SQL string on every execution. This causes a severe performance overhead, especially when these functions are called iteratively in loops (e.g., iterating through all accounts for the dashboard). Benchmarks show it can be up to ~4x slower.
**Action:** Always hoist `db.prepare()` to the module scope so the SQL statement is compiled exactly once at application startup.
