
## 2026-08-23 - Prevent username enumeration timing attacks during login
**Vulnerability:** The login endpoint checked the provided password hash against the stored password hash simultaneously with the username lookup. If the user didn't exist, it failed fast and returned early, which allowed attackers to measure response times to guess valid usernames (username enumeration).
**Learning:** Comparing user-provided data directly alongside the username query in a single DB step `SELECT ... WHERE username = ? AND password_hash = ?` exposes a fast failure path if the username does not exist.
**Prevention:** Look up the user by username first. If the user does not exist, perform a dummy constant-time operation (e.g. `crypto.timingSafeEqual(providedHash, providedHash)`) before returning an error. If the user exists, use `crypto.timingSafeEqual(providedHash, storedHash)` to ensure a consistent, constant-time comparison that resists timing attacks.
