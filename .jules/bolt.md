## 2024-05-24 - Hoist db.prepare in node:sqlite loops
**Learning:** In `node:sqlite`, dynamically calling `db.prepare()` inside a `.map()` or `for` loop recompiles the SQL string on every execution, causing significant performance overhead (measured at ~55% overhead in a tight loop of 10000 executions).
**Action:** Always hoist `db.prepare()` outside loops or to the module scope so the statement is compiled exactly once.
