## 2025-02-27 - Timing Attack on SQLite Queries
**Vulnerability:** The login logic queried SQLite with `SELECT ... WHERE username = ? AND password_hash = ?`.
**Learning:** String comparison in standard SQL queries (`WHERE a = b`) is typically not constant-time. Performing both username and hash validation in a single database query exposes the endpoint to timing attacks that could allow user enumeration or hash brute-forcing.
**Prevention:** Always perform a constant-time comparison (like `crypto.timingSafeEqual`) in the application code after fetching the record. If the record isn't found, execute a dummy comparison to ensure the execution time remains consistent, preventing attackers from discerning whether a user exists.
