
## 2024-05-18 - Single Query Conditional Aggregation
**Learning:** Performing multiple independent `SUM` queries on the same table (e.g. `account_transactions`) to aggregate different types of transactions inside a loop (or frequently called function) introduces N+1 overhead in Node.js SQLite driver.
**Action:** Always combine them into a single `db.prepare().get()` query using conditional aggregation (`SUM(CASE WHEN condition THEN amount ELSE 0 END)`). This collapses multiple database hits into a single roundtrip while processing the data in one table scan.
