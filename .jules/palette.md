## 2025-05-18 - Add tooltips and ARIA labels to icon-only buttons
**Learning:** Icon-only buttons (like modal close buttons, cart item removal buttons, and the sidebar menu toggle) were missing tooltips and some missing ARIA labels, making them less accessible for screen reader users and less discoverable for sighted users.
**Action:** Always verify that buttons lacking descriptive text contain `aria-label` and `title` attributes.
