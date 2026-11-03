## 2024-05-18 - Missing ARIA Labels on Dynamic Icon-Only Buttons
**Learning:** This application dynamically renders UI components by constructing HTML strings in `public/app.js`. These dynamically injected icon-only buttons (like `&times;` for closing or deleting) consistently omitted `aria-label` attributes, making them inaccessible to screen readers.
**Action:** Always verify that dynamically concatenated HTML strings include proper `aria-label` attributes for icon-only buttons to maintain accessibility parity with statically written UI elements.
