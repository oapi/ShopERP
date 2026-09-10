## 2024-05-24 - Accessibility for dynamic tables and modals
**Learning:** Icon-only close and remove buttons in the dynamic cart and modal components use HTML entities like `&times;` and require `aria-label` and `title` to be accessible and usable.
**Action:** When adding or modifying interactive icon-only elements generated via template literals in `public/app.js`, always ensure explicit accessibility attributes are included.
