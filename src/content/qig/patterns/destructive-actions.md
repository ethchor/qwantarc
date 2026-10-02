---
title: "Destructive actions"
section: patterns
summary: "Confirm what can’t be taken back; act at once and offer Undo for frequent edits that can."
---

## Best practices

- **Reversible and frequent,** such as removing a line or archiving a record: do it now and offer Undo in a toast.
- **Irreversible,** such as deleting a record or resetting data: an [alert](/design/qig/alerts) with the consequence and a red, specific button (“Delete Project”), with Cancel beside it ([R5](/design/qig/rules#r5)).
- Destructive buttons are never the prominent style and never the default for Return.
- Report what happened afterwards, with counts: “3 projects deleted”, “Couldn’t delete: check your connection”.
- Bulk actions say how many things they affect, before and after.
