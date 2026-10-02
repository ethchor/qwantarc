---
title: "Toasts"
section: components
group: "Presentation"
order: 300
summary: "A brief, non-blocking message at the bottom of the screen, with an optional action such as Undo."
---

## When to use

- Confirming that work finished: “Document saved”.
- Offering Undo after a reversible change.
- Background failures that don’t block the screen.

## Best practices

- Four kinds: success, information, warning and error, plus progress for work that takes a moment.
- Short messages; fragments don’t need a full stop.
- At most one action, a single verb: “Undo”, “Try Again”.
- Problems and toasts with an action stay up longer.

## Avoid

- Errors that stop the task. Show them inline or in an [alert](/design/qig/alerts).
- Several toasts for one action.
