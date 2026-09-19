## YYYY-MM-DD - [Optimize Node SQLite Performance]
**Learning:** The built-in `node:sqlite` has significant overhead when `db.prepare()` is called dynamically inside loops or frequently accessed functions.
**Action:** Always hoist `db.prepare()` statements outside of frequently invoked functions, ideally at the module level.
**Learning:** Multiple dependent queries within loop structures (N+1 query problem) and consecutive queries for calculating sums create serious performance bottlenecks.
**Action:** Combine distinct queries into single `node:sqlite` statements using conditional aggregation (`SUM(CASE WHEN condition THEN amount ELSE 0 END)`) or nested `SELECT` queries to eliminate N+1 overhead and reduce repeated `db.prepare()` initializations.
