---
name: Child-facing narration constraints
description: Provider eligibility and narration choices for a product aimed at ages 6–7.
---

Do not use the ElevenLabs-backed audio-generation callbacks for this child-facing product.

**Why:** The provided ElevenLabs policy explicitly prohibits bundled solutions targeting users under 13. The target audience here is ages 6–7, so provider eligibility must be checked even for prototype narration.

**How to apply:** Browser/device speech is suitable for interactive prototype narration, with captions and an explicit unavailable state. If higher-quality recorded narration is requested, choose a provider whose current terms permit this audience before generating assets. Do not promise a consistent voice across devices when relying on device speech.