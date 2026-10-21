## 2024-10-21 - Add ARIA labels to dynamic icon-only buttons
**Learning:** Dynamically generated Vanilla JS string templates (e.g., app.js innerHTML) bypass standard static analysis linting for accessibility. This led to icon-only buttons (like modal closes &times;) missing proper accessibility labels.
**Action:** Always manually verify icon-only buttons in vanilla JS string templates to ensure proper aria-label and title attributes are present.
