---
title: "Sheets"
section: components
group: "Presentation"
order: 300
summary: "A focused task in an opaque card over a dimmed, lightly blurred backdrop: add, edit, pick, review."
---

## When to use

Short, self-contained tasks that return to the screen behind: adding a contact, choosing an option set, reviewing a change.

## Anatomy

A header with the title, an optional subtitle and a round close button; scrollable content; actions at the trailing end of the footer.

## Best practices

- The title names the task (“Add Contact”, “Edit Project”); the subtitle gives context.
- Cancel comes first and the default action last, in the prominent style. Disable it until the form is valid.
- Escape and the close button dismiss; ask before discarding edits.

## Avoid

- Long workflows with many steps. Give them a page.
- A sheet on top of a sheet. Finish or close the first.
- Simple confirmations. Use an [alert](/design/qig/alerts).

## Accessibility

- Focus moves into the sheet and returns to the trigger on close.
- The title is the sheet’s accessible name.
