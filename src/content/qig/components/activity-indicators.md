---
title: "Activity indicators"
section: components
group: "Status"
order: 600
summary: "A small Glass panel with a spinner and a title over a dimmed screen, for short blocking work."
---

## When to use

A few seconds of work that must finish before anything else, such as signing in.

## Best practices

- Appears only after a short delay, so quick work doesn’t flash it.
- The title says what is happening: “Signing In…”.

## Avoid

- Background work. Use a progress toast.
- Long work. Show progress and let people continue.
