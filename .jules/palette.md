## 2026-08-22 - Add ARIA Labels to Icon-Only Buttons
**Learning:** Found multiple instances where the generic `&times;` icon was used for close/remove actions (`.modal-close`, `.btn-pos-remove`, `.btn-pu-del`) without `aria-label` or `title` attributes, making them inaccessible to screen readers and lacking tooltips for mouse users.
**Action:** Added specific `aria-label` and `title` attributes (e.g., "Close modal", "Remove item") to improve context and accessibility for all such elements.
