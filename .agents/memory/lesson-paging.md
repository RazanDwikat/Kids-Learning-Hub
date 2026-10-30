---
name: Lesson viewport sizing
description: Expo web lesson paging needs a usable height before layout callbacks run.
---
Initialize full-screen pager measurements from the window dimensions rather than relying exclusively on the first layout callback.

**Why:** In the Expo web preview, the lesson container did not initialize its layout measurement when entered from another full-height screen. Pages collapsed to their content heights and could not scroll far enough to activate the next scene.

**How to apply:** Keep a nonzero initial page height and reconcile it on layout/resize. When paging appears stuck, inspect actual page rectangles and scrollHeight before changing gesture thresholds; mouse-drag text selection is not a valid touch-swipe test.

Nested scroll surfaces need their own explicit viewport constraint rather than only a fixed-height clipping parent.

**Why:** React Native Web can expand an inner ScrollView to its content even when its parent clips it, making later adventure stops unreachable.

**How to apply:** Bound the inner viewport, then inspect its clientHeight, scrollHeight and scrollTop—not the outer document's dimensions—to confirm that the last item is reachable.