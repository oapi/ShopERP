## 2024-03-24 - Dynamic Statement Preparation Overhead
**Learning:** In `node:sqlite`, calling `db.prepare()` inside functions recompiles the statement on every execution, causing significant overhead when called repeatedly in loops (like computing balances for many customers/suppliers/accounts).
**Action:** Always hoist `db.prepare()` to the module scope so it is compiled exactly once.
