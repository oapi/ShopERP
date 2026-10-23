## 2024-05-18 - Accessibility for Unicode Icon Buttons
**Learning:** Icon-only buttons that rely on Unicode symbols (like ◀, ▶, &times;) are not announced meaningfully by screen readers by default. Relying on `title` attributes is also insufficient for comprehensive accessibility.
**Action:** Always add explicit `aria-label` attributes to icon-only buttons (and `aria-current` for active navigation items like pagination) to ensure screen readers provide context and clear instructions to visually impaired users.
