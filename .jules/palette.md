## 2024-05-24 - Add ARIA Labels to Icon-Only Modal Close Buttons
**Learning:** Found several icon-only close buttons (using `&times;`) lacking `aria-label` or `title` attributes. This breaks screen reader accessibility for modal and table item deletion interactions.
**Action:** Adding `aria-label="Close"` and `title="Close"` to these specific instances.
