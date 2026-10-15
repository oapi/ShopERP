
## 2026-10-15 - Missing Accessibility on Dynamically Generated Icon-only Buttons
**Learning:** Dynamically generated vanilla JS string templates in app.js bypass static accessibility linters (which usually analyze HTML or React/JSX files), resulting in missing `aria-label` and `title` attributes on dynamically constructed icon-only buttons (such as cart item remove buttons and modal close buttons).
**Action:** Always manually verify icon-only buttons created within string templates to ensure proper `aria-label` and `title` attributes are present.
