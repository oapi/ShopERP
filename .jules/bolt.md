## 2024-05-18 - Hoisting Prepared Statements
**Learning:** In node:sqlite, using `db.prepare()` inline inside loops triggers recompilation of the SQL string on every execution, causing massive overhead.
**Action:** Always hoist `db.prepare()` statements outside loops/functions into module scope.
