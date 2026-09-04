## 2024-05-15 - [Database N+1 Query Fix]
**Learning:** In Node's native SQLite, using iterative database queries or preparing queries multiple times for account balances introduces significant overhead.
**Action:** Use single queries with JOINs and conditional aggregations, and pre-compile statements outside function scopes.
