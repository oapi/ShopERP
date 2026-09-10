
## 2023-11-20 - [Optimize accountBalance queries with conditional aggregation]
**Learning:** Found an N+1/sequential query performance bottleneck specific to how `accountBalance` was calculating values across the same `account_transactions` table using 5 distinct queries.
**Action:** Replaced sequential queries with a single query utilizing `node:sqlite` conditional aggregation (`SUM(CASE WHEN...)`) to significantly improve execution time.
