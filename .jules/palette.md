## 2023-10-31 - Accessibility for Dynamic Icon Buttons
**Learning:** Dynamic DOM generation logic within string concatenation blocks often omits accessibility features for structurally simple icon-only buttons (like modal close buttons or table item removal `&times;` symbols), which screen readers cannot interpret.
**Action:** When working on applications rendering UI dynamically via string assignments (like `innerHTML`), proactively add standard ARIA attributes (e.g., `aria-label`) to icon buttons ensuring accessible screen-reader parsing.
