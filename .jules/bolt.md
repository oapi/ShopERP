# Learnings: N+1 Query Optimization for Bulk Delete in `node:sqlite`

When performing bulk database operations (e.g., bulk delete), using a loop that executes `SELECT` and `DELETE` queries repeatedly per item leads to the **N+1 query problem**.

In `node:sqlite`, although queries run very quickly due to being in memory, the overhead of executing hundreds of individual database calls significantly degrades performance. By aggregating the target IDs and rewriting the queries to use the `IN (...)` clause, we can fetch required nested data and execute multi-row updates and deletions in just a few queries, yielding a massive performance improvement (measured ~85% reduction in execution time in benchmarks: from ~173ms to ~26ms for 1000 items).

*Always map the target IDs to `?` placeholders to maintain protection against SQL injection.*
