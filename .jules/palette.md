## 2026-09-27 - Added ARIA labels to dynamically generated icon-only buttons
**Learning:** Dynamically generated Vanilla JS string templates (e.g., `app.js` innerHTML) bypass standard static analysis linting for accessibility. Icon-only buttons (like modal closes `&times;` or remove items) generated this way often miss out on standard automated a11y checks.
**Action:** Always manually verify icon-only buttons created within Vanilla JS string templates to ensure proper `aria-label` and `title` attributes are present.
