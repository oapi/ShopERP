## 2024-10-13 - Add ARIA Labels to Icon-Only Buttons
**Learning:** Dynamically generated Vanilla JS string templates (e.g., `app.js` innerHTML) bypass standard static analysis linting for accessibility, requiring manual verification of icon-only buttons (like modal close buttons `&times;`).
**Action:** Always manually verify string templates to ensure `aria-label` and `title` attributes are present for icon-only interactive elements.
