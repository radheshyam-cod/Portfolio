## 2025-01-20 - Context-Specific Accessibility for Mapped Icon Links
**Learning:** When rendering identical icon-only links (e.g., GitHub, Live Demo) within mapped collections like a project grid, screen readers will redundantly read the same generic text for each item, making navigation confusing.
**Action:** Always apply dynamic, context-specific `aria-label` and `title` attributes (e.g., incorporating `${project.title}`) to icon-only links within mapped collections to ensure they are uniquely identifiable.
