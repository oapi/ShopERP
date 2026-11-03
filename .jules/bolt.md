## 2024-11-03 - Hoisting db.prepare in item loops
**Learning:** In node:sqlite, dynamically calling `db.prepare()` inside a function (or in a `.map` or loop) recompiles the SQL string on every execution, causing severe performance overhead.
**Action:** Always hoist `db.prepare()` outside loops so the statement is compiled exactly once.
