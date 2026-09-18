## 2024-05-24 - Node SQLite Prepare Compilation Overhead
**Learning:** `db.prepare()` causes significant execution overhead when repeatedly compiled inside functions or loops.
**Action:** Always hoist `db.prepare()` statements out of route handlers and loop structures to the module level so they compile only once upon module initialization.
