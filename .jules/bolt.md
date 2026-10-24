## 2024-05-18 - Hoisting node:sqlite prepared statements
**Learning:** In node:sqlite, calling db.prepare() dynamically inside functions causes severe performance overhead because the SQL statement is recompiled on every execution, especially problematic in tight loops or list endpoints like /api/customers.
**Action:** Always hoist db.prepare() statements to the module scope so they are compiled exactly once at application startup.
