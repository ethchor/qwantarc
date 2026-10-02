---
title: "Layout"
section: foundations
summary: "Consistent margins, a spacing scale and layouts that adapt from a phone to a wide desktop window."
---

## Page anatomy

Every working screen reads top to bottom the same way: a title row, a toolbar row, then content on opaque surfaces. The page opens with its title, never with a coloured banner. Page actions sit at the trailing end of the title row; global actions live in the app’s toolbar. See [Page anatomy](/design/qig/page-anatomy) for the full pattern.

## Spacing

Spacing comes from a scale built on 4: **4, 8, 12, 16, 20, 24, 32, 40, 48.**

- 16 between page sections, 12 between related controls, 8 inside compact groups, 4–6 between a label and its field.
- Group with space first, then with a container, and only then with a line.
- Page side margins scale with the window, from 12 on phones to 24 on wide screens.

## Alignment and density

- Align to the leading edge: titles, labels and text start together; numbers align to the end.
- Use one column of labels and fields in sheets and two columns in wide forms.
- Pointer devices get compact controls (28, 36 and 44 points tall); touch screens get larger ones (36, 44 and 50) ([R14](/design/qig/rules#r14)).

## Size classes

| Width        | Class   | Typical layout                                     |
| ------------ | ------- | -------------------------------------------------- |
| Below 768    | Compact | One column; panes stack; the sidebar becomes an overlay |
| 768 to 1023  | Regular | Two columns where they help; the sidebar can collapse |
| 1024 and up  | Wide    | Sidebar, content and an optional inspector side by side |

## Scrolling

- One scroll per axis. Never nest two vertical scroll areas unless the inner one is a clearly bounded list in a pane.
- Headings in tables stay in view; toolbars stay put while content scrolls.
- A working screen scrolls inside its own frame, so the toolbar and title row stay put. A long table takes the leftover height and scrolls in its card.
- Content that scrolls under a Glass bar fades at the edge so the bar stays legible.
