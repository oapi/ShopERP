## 2025-02-18 - Adding ARIA labels to icon-only buttons
**Learning:** In the CoreTrade ERP Vanilla JS single-page application, interactive UI elements often rely on HTML entities for icon-only buttons (like `&times;` for closing modals or deleting items). Screen readers announce these characters incorrectly without proper `aria-label`s.
**Action:** Always add explicit `aria-label` attributes for screen readers and `title` attributes for visual tooltips to ensure both keyboard and screen reader accessibility when using HTML entity-based icon buttons.
