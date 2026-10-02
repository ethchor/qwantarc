---
title: "Feedback"
section: patterns
summary: "Match the weight of the feedback to how much it matters, and never stay silent on failure."
---

| Situation                            | Feedback                                                   |
| ------------------------------------ | ---------------------------------------------------------- |
| A control changed state              | The control itself: a switch, a selection, a pressed button |
| Work finished                        | A [toast](/design/qig/toasts): “Document saved”            |
| Something reversible happened        | A toast with Undo                                          |
| A condition lasts while people work  | An [inline message](/design/qig/inline-messages), such as offline |
| A field is wrong                     | An error under the field                                   |
| Something critical needs a decision  | An [alert](/design/qig/alerts), rarely ([R13](/design/qig/rules#r13))               |

## Best practices

- Never report success that didn’t happen, and never stay silent on failure.
- Errors say what happened, why if it helps, and what to do next, in plain words.
- Background work that fails tells people where to retry.
