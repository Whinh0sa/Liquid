## 2024-05-18 - Added ARIA labels to icon-only buttons
**Learning:** Found multiple instances where icon-only buttons (`X` for close, `Bell` for notifications) lacked proper ARIA labels, which degrades screen reader accessibility. Formatting single-line JSX files significantly expanded the file size, making diffs larger despite small logical changes.
**Action:** Consistently add `aria-label`s to interactive elements containing only icons for better a11y compliance, and expect formatters to expand previously minified/compacted JSX blocks.
