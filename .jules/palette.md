## 2024-05-15 - ARIA Labels on Dynamically Generated Buttons
**Learning:** Icon-only buttons (like `&times;` for close or delete) generated via innerHTML strings often lack screen reader context, making the application inaccessible.
**Action:** Always include `aria-label` attributes on dynamically injected icon-only buttons to ensure keyboard and screen reader accessibility.
