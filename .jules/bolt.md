## 2024-05-24 - N+1 query elimination via Conditional Aggregation in SQLite
**Learning:** `accountBalance` was running 5 distinct `db.prepare(...).get()` queries for every invocation, severely bottlenecking `/api/accounts` and dashboard endpoints which process loops of accounts.
**Action:** Replaced sequential query sums with a single query using `SUM(CASE WHEN condition THEN amount ELSE 0 END)`, directly eliminating 3 database round-trips per loop iteration, and hoisted the prepared statement compilation to the module level.
