## 2026-08-27 - Add aria-label and title to icon-only buttons
**Learning:** Icon-only buttons (like &times;) without text content fail accessibility standards as screen readers cannot announce their purpose, and sighted users might need tooltips to understand them fully.
**Action:** Always provide explicit `aria-label` attributes and `title` tooltips on icon-only interactive elements to guarantee accessibility and usability.
