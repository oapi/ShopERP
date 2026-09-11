## 2024-05-24 - Node.js SQLite Query Compilation Overhead
**Learning:** In `node:sqlite`, defining `db.prepare()` within frequently called functions like `accountBalance` or loops introduces severe recompilation overhead. Also, multiple queries for the same table (e.g. various transaction types) cause N+1 query problems.
**Action:** Always pre-compile `db.prepare()` statements at the module level when possible, and combine distinct sums from the same table using conditional aggregation (`SUM(CASE WHEN condition THEN amount ELSE 0 END)`) to avoid N+1 query overhead.
