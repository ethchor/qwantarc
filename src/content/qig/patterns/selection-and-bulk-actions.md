---
title: "Selection and bulk actions"
section: patterns
summary: "Select many records and act on them together; bulk actions state the count and its consequence."
---

## Best practices

- A selected row is highlighted in the tint, and the selection survives scrolling and paging.
- Bulk actions appear once something is selected and state the count: “Archive 3 Projects”.
- A bulk destructive action confirms with the count and the consequence, then reports the outcome.
- Selecting all selects what is visible first, then offers to extend to everything that matches.
- Escape clears the selection.
