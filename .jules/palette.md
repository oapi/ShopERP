## 2024-10-16 - Dynamically generated UI bypasses a11y linters
**Learning:** Dynamically generated Vanilla JS string templates (e.g., `app.js` innerHTML) bypass standard static analysis linting for accessibility.
**Action:** Always manually verify icon-only buttons (like modal closes `&times;` or pagination arrows) generated via strings in JS templates to ensure proper `aria-label` and `title` attributes.
