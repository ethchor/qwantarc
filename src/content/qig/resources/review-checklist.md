---
title: "Review checklist"
section: resources
order: 2
summary: "What a reviewer checks on every interface change before it ships."
---

## Structure

- The screen uses a QIG pattern, or the review explains why not.
- A title row with a title and live subtitle; no coloured banner; one prominent action ([R4](/design/qig/rules#r4)).
- Toolbar order: search, then filters, then actions; rare actions in a “More” menu.
- Empty, loading and error states are designed ([R17](/design/qig/rules#r17)).

## Components

- Existing components are used before new ones.
- Button roles match the job; destructive is red and confirmed or undoable ([R5](/design/qig/rules#r5)).
- Segmented controls are never empty ([R9](/design/qig/rules#r9)); pop-up buttons show the current value.
- Sheets have a titled header and a close button, Cancel first and the default action last; one sheet at a time; no popover on a popover ([R10](/design/qig/rules#r10)).
- Alerts only for critical decisions, with specific button titles ([R13](/design/qig/rules#r13)).
- Tables: identifying column first, numbers aligned to the end with tabular figures, quiet row actions.

## Visual

- Design values only, no one-off colours or sizes ([R16](/design/qig/rules#r16)).
- Glass only in the navigation and control layer, never on content and never nested ([R1](/design/qig/rules#r1), [R2](/design/qig/rules#r2)).
- Concentric corners ([R6](/design/qig/rules#r6)); half-point hairlines; shadows from the three tiers.
- Outlined icons, monochrome in toolbars ([R3](/design/qig/rules#r3), [R7](/design/qig/rules#r7)).
- Motion uses the standard durations; nothing animates on frequent actions.

## Words

- Title Case on buttons, menu items and titles; sentence case elsewhere ([R15](/design/qig/rules#r15)).
- An ellipsis only when a control opens more input.
- Errors say what happened and what to do; toasts confirm in a few words.
- Money, dates and counts follow [Writing](/design/qig/writing).

## Access

- Works from the keyboard with a visible focus ring; focus is never stolen ([R18](/design/qig/rules#r18)).
- Every field has a label; every icon-only control has an accessible label and a tooltip.
- Contrast meets AA in light and dark; colour is never the only signal.
- Checked at the largest text size, on touch, and with Reduce Motion, Reduce Transparency and Increase Contrast ([R11](/design/qig/rules#r11), [R14](/design/qig/rules#r14)).
