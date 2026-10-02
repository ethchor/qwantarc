---
title: "Buttons"
section: components
group: "Actions"
order: 100
summary: "Capsule buttons in roles, from the one prominent action of a view to quiet, plain and destructive ones."
---

## Roles

| Role        | Use                                                                 |
| ----------- | ------------------------------------------------------------------- |
| Prominent   | The one main action of the view ([R4](/design/qig/rules#r4)), such as Save                  |
| Normal      | Other actions, such as Cancel or Duplicate                          |
| Tinted      | An important action that isn’t the main one and keeps its colour meaning |
| Plain       | Low-emphasis actions, and buttons inside a Glass bar                |
| Destructive | Removes or cancels something; confirm it or offer Undo ([R5](/design/qig/rules#r5))         |
| Link        | Navigation that reads as part of the text                           |

## Best practices

- Titles are verbs in Title Case, such as “Save Document” or “Add Contact”; add an ellipsis when the button opens another view (“Print…”).
- Use three sizes, small, regular and large, which follow the touch-aware control heights. An extra-small size is only for dense tables.
- An icon goes before the title; a disclosure chevron goes after it.
- While working, disable the button, show a spinner inside it, and switch to a progressive title (“Saving…”).
- In a group, Cancel comes first and the default action last, at the trailing end.

## Avoid

- Two prominent buttons in one view.
- A destructive action in the prominent style.
- “OK”, “Yes” or “Submit” as titles.

## Accessibility

- Use a real button for actions and a link only for navigation.
- Disabled buttons keep their title readable; explain why nearby when it isn’t obvious.
