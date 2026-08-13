## 2026-08-13 - Remove N+1 queries from customer, supplier, and account lists
**Learning:** Correlated subqueries embedded directly into the `selectCols` of `queryPaginated` in `server.js` are a highly performant way to resolve iterative N+1 balance calculations without changing the required JSON output shape for the frontend.
**Action:** Always inspect `.all()` operations followed by JavaScript loops (`for...of`) hitting the database. Translate dependent logic into SQL subqueries or JOINs.
