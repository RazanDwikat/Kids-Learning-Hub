---
name: Expo web API routing
description: Observed gateway behavior and the web/native API-origin distinction.
---

Use same-origin `/api` for the Expo web preview; retain the configured absolute API origin for native bundles.

**Why:** On 2026-09-29, the Expo preview hostname itself returned Express JSON from `/api/healthz` and `/api/learning/state`. The app had unnecessarily sent browser requests to a second hostname. Backend health and permissive CORS on that hostname do not prove that a user's embedded browser can reach it.

**How to apply:** Verify the gateway's actual JSON responses before assuming Expo needs a custom proxy. Do not add a Metro proxy where the existing gateway already routes the API. Keep the native absolute-origin configuration separate from browser requests. Avoid claiming a specific browser-blocking cause without evidence from that user's failed request.