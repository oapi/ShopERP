## 2025-01-28 - Missing ARIA labels in Vanilla JS templates
**Learning:** Dynamically generated Vanilla JS string templates (e.g., `app.js` innerHTML) bypass standard static analysis linting for accessibility. Icon-only buttons like `&times;` or pagination arrows are frequently added without proper screen reader support because static tools cannot detect them inside string literals.
**Action:** Always manually verify icon-only buttons in dynamically generated HTML string templates to ensure proper `aria-label` and `title` attributes are included, regardless of linting check results.
