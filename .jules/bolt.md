## 2024-05-17 - Eliminate N+1 and repeated db.prepare overhead in balance queries
**Learning:** `db.prepare()` compilation overhead in `node:sqlite` becomes highly problematic when executed iteratively within paginated endpoint map loops. Additionally, distinct SUM queries across the same table can trigger N+1 query patterns that add unnecessary latency.
**Action:** Always hoist `db.prepare()` statements out of frequently-called functions to the module level so they are compiled only once, and combine multiple aggregations into single queries using `CASE WHEN` conditional aggregation.
