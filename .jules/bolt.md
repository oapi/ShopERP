## 2024-05-24 - N+1 and Compilation Overhead in Node SQLite

**Learning:** Node SQLite (`node:sqlite`) module's `db.prepare()` compilation step accounts for significant overhead if called iteratively in loops or high-frequency helpers. Additionally, making multiple sequential database queries in synchronous code is a common anti-pattern that can easily be consolidated using SQL subqueries or `CASE WHEN` aggregation.

**Action:** Always hoist `db.prepare()` statements out of frequently-called functions so they are prepared only once at module load. Consolidate multiple sequential read queries on related tables into a single query using subselects or left joins to cut down on data marshaling overhead.
