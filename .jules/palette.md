## 2024-08-11 - Add ARIA Labels to Icon-Only Buttons
**Learning:** Icon-only remove buttons (like closing modals or removing cart items) often lack accessible names, making them difficult for screen readers to interpret. Adding `aria-label="Remove item"` to elements with the `&times;` icon greatly improves the accessibility of these components without altering the layout.
**Action:** Always include an `aria-label` when using raw HTML entities (like `&times;`) or standalone SVGs as interactive elements (e.g. close buttons, remove buttons).
