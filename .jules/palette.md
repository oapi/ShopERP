## 2024-05-15 - Missing ARIA labels in dynamic JS templates
**Learning:** Dynamically generated Vanilla JS string templates bypass standard static analysis linting for accessibility, requiring manual verification of icon-only buttons.
**Action:** Always manually verify icon-only buttons (like modal closes `&times;` or pagination arrows) to ensure proper `aria-label` and `title` attributes when creating or modifying HTML string templates.
