## 2024-11-10 - Dynamic DOM Accessibility Gaps
**Learning:** When building single-page vanilla JS applications with dynamic string-based DOM updates, standard accessibility attributes (like `aria-label`) frequently get omitted from UI elements like close and delete buttons, whereas static HTML files maintain them.
**Action:** Always proactively review dynamically injected HTML strings for interactive elements (buttons, inputs) and ensure `aria-label` or `title` attributes are appended for icon-only buttons (`&times;`, emojis).
