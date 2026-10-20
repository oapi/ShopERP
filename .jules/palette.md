## 2024-10-20 - Add accessible labels to dynamically generated icon-only buttons
**Learning:** Dynamically generated Vanilla JS string templates (e.g., `app.js` innerHTML) bypass standard static analysis linting for accessibility.
**Action:** Always manually verify icon-only buttons (like modal closes `&times;` or pagination arrows) to ensure proper `aria-label` and `title` attributes are present.
