## 2024-10-04 - Dynamically Generated HTML Bypass
**Learning:** Dynamically generated HTML strings in JavaScript bypass standard static accessibility linting. This was observed for icon-only `&times;` buttons, which lacked necessary `aria-label` and `title` attributes.
**Action:** Always manually verify and add `aria-label` and `title` attributes to icon-only buttons created via dynamically generated string templates.
