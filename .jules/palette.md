## 2024-11-07 - Dynamic HTML string missing ARIA labels
**Learning:** In this application's architecture, UI components are dynamically rendered via string concatenation in app.js. This pattern often leads to missing standard accessibility attributes like aria-label on icon-only buttons (like &times; modal closes or removal buttons), which are present in static HTML.
**Action:** When working on this codebase, always scrutinize dynamically generated icon-only buttons for missing aria-label and title attributes to ensure screen reader compatibility.
