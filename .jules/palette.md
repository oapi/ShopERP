## 2024-08-20 - Accessible icon-only buttons
**Learning:** Found multiple instances of `&times;` (multiply sign) used as a close/remove icon in `public/app.js` without `aria-label` or `title`. This makes it confusing for screen readers and lacks helpful tooltips for sighted users.
**Action:** Always verify icon-only buttons (especially HTML entities) have explicit `aria-label` and `title` attributes for full accessibility and better UX.
