## 2024-05-24 - Add ARIA Labels to Icon-Only Buttons
**Learning:** Found multiple icon-only buttons (like `&times;` for closing modals or deleting items) missing `aria-label`s in `public/app.js` string templates. These templates bypass standard static accessibility analysis.
**Action:** Manually verified and added `aria-label` attributes to dynamically generated icon-only buttons to improve screen reader accessibility.
