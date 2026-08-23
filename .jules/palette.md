## 2024-05-30 - Add ARIA Labels to Icon-Only Buttons
**Learning:** Found multiple instances of icon-only `&times;` close buttons missing accessible names, which breaks screen reader navigation for critical UI actions like modal dismissal and cart manipulation.
**Action:** Always verify that `&times;` (or any icon-only elements) are provided a clear `aria-label` (and often a `title` tooltip for mouse users) when rendering interactive DOM elements via HTML string templates.
