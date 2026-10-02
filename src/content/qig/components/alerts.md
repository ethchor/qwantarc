---
title: "Alerts"
section: components
group: "Presentation"
order: 300
summary: "A small centred card that asks before something important or destructive happens."
---

## When to use

- Confirming destructive or irreversible work: deleting, cancelling, resetting.
- Telling people something they must act on before they continue.

## Best practices

- The title is a short question or a statement of the situation: “Delete This Project?”
- The message says the consequence in one or two sentences: “Its 12 tasks will be deleted too.”
- Buttons have specific titles, such as “Delete” or “Leave Anyway”, never “OK” or “Yes”, and there are at most three ([R13](/design/qig/rules#r13)).
- Destructive confirmations use a solid red button with Cancel beside it.
- A notice with nothing to decide has a single button: “Done” or “Got It”.

## Avoid

- Routine information. Use a [toast](/design/qig/toasts) or an [inline message](/design/qig/inline-messages).
- Undoable actions. Do them, then offer Undo.
