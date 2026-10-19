## 2026-08-08 - SQLite Prepared Statement Optimization
**Learning:** Using `db.prepare()` inside functions that are called in loops (e.g., when rendering list endpoints) causes massive overhead due to repeated SQL compilation in `node:sqlite`. Furthermore, multiple database calls within a loop (like in `accountBalance`) significantly degrade performance.
**Action:** Always pre-compile `db.prepare()` statements at the module level (outside of functions) and use conditional aggregation in SQL to reduce multiple queries into a single query.
