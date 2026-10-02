---
title: "Motion"
section: foundations
summary: "Motion explains a change and then gets out of the way; frequent actions don’t animate at all."
---

Motion explains change: where something came from, what is on top, what just happened. It is never decoration.

## Durations and curves

| Value    | Setting             | Use                                                 |
| -------- | ------------------- | --------------------------------------------------- |
| Fast     | 150 ms              | Hover, press, menus, popovers, small state changes  |
| Standard | 250 ms              | Sheets, panels, toasts, page sections               |
| Slow     | 350 ms              | Large layout changes, switching appearance          |
| Standard curve | ease          | Most transitions                                    |
| Ease out | decelerating        | Things entering the screen                          |
| Spring   | slight overshoot    | Rare, playful confirmations, like a switch thumb    |

## Best practices

- **Don’t animate frequent work.** Typing, adding a row, refreshing a table and moving with the keyboard happen instantly. Speed beats flourish.
- **Sheets** scale up slightly and fade in over a fading dimming layer; **alerts** appear in place; **popovers and menus** scale from their anchor; **toasts** slide up from the bottom.
- **Never block input.** Interrupting an animation must always work. Nothing lasts longer than 350 ms, except progress.
- **No looping or attention-seeking animation.** A spinner is the only thing that spins.
- **Reduce Motion** ([R11](/design/qig/rules#r11)). Durations drop to zero, and movement is replaced with a fade where a change still needs explaining.
- **No flashing.** Nothing flashes more than three times a second.
