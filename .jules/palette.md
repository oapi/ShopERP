## 2024-11-08 - Added ARIA labels to dynamically generated icon-only buttons
**Learning:** Dynamically generated HTML components in `app.js` frequently omit standard accessibility attributes (like `aria-label`) that might be present in static counterparts. Screen readers cannot interpret `&times;` (used for closing or removing items) without proper labels.
**Action:** Always add `aria-label` attributes to icon-only buttons (especially those containing non-text elements like `&times;` or SVG icons) when constructing dynamic HTML strings to ensure accessibility for screen reader users.
