## 2024-10-12 - Accessibility Linting Gap for JS Templates
**Learning:** Dynamically generated Vanilla JS string templates (e.g., in `public/app.js`) bypass standard static analysis linting for accessibility (like ESLint plugin for JSX/HTML).
**Action:** Always manually search for icon-only buttons (like modal closes `&times;` or pagination arrows) and manually verify their `aria-label` and `title` attributes when updating Vanilla JS files.
