## 2024-06-25 - node:sqlite `db.prepare()` Re-compilation Overhead
**Learning:** In `node:sqlite`, dynamically calling `db.prepare()` inside functions or loops recompiles the SQL string on every execution, causing significant performance overhead (~3x slower execution in benchmarks). This is a codebase-specific architecture pattern learning as `db.prepare` is highly prevalent.
**Action:** Always hoist `db.prepare()` to the module scope so the statement is compiled exactly once at application startup.
