---
title: "Design values"
section: resources
order: 1
summary: "Every named value in QIG, in light and dark: colours, materials, shadows, radii, motion, type and control sizes."
---

Use the role, not the number: pick a value by what it does, and let the system supply the right number for each appearance ([R16](/design/qig/rules#r16)). The numbers here are for building a QIG theme on any platform.

## System colours

| Colour | Light           | Dark             |
| ------ | --------------- | ---------------- |
| Red    | rgb(255 56 60)  | rgb(255 66 69)   |
| Orange | rgb(255 141 40) | rgb(255 146 48)  |
| Yellow | rgb(255 204 0)  | rgb(255 214 0)   |
| Green  | rgb(52 199 89)  | rgb(48 209 88)   |
| Mint   | rgb(0 200 179)  | rgb(0 218 195)   |
| Teal   | rgb(0 195 208)  | rgb(0 210 224)   |
| Cyan   | rgb(0 192 232)  | rgb(60 211 254)  |
| Blue   | rgb(0 136 255)  | rgb(0 145 255)   |
| Indigo | rgb(97 85 245)  | rgb(109 124 255) |
| Purple | rgb(203 48 224) | rgb(219 52 242)  |
| Pink   | rgb(255 45 85)  | rgb(255 55 95)   |
| Brown  | rgb(172 127 94) | rgb(183 138 102) |

Each colour also has a **text-safe** variant that meets WCAG AA on the default backgrounds. Use it for coloured text and for fills behind text.

## Grays

| Gray   | Light           | Dark           |
| ------ | --------------- | -------------- |
| Gray   | rgb(142 142 147) | rgb(142 142 147) |
| Gray 2 | rgb(174 174 178) | rgb(99 99 102)  |
| Gray 3 | rgb(199 199 204) | rgb(72 72 74)   |
| Gray 4 | rgb(209 209 214) | rgb(58 58 60)   |
| Gray 5 | rgb(229 229 234) | rgb(44 44 46)   |
| Gray 6 | rgb(242 242 247) | rgb(28 28 30)   |

## Accent

| Role     | Light            | Dark             |
| -------- | ---------------- | ---------------- |
| Tint     | Blue             | Blue             |
| Tint fill (behind text) | rgb(30 110 244) | rgb(30 110 244) |
| On tint  | rgb(255 255 255) | rgb(255 255 255) |

## Labels

| Role       | Light                  | Dark                      |
| ---------- | ---------------------- | ------------------------- |
| Label      | rgb(0 0 0)             | rgb(255 255 255)          |
| Secondary  | rgb(60 60 67 / 0.72)   | rgb(235 235 245 / 0.64)   |
| Tertiary   | rgb(60 60 67 / 0.5)    | rgb(235 235 245 / 0.45)   |
| Quaternary | rgb(60 60 67 / 0.18)   | rgb(235 235 245 / 0.16)   |

## Backgrounds

| Role               | Light            | Dark          |
| ------------------ | ---------------- | ------------- |
| Background         | rgb(255 255 255) | rgb(0 0 0)    |
| Secondary          | rgb(242 242 247) | rgb(28 28 30) |
| Tertiary           | rgb(255 255 255) | rgb(44 44 46) |
| Grouped            | rgb(242 242 247) | rgb(0 0 0)    |
| Grouped secondary  | rgb(255 255 255) | rgb(28 28 30) |
| Grouped tertiary   | rgb(242 242 247) | rgb(44 44 46) |
| Elevated           | rgb(255 255 255) | rgb(44 44 46) |

## Fills

| Role       | Light                    | Dark                     |
| ---------- | ------------------------ | ------------------------ |
| Fill       | rgb(120 120 128 / 0.2)   | rgb(120 120 128 / 0.36)  |
| Secondary  | rgb(120 120 128 / 0.16)  | rgb(120 120 128 / 0.32)  |
| Tertiary   | rgb(118 118 128 / 0.12)  | rgb(118 118 128 / 0.24)  |
| Quaternary | rgb(116 116 128 / 0.08)  | rgb(118 118 128 / 0.18)  |

## Separators

| Role    | Light                 | Dark                  |
| ------- | --------------------- | --------------------- |
| Default | rgb(60 60 67 / 0.29)  | rgb(84 84 88 / 0.6)   |
| Soft    | rgb(60 60 67 / 0.14)  | rgb(84 84 88 / 0.36)  |
| Opaque  | rgb(198 198 200)      | rgb(56 56 58)         |

## Glass

| Value      | Light                     | Dark                      |
| ---------- | ------------------------- | ------------------------- |
| Regular    | rgb(255 255 255 / 0.64)   | rgb(38 38 40 / 0.6)       |
| Clear      | rgb(255 255 255 / 0.2)    | rgb(38 38 40 / 0.22)      |
| Blur       | 22                        | 22                        |
| Saturation | 190%                      | 190%                      |
| Brightness | 1.04                      | 1.12                      |
| Highlight  | rgb(255 255 255 / 0.9)    | rgb(255 255 255 / 0.22)   |
| Rim        | rgb(0 0 0 / 0.08)         | rgb(255 255 255 / 0.1)    |
| Dimming    | rgb(0 0 0 / 0.35)         | rgb(0 0 0 / 0.35)         |

## Shadows

| Tier   | Light                                                    | Dark                                                    |
| ------ | -------------------------------------------------------- | ------------------------------------------------------- |
| Small  | 0 1 2 rgb(0 0 0 / 0.06)                                  | 0 1 2 rgb(0 0 0 / 0.3)                                  |
| Medium | 0 4 16 rgb(0 0 0 / 0.08), 0 1 3 rgb(0 0 0 / 0.06)        | 0 4 16 rgb(0 0 0 / 0.4), 0 1 3 rgb(0 0 0 / 0.3)         |
| Large  | 0 12 40 rgb(0 0 0 / 0.14), 0 2 8 rgb(0 0 0 / 0.06)       | 0 12 40 rgb(0 0 0 / 0.55), 0 2 8 rgb(0 0 0 / 0.3)       |

## Focus

A 3-point ring in the tint at 50% opacity, outside the control.

## Corner radii

| Radius      | Value |
| ----------- | ----- |
| Extra small | 4     |
| Small       | 6     |
| Medium      | 10    |
| Large       | 14    |
| Extra large | 18    |
| 2× large    | 26    |
| Capsule     | full  |

## Motion

| Value    | Setting                         |
| -------- | ------------------------------- |
| Fast     | 150 ms                          |
| Standard | 250 ms                          |
| Slow     | 350 ms                          |
| Ease     | cubic-bezier(0.25, 0.1, 0.25, 1) |
| Ease out | cubic-bezier(0.16, 1, 0.3, 1)   |
| Spring   | cubic-bezier(0.34, 1.36, 0.64, 1) |

## Control heights

| Size    | Pointer | Touch |
| ------- | ------- | ----- |
| Small   | 28      | 36    |
| Regular | 36      | 44    |
| Large   | 44      | 50    |

## Text styles

Size and line height, at the default text size.

| Style       | Pointer  | Touch    |
| ----------- | -------- | -------- |
| Large Title | 31 / 38  | 34 / 41  |
| Title 1     | 25 / 31  | 28 / 34  |
| Title 2     | 19 / 24  | 22 / 28  |
| Title 3     | 17 / 22  | 20 / 25  |
| Headline    | 14 / 19  | 17 / 22  |
| Body        | 14 / 19  | 17 / 22  |
| Callout     | 13 / 18  | 16 / 21  |
| Subhead     | 12 / 16  | 15 / 20  |
| Footnote    | 12 / 16  | 13 / 18  |
| Caption 1   | 11 / 13  | 12 / 16  |
| Caption 2   | 11 / 13  | 11 / 13  |

Weights: regular 400, medium 500, semibold 600, bold 700. Titles use slightly tighter tracking (−0.01 em).
