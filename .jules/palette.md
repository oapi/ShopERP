## 2024-05-18 - Missing ARIA Labels on Icon-only Buttons
**Learning:** Icon-only buttons (like `&times;` or `X` buttons) used across modals, sidebars, and POS tables often lack ARIA labels and tooltips in standard HTML generation templates, making them completely inaccessible to screen readers and confusing for desktop users without hover cues.
**Action:** Always include both `aria-label` (for screen readers) and `title` (for native tooltips) when rendering icon-only buttons in vanilla JS HTML strings.
