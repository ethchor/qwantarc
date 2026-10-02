---
title: "Colour"
section: foundations
summary: "Colour carries meaning and interactivity, so it is used sparingly and always backed by words or a symbol."
---

## Best practices

- **Use colour sparingly.** One accent carries interactivity; status colours appear only where there is status. A screen full of colour has no emphasis left.
- **Never use colour alone.** Pair every status colour with words, a symbol or a sign: “In stock”, “+12” and “−4”, a check or a warning symbol. People with colour blindness, and anyone reading a black-and-white printout, must get the same message.
- **Use roles, not raw colours.** Choose a colour by what it does (a label, a fill, a separator, a background), and let the role supply the value in each appearance ([R16](/design/qig/rules#r16)).
- **Keep text readable.** Coloured text, and fills behind text, use the text-safe variant of a colour, which meets WCAG AA contrast in light and dark.
- **Tint with mixes, not opacity hacks.** A tinted background mixes the colour into transparency at around 16%, with text in the colour’s text-safe variant.

## Roles

| Role            | Variants                                            | Use                                                                                      |
| --------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Label           | Primary, secondary, tertiary, quaternary            | Primary text; supporting text and metadata; placeholders and disabled text; watermarks. |
| Accent (tint)   | Tint, tint text, tint fill, on tint                 | Everything interactive: buttons, links, selection, focus.                                |
| Fill            | Primary, secondary, tertiary, quaternary            | Thin overlays that give controls a body: gray buttons, segmented tracks, hovers, chips. |
| Separator       | Default, soft, opaque                               | Hairlines between rows, around cards and under headers.                                  |
| Background      | Grouped, grouped secondary, grouped tertiary, elevated | The page; panels and rows on it; insets inside panels; anything that floats.          |
| System colours  | Red to brown, and six grays                         | Meaning and graphics: status, charts, illustrations, symbols.                            |

## Meaning

| Colour                                  | Means                       | Examples                                         |
| --------------------------------------- | --------------------------- | ------------------------------------------------ |
| Blue (the tint)                         | Interactive, informational  | Buttons, links, selection, focus, information    |
| Green                                   | Done, positive, present     | Saved, in stock, paid, online                    |
| Orange                                  | Needs attention             | Low, pending, unsaved, late                      |
| Red                                     | Destructive, failed, absent | Delete, errors, out of stock, offline            |
| Gray                                    | Neutral, inactive           | Disabled, archived, not started                  |
| Indigo, purple, teal, mint, pink, brown | Categories                  | Illustrations, chart series, category symbols    |

## System colours

Each colour has a slightly brighter value in dark appearance, so it keeps the same weight on a dark background.

| Colour | Light           | Dark            |
| ------ | --------------- | --------------- |
| Red    | rgb(255 56 60)  | rgb(255 66 69)  |
| Orange | rgb(255 141 40) | rgb(255 146 48) |
| Yellow | rgb(255 204 0)  | rgb(255 214 0)  |
| Green  | rgb(52 199 89)  | rgb(48 209 88)  |
| Mint   | rgb(0 200 179)  | rgb(0 218 195)  |
| Teal   | rgb(0 195 208)  | rgb(0 210 224)  |
| Cyan   | rgb(0 192 232)  | rgb(60 211 254) |
| Blue   | rgb(0 136 255)  | rgb(0 145 255)  |
| Indigo | rgb(97 85 245)  | rgb(109 124 255)|
| Purple | rgb(203 48 224) | rgb(219 52 242) |
| Pink   | rgb(255 45 85)  | rgb(255 55 95)  |
| Brown  | rgb(172 127 94) | rgb(183 138 102)|

The full set, including grays, labels, fills and backgrounds, is in [Design values](/design/qig/design-values).

## Charts

Charts use the system colours in a fixed order per series, keep the same colour for the same thing across a report, and label every series in text as well.

## Surfaces with their own colour

Some surfaces carry a colour the person chose, such as a personalised panel. Content on such a surface switches to the light or dark set of labels and fills that reads best on that colour, independent of the app’s appearance.
