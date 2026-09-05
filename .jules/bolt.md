## 2024-05-24 - Hoist db.prepare() to Avoid N+1 Compilation Overhead
**Learning:** Calling `db.prepare()` repeatedly inside a loop (like `items.map()`) in `node:sqlite` incurs significant query compilation overhead.
**Action:** Always hoist `db.prepare()` outside of iterative loops or to the module level when performing bulk operations to drastically improve performance.
