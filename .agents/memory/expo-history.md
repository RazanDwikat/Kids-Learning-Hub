---
name: Expo web history timing
description: Router initialization can overwrite a nested screen's first browser-history marker.
---

Test the first Back/Forward transition after a fresh Expo web load, not only transitions made later in the session.

**Why:** Expo Router initializes its root history state after child effects can run. A screen-state navigation layer's initial marker may disappear even though later screen transitions behave correctly. This occurred during Little Sprout's connected-page verification.

**How to apply:** Keep the initial departing entry associated with its screen when adding browser-history support. Preserve the product's Home-on-reload and explicit Continue behavior; restoring a saved learning position does not require reopening the last screen automatically.