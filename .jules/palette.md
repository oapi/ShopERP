## 2024-11-01 - Missing ARIA labels in dynamic HTML
**Learning:** The frontend dynamically constructs UI elements by concatenating strings in `app.js`. This approach frequently omits standard accessibility attributes like `aria-label` on icon-only buttons (e.g., modal close buttons and cart removal buttons).
**Action:** When adding or reviewing dynamically rendered icon-only buttons, ensure an `aria-label` is explicitly included in the string template to support screen readers.
