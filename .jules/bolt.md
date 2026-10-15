## 2025-02-09 - Severe overhead from dynamically prepared statements
**Learning:** In `node:sqlite`, dynamically calling `db.prepare()` inside functions (especially those called within loops or on every row during data fetching like `customerBalance` and `accountBalance`) causes severe performance degradation, as the SQL string is recompiled on every execution.
**Action:** Always hoist `db.prepare()` calls to the module scope so that the SQL statement is compiled exactly once during application startup.
