## 2023-10-27 - Add ARIA Labels to Icon-Only Buttons
**Learning:** Dynamically generated Vanilla JS string templates (e.g., in `public/app.js`) bypass standard static analysis linting for accessibility, making them prone to missing `aria-label` and `title` attributes on icon-only buttons (like modal close `&times;` or pagination arrows).
**Action:** Always manually verify icon-only buttons when working with dynamically generated HTML strings to ensure proper `aria-label` and `title` attributes are included.
