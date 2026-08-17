## 2024-08-17 - Add ARIA Labels and Titles to Dynamic HTML Entity Buttons
**Learning:** When building UI using dynamic HTML strings in vanilla JS apps, icon-only buttons using HTML entities (like `&times;`) lack context for screen readers and helpful tooltips for mouse users.
**Action:** Always include both `aria-label` and `title` attributes on these buttons to ensure full accessibility and usability.
