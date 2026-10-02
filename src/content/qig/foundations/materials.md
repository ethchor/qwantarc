---
title: "Materials"
section: foundations
summary: "Glass lifts navigation and controls above content, which always stays on opaque surfaces."
---

## Surfaces

| Surface            | Use                                            |
| ------------------ | ---------------------------------------------- |
| Grouped background | The page itself                                |
| Grouped secondary  | Panels, tables, list rows and fields on the page |
| Grouped tertiary   | Insets inside a panel                          |
| Elevated           | Sheets, alerts, popover bodies                 |
| Dimming            | The layer behind a sheet                       |

## Glass

Glass is the material of the functional layer: the controls and navigation that float above content. It blurs, brightens and slightly saturates whatever passes behind it, keeps a soft highlight along its top edge and a hairline rim, and so separates controls from content without hiding the content.

| Variant | Use                                                                                         |
| ------- | ------------------------------------------------------------------------------------------- |
| Regular | The default: sidebars, toolbars, tab bars, menus, popovers, floating bars. Legible over anything. |
| Thick   | Popovers, pop-up lists and pickers that hold many rows; more opaque.                        |
| Clear   | Only over rich media such as a camera preview or a photo, always with a dimming layer.      |
| Tinted  | The one prominent action inside a Glass bar.                                                |

## Best practices

- **Only the navigation and control layer** ([R1](/design/qig/rules#r1)). Tables, forms, cards, documents and sheet bodies are opaque. A sheet is an opaque elevated card over a dimmed, lightly blurred backdrop.
- **Never Glass on Glass** ([R2](/design/qig/rules#r2)). Buttons inside a Glass bar are plain; Glass containers aren’t nested. A popover opened from a Glass bar is its own layer, not a child surface.
- **Legibility first.** Labels on Glass use the label colours. When text gets hard to read, increase the tint or dimming, not the blur.
- **Fallbacks** ([R11](/design/qig/rules#r11)). Reduce Transparency and Increase Contrast make every Glass surface opaque.
- **Performance.** Keep Glass areas small and still, never animate a blur radius, and don’t put Glass on large scrolling regions.
- **Motion.** Glass elements enter with a short scale and fade. They don’t bounce.
