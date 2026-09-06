## 2024-09-06 - Add ARIA labels and tooltips to icon-only close/remove buttons
**Learning:** Icon-only buttons (especially simple HTML entities like `&times;`) without `aria-label` or `title` create severe accessibility and usability issues. The `title` attribute is also required to provide context on hover for mouse users.
**Action:** When adding or updating generic symbol buttons (like `&times;` for close/remove), always include both an explicit `aria-label` and `title` to ensure they are fully accessible to screen readers and mouse users.
