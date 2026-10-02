---
title: "Page anatomy"
section: patterns
summary: "Every working page reads top to bottom the same way: title row, toolbar row, content and its states."
---

## Title row

The title says what the screen is, never the app’s name. A subtitle beneath it carries live context, such as “18 active · 4 pending”. Page actions sit at the trailing end, and exactly one of them is prominent ([R4](/design/qig/rules#r4)).

## Toolbar row

Search, filters and actions for the content below, in one row that wraps on narrow screens.

- Order: search at the leading edge, then filters, then actions at the trailing edge. Rare actions go in a “More” menu.
- Filters show their current value. Use a segmented control for two to five fixed values and pop-up buttons for more.
- Bulk destructive actions use the destructive tint, never the prominent style, and they confirm.

## Content

Tables, panels or panes on opaque surfaces. The page scrolls inside its own frame, so a table takes the leftover height, scrolls in its card and keeps its heading row in view.

## States

Every content area designs its empty, loading and error states inside itself, never as a blank card ([R17](/design/qig/rules#r17)).
