## 2026-10-05 - Optimize N+1 Account Balance Query
**Learning:** In `node:sqlite`, calculating multiple distinct sums for the same table (e.g. calculating different types of transaction totals for account balances) using individual queries causes significant overhead.
**Action:** Use conditional aggregation (`SUM(CASE WHEN condition THEN amount ELSE 0 END)`) to combine multiple aggregates into a single query to eliminate N+1 overhead and reduce database roundtrips.
