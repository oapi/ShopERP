## 2023-11-06 - Improve accessibility and visual feedback
**Learning:** In dynamically generated HTML strings (like modals), standard accessibility attributes (e.g., aria-label) are often omitted, making icon-only buttons invisible to screen readers. Furthermore, adding visual loading states to async forms is crucial for perceived performance.
**Action:** Always ensure dynamic string templates explicitly include proper ARIA attributes, and wrap form submissions with disabled/loading states.
