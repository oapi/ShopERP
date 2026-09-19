## 2023-10-27 - ARIA labels in Vanilla JS templates
**Learning:** In applications using dynamically generated Vanilla JS string templates (like `app.js` generating innerHTML), accessibility attributes like `aria-label` and `title` can easily be overlooked since they bypass standard React/Vue static analysis linting.
**Action:** When working with vanilla JS string templates, manually check icon-only buttons (like modal closes `&times;` or pagination arrows) using `grep` to ensure they have proper accessible names (`aria-label`) and tooltips (`title`).
