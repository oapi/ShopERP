## 2024-05-15 - Timing Attack and Path Traversal Mitigations
**Vulnerability:** Sibling directory path traversal via URL-encoded path bypass, and username enumeration timing attack on the login API.
**Learning:** In Node.js native routing, `new URL()` does not normalize URL-encoded path separators (e.g., `%2E%2E%2F`). Also `crypto.timingSafeEqual` should be used with constant time computations even when a user doesn't exist to prevent enumeration.
**Prevention:** Always use `path.relative()` for final boundary validation when serving static files. Compute hash buffers in constant time whether or not a user match exists.
