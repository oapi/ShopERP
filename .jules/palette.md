## 2024-05-24 - Accessibility improvements for icon-only buttons
**Learning:** Icon-only buttons relying purely on textual symbols (like `&times;`) without `aria-label` are inaccessible to screen readers in this app's dynamic modals and table structures (POS, purchases).
**Action:** Always add `aria-label` or `title` to icon-only buttons to ensure they convey meaning to all users and are fully accessible.
