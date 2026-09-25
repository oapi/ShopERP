## 2026-09-25 - Optimize db.prepare inside map
**Learning:** Calling `db.prepare` repeatedly inside a loop (like `.map()`) incurs significant performance overhead due to statement recompilation in SQLite.
**Action:** Hoist the `db.prepare` statement outside of loops to reuse the compiled statement, especially in API endpoints where it processes multiple items (e.g., sale creation and purchase creation routes).
