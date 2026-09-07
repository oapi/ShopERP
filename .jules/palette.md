## 2024-06-25 - ARIA Labels for Icon-Only Buttons
**Learning:** Icon-only buttons (like those using HTML entities such as `&times;` for close or remove actions) are inaccessible to screen readers without explicit labels and lack context on hover.
**Action:** Always ensure that interactive elements that lack descriptive text content include an explicit `aria-label` attribute (e.g., `aria-label="Close modal"`) for accessibility and a `title` attribute for mouse user tooltips.
