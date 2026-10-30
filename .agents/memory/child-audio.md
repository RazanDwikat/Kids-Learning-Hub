---
name: Child-facing narration constraints
description: Provider eligibility and narration choices for a product aimed at ages 6–7.
---

Do not use the ElevenLabs-backed audio-generation callbacks for this child-facing product.

**Why:** The provided ElevenLabs policy explicitly prohibits bundled solutions targeting users under 13. The target audience here is ages 6–7, so provider eligibility must be checked even for prototype narration.

**How to apply:** Browser/device speech may be used for exploratory prototypes with captions and an explicit unavailable state, but not as a substitute for the recorded narration requested for the app.

Prefer packaged, locally synthesized narration from appropriately licensed open models for this app.

**Why:** The user explicitly requires natural English audio that actually plays in the browser. Packaged recordings avoid browser voice availability differences, permit deterministic animation timing, and avoid sending child data to a voice provider. Kokoro's Apache-2.0 model/voice licensing was checked for this approach.

**How to apply:** Recheck licensing for any new model or voice, preserve attribution, and verify non-silent browser output rather than merely observing that a playback call was made. Keep generation-time model weights out of the app. Maintain separate current playback and furthest saved progress so replay cannot decrease server progress.

Verify browser autoplay against actual media events and the play promise, not an optimistic library `playing` flag.

**Why:** Expo Audio 57's web implementation discards the underlying play promise and can report playing after the browser rejects autoplay. A timeout checking that flag also misses the failure.

**How to apply:** Preserve rejection handling and a retry that invokes media playback directly within the user's tap. Include a rejected-autoplay case whenever replacing the playback layer.