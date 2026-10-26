## 2024-05-15 - [Hoisting Prepared Statements]
**Learning:** Calling `db.prepare()` dynamically inside a map or loop (e.g. `items.map()`) compiles the statement on every execution. In this application using `node:sqlite`, recompiling statements dynamically adds substantial overhead.
**Action:** Always hoist `db.prepare` calls outside of loops, and preferably to the module scope where possible so they're compiled exactly once at application startup.
