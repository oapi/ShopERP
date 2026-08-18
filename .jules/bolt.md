## 2026-08-18 - Pre-compiling queries outside of map loop
**Learning:** In `server.js`, `db.prepare()` is used inside `items.map()` loops when creating sales or purchases. This causes the query to be compiled for every single item, creating an N+1 query compilation overhead during bulk operations.
**Action:** Extract `db.prepare()` outside the `items.map()` loop and reuse the compiled statement with `.get()`.
