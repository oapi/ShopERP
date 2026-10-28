## 2024-10-28 - Missing ARIA labels on dynamic icon-only buttons
**Learning:** Icon-only buttons (like `&times;`) that are dynamically generated in JavaScript string literals often miss accessibility attributes compared to static HTML counterparts.
**Action:** Always ensure dynamic UI components generating icon-only buttons include descriptive `aria-label` attributes for screen readers.
