## 2024-05-19 - Subqueries vs N+1 queries in node:sqlite
**Learning:** For N+1 problems in sqlite queries, moving calculations to subqueries or JOINs inline inside the main query using `ROUND(..., 2) AS ...` is much faster than running N queries in Javascript loops (even cached queries), as node:sqlite has some compilation/execution overhead per query.
**Action:** Replace looped `db.prepare()` operations over results with inline subqueries inside `SELECT` or `selectCols` inside pagination queries.
## 2024-05-19 - N+1 optimization for accounts/customers/suppliers
**Learning:** Similar to sales and payments, getting accounts balance using N+1 is quite slow, we can optimize `GET /api/accounts`, `GET /api/customers`, `GET /api/suppliers` using subqueries directly. The same is applicable for other similar single gets, but especially bulk queries like API listings for those entities.
**Action:** Let's optimize `GET /api/customers`, `GET /api/suppliers` and `GET /api/accounts` listings since those use `.map()` or `for..of` iterations.
