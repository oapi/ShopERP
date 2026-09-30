## 2024-05-24 - Avoiding N+1 Queries in Node SQLite
**Learning:** Node SQLite (`node:sqlite`) `db.prepare()` compilation accounts for significant overhead if called iteratively. Multiple small queries within a loop scale poorly, even when local.
**Action:** Always hoist `db.prepare()` statements out of frequently-called functions to the module level so they are compiled only once. Consolidate multiple sequential read queries into a single query using SQL subqueries, `LEFT JOIN`, or `CASE WHEN` aggregation to eliminate N+1 overhead and reduce round trips.
