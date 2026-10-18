## 2024-10-18 - Missing ARIA labels in dynamic string templates
**Learning:** The application's pattern of dynamically generating HTML in Vanilla JS string templates (e.g., `app.js` innerHTML) bypasses standard static accessibility linters. Because of this, icon-only buttons (like modal closes `&times;` or pagination arrows) are often rendered without proper accessibility attributes.
**Action:** Always manually verify icon-only buttons in dynamically generated views to ensure proper `aria-label` and `title` attributes are present.
