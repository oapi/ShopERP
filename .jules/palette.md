## 2024-09-24 - Adding ARIA labels to icon-only buttons
**Learning:** In dynamically generated Javascript templates, accessibility tools cannot easily catch missing aria-labels on icon-only buttons (like `&times;` closes or removes).
**Action:** Always manually check dynamically generated HTML templates for icon-only buttons and ensure they receive both `aria-label` (for screen readers) and `title` (for mouse hover tooltips).
