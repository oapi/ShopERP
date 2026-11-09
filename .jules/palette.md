## 2024-11-09 - Accessible Icon-Only Action Buttons in Dynamic Templates
**Learning:** In dynamically constructed template strings in `app.js`, interactive icon-only buttons (like `&times;` for closing modals or deleting items) often omit `aria-label` attributes because standard static linting tools miss them.
**Action:** Always inspect concatenated HTML template strings in `app.js` (especially for modals, tables, and lists) for `<button>` tags lacking text content and proactively append `aria-label` attributes to ensure screen reader accessibility.
