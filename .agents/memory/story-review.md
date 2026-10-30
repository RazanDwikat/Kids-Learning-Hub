---
name: Story review isolation
description: Why story replay must stay separate from saved learning progress.
---
Treat Review Story as an ungraded, ephemeral replay, not a new learning enrollment or reset of saved progress. Each explicit review starts all interactions fresh; backtracking within that review may retain local interaction state.

**Why:** The user explicitly requires completed scenes and lesson completion to remain saved while dragged objects, answers and activities restart. Durable learning endpoints enforce monotonic progress and reject attempts on completed scenes, so sending replay interactions there would conflict with that contract or inflate learning statistics.

**How to apply:** New story interactions need review-local state and a fresh-session reset. Keep replay answers, hints, playback, navigation and background saves out of durable API writes and pending-attempt storage. Current addition replay uses operand-based local feedback; if future content requires authoritative validation, add a non-persisting review endpoint rather than reuse graded attempt writes.