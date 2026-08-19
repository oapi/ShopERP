## 2026-08-19 - Added ARIA labels to Icon-only Buttons
**Learning:** Found multiple instances of unlabelled `&times;` (multiply/close) buttons used across modals, POS cart removals, and purchase lists. Since `app.js` renders HTML purely via string concatenation, standard DOM-based accessibility linters might miss them.
**Action:** Always verify string-based HTML templates in vanilla JS applications for proper `aria-label` and `title` attributes on icon-only interactive elements.
