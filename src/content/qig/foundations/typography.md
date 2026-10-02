---
title: "Typography"
section: foundations
summary: "One family, a fixed set of text styles and the reader’s own text size give every screen a clear hierarchy."
---

## Typeface

Use the platform’s own interface font where there is one, and Inter everywhere else. A monospaced face is only for code and identifiers that must line up character by character. Numbers in tables use the interface font with tabular figures.

## Text styles

| Style       | Size (pointer / touch) | Use                                                   |
| ----------- | ---------------------- | ----------------------------------------------------- |
| Large Title | 31 / 34                | Hub titles; a single large total                      |
| Title 1     | 25 / 28                | Page titles                                           |
| Title 2     | 19 / 22                | Section titles in long pages; summary numbers         |
| Title 3     | 17 / 20                | Card and sheet titles                                 |
| Headline    | 14 / 17                | Emphasised row titles, group titles, empty-state titles |
| Body        | 14 / 17                | Default text, field values, table cells               |
| Callout     | 13 / 16                | Explanations under a section title                    |
| Subhead     | 12 / 15                | Page subtitles, secondary row text                    |
| Footnote    | 12 / 13                | Field labels, metadata, timestamps                    |
| Caption 1   | 11 / 12                | Chips, badges, chart axes                             |
| Caption 2   | 11 / 11                | The smallest legible text                             |

Sizes are at the default text size. Pointer devices default to a 14-point body and touch screens to 17.

## Best practices

- **Weights:** regular (400) for reading, medium (500) for row titles, semibold (600) for headings and buttons, bold (700) for page titles and large numbers. No light or thin weights in interfaces.
- **Hierarchy comes from size and weight first,** then from colour (primary, secondary, tertiary label), never from all capitals or underlines.
- **Tabular figures** for money, quantities, times and any column of numbers ([R15](/design/qig/rules#r15)). Align them to the end of the column.
- **Line length:** keep reading text to about 70 characters per line, and short explanations, such as empty states, to about 46.
- **Truncation:** truncate single-line labels with an ellipsis and give the full text in a tooltip or the detail view. Never truncate money or quantities.

## Text size

Text follows the reader’s chosen text size, across seven levels. Layouts must survive the largest: let rows grow, wrap labels, and never fix the height of something that contains text. Don’t shrink text below Caption 2 to make something fit; change the layout instead.
