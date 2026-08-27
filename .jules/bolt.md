## 2024-05-14 - Pre-compiling node:sqlite queries
**Learning:** In Node's built-in SQLite (node:sqlite), calling `db.prepare()` within frequently executed functions (like route handlers or loops) causes significant performance overhead due to repeated query compilation.
**Action:** Hoist `db.prepare()` statements out of function scopes and cache them at the module level whenever the query structure is static.
