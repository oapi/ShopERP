## 2024-05-24 - Accessibility on dynamically injected HTML icon buttons
**Learning:** Dynamic HTML generation in JavaScript (like `app.js` using `innerHTML`) often omits standard accessibility attributes like `aria-label` on icon-only buttons (like `&times;` or `x`), making them completely inaccessible for screen reader users since they have no textual content.
**Action:** Always check dynamically constructed HTML strings for icon-only buttons and explicitly add `aria-label` attributes to ensure they are readable by assistive technologies.
