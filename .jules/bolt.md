## 2024-05-18 - Avoid repeated query compilation inside function scopes
**Learning:** In `server.js`, computing database aggregates (like `accountBalance`, `customerBalance`, etc.) frequently involves preparing and executing multiple SQL statements per function call. `node:sqlite`'s `db.prepare()` incurs compilation overhead.
**Action:** Always extract static `db.prepare()` SQL queries outside of frequently-called functions to reuse the compiled statement.

## 2024-05-18 - Single Query over Multiple Queries
**Learning:** Combining multiple small aggregation queries into a single query using conditional aggregation (`SUM(CASE WHEN ... THEN ... ELSE 0 END)`) significantly improves performance by reducing N+1 database roundtrips.
**Action:** Use conditional aggregation when multiple `SUM` results are required from the same table within the same request scope.
