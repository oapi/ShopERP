## 2024-06-25 - Cache Module-Level DB Prepare Queries
**Learning:** In Node's native `node:sqlite`, repeatedly calling `db.prepare()` inside loops or list iterations (e.g., in a route handler calculating balances) causes severe compilation overhead and acts as an N+1 performance bottleneck.
**Action:** When working with `node:sqlite`, always hoist and cache `db.prepare` statements at the module level (outside of function scopes) so they are compiled only once at startup, unless the query itself requires dynamic SQL generation (like dynamic table names).
