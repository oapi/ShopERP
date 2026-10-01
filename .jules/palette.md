## 2023-10-01 - Add ARIA labels to icon-only buttons
**Learning:** Dynamically generated string templates in Vanilla JS (e.g., `app.js` innerHTML) bypass standard static analysis linting for accessibility. Icon-only buttons (like modal closes `&times;` or pagination arrows) can easily be generated without necessary `aria-label` and `title` attributes if not manually verified.
**Action:** Always manually verify icon-only buttons generated dynamically in string templates to ensure proper `aria-label` and `title` attributes are included to maintain accessibility.
