## 2024-08-15 - Missing Accessibility Labels on Icon-Only Buttons
**Learning:** Found a specific pattern in the app's components where icon-only buttons (like `&times;` and `☰`) lack complete accessibility labels. Some had `aria-label` but missing `title` for tooltip on hover, while some were completely missing both.
**Action:** When adding or modifying interactive elements like icon-only buttons (especially HTML entities like `&times;` or `☰`), ensure accessibility by always providing explicit `aria-label` attributes for screen readers and `title` attributes for tooltips on hover.
