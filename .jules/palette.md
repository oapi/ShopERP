## 2026-08-30 - Add aria labels to icon buttons
**Learning:** Icon-only buttons (like modal closes or delete buttons represented by '×') lack context for screen readers and sighted users without proper attributes. Adding `aria-label` and `title` ensures both accessibility and usability (tooltips).
**Action:** When adding or modifying icon-only buttons in the UI, always provide an `aria-label` for screen readers and a `title` for visual tooltips.
