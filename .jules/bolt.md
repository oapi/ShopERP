## 2024-08-24 - Cached Prepared Statements in accountBalance
**Learning:** Node.js native `node:sqlite` has significant recompilation overhead when `db.prepare()` is called repeatedly inside frequently invoked functions like `accountBalance()`, especially when that function is called in loops (e.g. iterating over all accounts).
**Action:** Always pre-compile `db.prepare()` statements at the module level outside of the function scope so they are evaluated only once, then reuse them using `.get()` or `.all()`.
