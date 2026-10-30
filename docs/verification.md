# Portability verification

Verified on Linux x64 with Node 24.22.1, pnpm 10.26.1 and PostgreSQL 16.10.
Commands used a minimal environment (PATH, HOME and explicit test configuration),
without Replit variables, domains, login or gateway.

## Completed

- Copied only tracked/new source files into a separate directory, excluding
  ignored assets, dependencies, local metadata and build output. Frozen-lockfile
  install, full typecheck and all production builds succeeded there.
- Initialized a disposable PostgreSQL cluster and fresh database with `db:push`.
  Existing project data was not modified.
- Ran 9 HTTP integration tests successfully against the standalone production
  server: learning persistence, isolation, request deduplication, activities,
  textbook questions, retry-friendly exams and reward behavior.
- Ran frontend logic tests for answer normalization, story review isolation,
  audio playback errors/recovery, and native API configuration.
- Exported iOS and Android JavaScript/assets using standard Expo tooling.
  Native output is separated from web output using `dist-native`.
- Started `pnpm dev` without platform configuration; browser gateway on a custom
  port returned the Expo HTML and `/api/healthz` returned JSON.
- Started `pnpm start` on a custom port. Home, deep-link paths, demo and design
  preview returned HTML; unknown API paths and missing assets returned 404.
- Browser pass confirmed lesson play/pause state, saved progress after reload,
  homework selection and answer advancement, parent reward create/edit/delete
  and persistence, the exact Drive fallback link, and the design preview.
- Fixed Express's default hiding of exported pnpm font paths. All 44 exported
  font/narration files were subsequently requested successfully over HTTP.

## Limits and observations

- The app's lesson navigation is in-memory at `/`, not a lesson URL. Refresh
  returns to Home with saved progress; a resumed scene is available through the
  existing learning flow. Server deep-link fallback works, but it does not add
  new lesson-specific routes. Browser Back/Forward behavior was not redesigned.
- Narration control behavior and asset retrieval were checked; actual audible
  playback on speakers/headphones was not independently assessed. The separate
  design prototype uses browser speech and reported narration unavailable in
  the automated browser. It is not the product's bundled-audio implementation.
- HTTP tests create enough sessions to trigger the existing per-IP rate limit
  if a browser starts concurrently. The initial browser attempt returned 429;
  after cooldown the same pass continued successfully. Run these sequentially.
- macOS, Windows, ARM installation, physical-device LAN/camera/audio, simulator
  operation and signed native binaries were not available for verification.
  Native URL validation and bundle export are not substitutes for device tests.
- The large recorded demo is not distributed in Git. The clean-source fallback
  was verified. Playback controls use the browser's standard video controls
  when a direct media URL is configured; no distributable hosted media URL was
  provided, so actual self-hosted recording playback was not tested.
- No production hosting, production migration, app-store submission or Google
  Drive permission changes were performed.
