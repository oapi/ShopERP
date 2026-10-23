## 2024-11-20 - Hoist db.prepare in Node.js SQLite
**Learning:** Dynamically calling `db.prepare()` inside functions frequently invoked in loops (like list serialization) causes severe CPU overhead and performance degradation in `node:sqlite`, because the engine recompiles the statement on every execution.
**Action:** Always hoist `db.prepare()` statements to the module scope so they are compiled exactly once during startup, then execute them via `stmt.get()` or `stmt.all()` with parameters.
