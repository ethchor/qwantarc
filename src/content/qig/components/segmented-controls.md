---
title: "Segmented controls"
section: components
group: "Actions"
order: 100
summary: "Two to five mutually exclusive segments that switch a view or a filter."
---

## When to use

- Switching between views of the same content, such as List and Board.
- Filters with a few fixed values, such as Day, Week and Month.

## Best practices

- Never empty ([R9](/design/qig/rules#r9)): with single selection, one segment is always selected.
- Segments are nouns or short adjectives of similar length, optionally with a symbol.
- The track is a gray fill; the selected segment is raised.

## Avoid

- More than five segments. Use a [pop-up button](/design/qig/pop-up-buttons).
- Actions. Segments select; they don’t do.
