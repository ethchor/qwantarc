---
title: "Shape and elevation"
section: foundations
summary: "Concentric corners and restrained shadows; depth comes mostly from materials."
---

## Corner radii

| Radius  | Value   | Use                                                    |
| ------- | ------- | ------------------------------------------------------ |
| Extra small | 4   | Checkboxes, tiny chips                                 |
| Small   | 6       | Menu items, table cells, calendar days                 |
| Medium  | 10      | Text fields, list cells, small cards                   |
| Large   | 14      | Panels, tables, popovers, menus                        |
| Extra large | 18  | Large cards, hub tiles                                 |
| 2× large | 26     | Sheets and alerts                                      |
| Capsule | full    | Buttons, search fields, switches, chips, segmented controls |

## Concentric corners

A shape inside another uses the outer radius minus the padding between them, so the curves run parallel ([R6](/design/qig/rules#r6)). A sheet with a 26-point radius and 12 points of padding holds cards with a 14-point radius.

## Elevation

Depth comes mostly from materials, not shadows. Three shadow tiers cover everything:

| Tier   | Use                                                   |
| ------ | ----------------------------------------------------- |
| Small  | Panels and cards on the page, a selected segment      |
| Medium | Hovered or dragged cards, floating controls           |
| Large  | Sheets, popovers, menus, toasts                       |

## Hairlines

Separators are half a point wide, so they stay fine on dense, high-resolution screens. Prefer space to lines; add a line only when space alone doesn’t make the grouping clear.
