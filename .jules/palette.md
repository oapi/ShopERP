## 2024-05-24 - Accessibility improvements for icon-only buttons
**Learning:** Icon-only buttons using HTML entities like `&times;` and `☰` lack context for screen readers and sighted users. These should always include both `aria-label` and `title` attributes.
**Action:** Added these attributes to the modal close button, purchase/POS removal buttons, and the sidebar menu toggles to improve both accessibility and mouse interactions.
