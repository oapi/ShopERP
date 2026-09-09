
## 2023-10-25 - Prevent N+1 queries by calculating balances in SQL subqueries/aggregations
**Learning:** Calculating associated record aggregates (like balances based on payments and transactions) iteratively within JS loops produces severe N+1 SQL queries overhead. Doing `db.prepare(..).get()` inside JS loops for bulk fetches heavily impacts backend latency for list pages.
**Action:** Always combine calculations into a single query using SQL conditional aggregations (`SUM(CASE WHEN ...)`) or inline subqueries directly in the `selectCols` property of `queryPaginated` instead of relying on JavaScript loops when querying collections.
