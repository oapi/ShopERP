
## 2024-05-18 - Replacing N+1 Loops with Embedded SQL Queries and Pre-compilation
**Learning:** In native `node:sqlite` apps like CoreTrade ERP, running dependent database queries inside JavaScript loops (`db.prepare().get()`) for list endpoints (like `/api/customers` calculating balances) causes significant performance bottlenecks due to frequent context switching and query execution overhead (N+1 queries).
**Action:** Replace JavaScript loops that calculate dependent fields (like balances) with embedded SQL subqueries in the main `SELECT` statement (e.g. within `queryPaginated`'s `selectCols`). Furthermore, for helper functions reused across the codebase, extract and pre-compile their `db.prepare()` statements at the module level rather than recompiling them upon every function call.
