## 2024-10-07 - Add ARIA labels to icon-only buttons
**Learning:** Dynamically generated Vanilla JS string templates (e.g., app.js innerHTML) bypass standard static analysis linting for accessibility. Icon-only buttons like modal closes (`&times;`) often miss `aria-label`s.
**Action:** Always manually verify icon-only buttons in innerHTML templates to ensure proper `aria-label` and `title` attributes.
