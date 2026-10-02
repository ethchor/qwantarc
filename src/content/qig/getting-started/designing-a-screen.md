---
title: "Designing a screen"
section: getting-started
order: 3
summary: "From a blank canvas to a reviewed screen: find the pattern, compose components, apply the foundations, write, check."
---

## Start from the task

Write down, in one sentence, the job the screen exists for. Everything on it should serve that sentence. Anything that doesn’t moves to a menu, an inspector or another screen.

## Steps

1. **Find the pattern.** Most screens are one of a few shapes: a [page with a table](/design/qig/page-anatomy), [master and detail](/design/qig/master-and-detail), a [form in a sheet](/design/qig/editing-records), a [hub](/design/qig/hubs), a [settings list](/design/qig/settings) or a [keyboard-first workspace](/design/qig/keyboard-first-work). [Choosing a layout](/design/qig/choosing-a-layout) helps you pick.
2. **Compose it from components.** Use the controls in [Components](/design/qig/components) before inventing new ones. A new control has to do a job no existing one can.
3. **Apply the foundations.** Colour roles, text styles, spacing, radii, materials and motion come from [Foundations](/design/qig/foundations) and the [design values](/design/qig/design-values) ([R16](/design/qig/rules#r16)).
4. **Write the words.** Titles, buttons, messages and empty states follow [Writing](/design/qig/writing).
5. **Check access.** Keyboard, screen reader, contrast, text size and motion, as in [Accessibility](/design/qig/accessibility).
6. **Review.** Go through the [review checklist](/design/qig/review-checklist) before the screen ships.

## Sketch the anatomy first

Before any detail, place the four parts every working screen has, top to bottom:

- **Title row:** what the screen is, live context underneath, page actions at the trailing end, exactly one of them prominent ([R4](/design/qig/rules#r4)).
- **Toolbar row:** search first, then filters, then actions.
- **Content:** tables, lists, panels or panes on opaque surfaces.
- **States:** what the content area shows when it is empty, loading or failed ([R17](/design/qig/rules#r17)).

## Design both appearances from the start

Check light and dark, the largest text size, a touch screen and a narrow window while you design, not at the end. A layout that only works at one size, in one appearance, isn’t finished.
