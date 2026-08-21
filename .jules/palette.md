## 2023-10-27 - Added ARIA labels and tooltips to icon-only buttons
**Learning:** Icon-only buttons (like pagination controls, modal close `&times;`, and item removal buttons) in this vanilla JS app were missing accessible names, leading to poor screen reader experience and lack of hover context.
**Action:** Always add `aria-label` and `title` attributes to buttons whose content is purely symbolic (e.g., HTML entities or emojis).
