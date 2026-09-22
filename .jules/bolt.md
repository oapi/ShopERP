
## 2024-05-24 - Node SQLite Conditional Aggregation
**Learning:** In `node:sqlite`, replacing multiple sequential read queries with a single query using conditional aggregation (`SUM(CASE WHEN condition THEN amount ELSE 0 END)`) and hoisting the `db.prepare()` statement to the module level provides a massive speedup (e.g., ~15x reduction in execution time). This is crucial for N+1 heavy functions like balance calculations when executed inside iteration loops.
**Action:** When calculating multiple distinct sums from the same table (e.g., different transaction types), combine them into a single query using `CASE WHEN` to eliminate query overhead. Always hoist `db.prepare()` statements out of functions to compile them only once.
