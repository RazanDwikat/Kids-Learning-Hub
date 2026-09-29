---
name: Lesson viewport sizing
description: Expo web lesson paging needs a usable height before layout callbacks run.
---
Initialize full-screen pager measurements from the window dimensions rather than relying exclusively on the first layout callback.

**Why:** In the Expo web preview, the lesson container did not initialize its layout measurement when entered from another full-height screen. Pages collapsed to their content heights and could not scroll far enough to activate the next scene.

**How to apply:** Keep a nonzero initial page height and reconcile it on layout/resize. When paging appears stuck, inspect actual page rectangles and scrollHeight before changing gesture thresholds; mouse-drag text selection is not a valid touch-swipe test.