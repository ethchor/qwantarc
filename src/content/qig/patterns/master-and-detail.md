---
title: "Master and detail"
section: patterns
summary: "A list on the leading side and the selected item’s details beside it, each scrolling on its own."
---

## When to use

Browsing records that people compare or review one after another: people, messages, history, cases.

## Best practices

- The selection stays highlighted in the list, and the detail pane says what is selected in its header.
- With nothing selected, the detail pane shows an empty state that says how to choose.
- Each pane scrolls on its own; the list keeps its position when the detail changes.
- Arrow keys move through the list and update the detail.
- In a compact width the panes stack, and the detail opens as its own view with a way back.
