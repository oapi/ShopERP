## 2024-02-23 - Accessibility of Icon-Only Buttons
**Learning:** Found multiple icon-only buttons (like `&times;` for closing modals or deleting items) in dynamically generated HTML that lack `aria-label` or `title` attributes. This makes them inaccessible to screen readers.
**Action:** Always verify icon-only buttons have an `aria-label` and `title` to ensure they are accessible. Added these attributes to the modal close button and table delete buttons.
