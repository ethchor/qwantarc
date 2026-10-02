---
title: "Editing records"
section: patterns
summary: "Adding or editing a record in a sheet: a titled header, grouped sections, and Cancel and Save."
---

## Best practices

- The title names the task (“Add Contact”, “Edit Project”); the subtitle says where the record belongs.
- Group fields by meaning, such as details, contact and address, with five to seven fields per group. Two columns when there is room.
- Save is disabled until required fields are valid. Errors appear after a field has been touched, not on open.
- Identifiers and generated values are shown as read-only information.
- Escape and Cancel ask before discarding edits, and never ask when nothing changed.
- Save closes the sheet and confirms with a toast.
- When a record needs more than a few minutes or several steps to complete, give it a page instead of a sheet.
