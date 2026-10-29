## 2024-03-24 - Performance Optimizations

**Learning:** `db.prepare()` compiles SQL statements inside a function on every call, leading to overhead (N recompilations). This happens in many functions such as `getAuthUser`, `customerBalance`, `supplierBalance`, etc.
**Action:** Hoist the `db.prepare()` statements outside of loop-heavy or frequently called functions to module scope.
