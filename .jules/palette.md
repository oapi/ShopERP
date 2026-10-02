## 2024-05-18 - Missing ARIA Labels in String Templates
**Learning:** Vanilla JS string templates that dynamically generate HTML (like `&times;` icon-only buttons for removing items or closing modals) often bypass standard static analysis linting for accessibility.
**Action:** Always manually verify icon-only buttons generated via `innerHTML` string templates to ensure proper `aria-label` and `title` attributes are included.
