
## Performance Optimization: `/api/dashboard` Total Capital N+1 Query

**Issue**: The `/api/dashboard` endpoint originally iterated over all active accounts and executed multiple dependent queries for each account using the `accountBalance` helper (N+1 queries).
**Optimization**: Replaced the loop with a single aggregated SQL query (`dashboardTotalCapitalStmt`) that computes the sum of opening balances and all net transactions directly in SQLite. The query is pre-compiled at the module level.
**Measured Improvement**: In a micro-benchmark using an in-memory SQLite database (1000 accounts, 1000 payments, 10000 transactions, 100 iterations), the execution time improved from **~3 minutes 57 seconds** (baseline N+1 logic) to **~576 ms** (optimized aggregated query). This demonstrates an immense reduction in overhead and massive scalability improvement for instances with numerous accounts and transactions.
