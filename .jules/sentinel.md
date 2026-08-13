## 2024-06-11 - Use timingSafeEqual for Password Comparison
**Vulnerability:** Timing Attack on Authentication
**Learning:** The `/api/auth/login` endpoint compared computed password hashes using the database string comparison `password_hash = ?`. This can leak hash bytes via timing attacks.
**Prevention:** Always fetch the stored hash first and compare it to the computed hash using `crypto.timingSafeEqual()`, ensuring equal buffer lengths prior to comparison.
