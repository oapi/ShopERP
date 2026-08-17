## YYYY-MM-DD - Caching N+1 queries using Pre-compilation
**Learning:** SQLite's `db.prepare()` comes with severe compilation overhead during frequent function calls or loops. Even if we have N+1 issues, precompiling statements at the module level (outside function scopes) can yield 3x-4x performance improvement while preserving code simplicity and structure without resorting to complex SQL joins.
**Action:** Always precompile frequent `db.prepare()` queries outside of loops/functions in Node SQLite, unless queries require dynamic structure.
