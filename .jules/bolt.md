## 2024-05-24 - Node SQLite Query Performance
**Learning:** Node SQLite (`node:sqlite`) `db.prepare()` compilation accounts for significant overhead if called dynamically inside iterative functions. Further, executing multiple distinct SQL queries sequentially incurs N+1 overhead.
**Action:** Hoist `db.prepare()` statements out of frequently-called functions to the module level so they are compiled only once (since schemas are instantiated synchronously on load). Consolidate multiple sequential read queries into single queries using SQL subqueries or `CASE WHEN` conditional aggregation.
