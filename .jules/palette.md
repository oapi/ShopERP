## 2024-05-18 - A11y improvements to icon-only close/remove buttons
**Learning:** Found multiple `<button>&times;</button>` instances acting as "close" or "remove" controls in modals and inline tables across `public/app.js` and `public/index.html`. These lack context for screen readers and sight tooltips.
**Action:** Always include `aria-label="Action description"` and `title="Action description"` on HTML-entity icon buttons like `&times;` (`×`) or `&#10005;`.
