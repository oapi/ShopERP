## 2023-10-25 - ARIA Labels in Vanilla JS Templates
**Learning:** Dynamically generated HTML templates in vanilla JS (like in `public/app.js`) bypass standard accessibility linting. Icon-only interactive elements (like modal closes or item removal buttons) require manual checking and adding of `aria-label` and `title` attributes.
**Action:** When working on pure JS template strings, always manually verify icon-only buttons or interactive elements to ensure they include proper `aria-label` and `title` attributes, since static tools won't catch them.
