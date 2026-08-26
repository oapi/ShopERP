## 2024-05-18 - Hoisting db.prepare() outside of loops
**Learning:** node:sqlite's db.prepare() has significant compilation overhead when called inside iteration loops (e.g. items.map()). Repeatedly preparing the same query inside a loop causes a measurable performance drop compared to preparing it once outside the loop and calling .get() or .run() inside.
**Action:** Always hoist db.prepare() outside of loops or .map() calls when the SQL string is static.
