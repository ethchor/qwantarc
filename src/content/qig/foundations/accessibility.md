---
title: "Accessibility"
section: foundations
summary: "Accessible screens are faster for everyone: legible type, clear focus and full keyboard control help every person who uses them."
---

## Contrast and colour

- Text meets WCAG AA: 4.5:1 for normal text and 3:1 for large text (18 points and up, or 14 points bold), icons and control boundaries.
- Never use colour alone; pair status colours with words, symbols or signs.
- Check every screen in light, dark and Increase Contrast.

## Keyboard and focus

- Everything works from the keyboard, in the visual order ([R18](/design/qig/rules#r18)).
- Focus is always visible. The focus ring is never removed, only moved, for example onto a whole row when the row is the button.
- Sheets move focus inside when they open and return it to the trigger when they close; Escape closes the top layer.
- Lists, menus and pickers use the arrow keys; Return selects; Home and End jump.
- Focus is never stolen from the field people are typing in.
- Custom shortcuts never override the standard ones (copy, paste, undo, find, print) and are always shown somewhere.

## Screen readers

- Use the platform’s semantic elements first: buttons for actions, links for navigation, real tables for tables, headings in order and a label for every field.
- Icon-only controls have an accessible label; decorative icons are hidden from assistive technology.
- Name regions and toolbars, announce changes that matter (toasts are live regions), and give images meaningful alternative text.
- Charts have a text summary and the data in a table nearby.

## Size, touch and pointer

- Hit targets are at least 44 × 44 points on touch and 28 × 28 with a pointer ([R14](/design/qig/rules#r14)).
- Leave space between adjacent targets; never put a destructive action right beside a frequent one.
- Every gesture has a visible alternative, such as a swipe action that is also in a menu.

## Text size

All text follows the reader’s text size. Test at the largest: rows grow, labels wrap, nothing is clipped, and no container has a fixed height around text.

## Motion and transparency

- Reduce Motion turns transitions into instant changes ([R11](/design/qig/rules#r11)).
- Nothing flashes more than three times a second; nothing loops for attention.
- Reduce Transparency and Increase Contrast make every Glass surface opaque.

## Inclusion

- Plain language, with no unexplained jargon or abbreviations.
- People-first wording, and no idioms that don’t translate.
- Names, addresses, numbers and dates follow the reader’s locale and never assume one format.
- Layouts work right to left, and leave room for longer words in translation.

## Checking

- A keyboard-only pass through the screen’s main task.
- A screen-reader spot check of every new control.
- Light, dark, Increase Contrast, Reduce Motion, Reduce Transparency, the largest text size, a touch screen and a narrow window.
