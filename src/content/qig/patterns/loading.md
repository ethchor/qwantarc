---
title: "Loading"
section: patterns
summary: "Show the screen’s structure at once, then fill it in, and let people keep working while data loads."
---

## Best practices

- Show the screen’s structure immediately, with [skeletons](/design/qig/skeletons) on first loads, then fill it in.
- Let people keep working while data loads; block only what truly depends on it.
- **Known amount of work:** a [progress bar](/design/qig/progress-bars) with what is happening and a count.
- **Unknown amount of work:** a [spinner](/design/qig/spinners) beside the thing that is loading, with words when it lasts.
- **Short blocking work,** such as signing in: an [activity indicator](/design/qig/activity-indicators), shown only after a short delay so fast work doesn’t flash it.
- **Long jobs,** such as imports, run in the background with a progress toast and a result.
