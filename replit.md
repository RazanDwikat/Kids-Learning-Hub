# Little Sprout

An illustrated educational companion for children aged 6–7, starting with Grade 1 → Mathematics → Addition.

## Run & Operate

- Start the managed `artifacts/api-server: API Server` and `artifacts/little-sprout: expo` workflows; ports are supplied by the environment.
- `pnpm --filter @workspace/api-server test` — HTTP persistence and isolation checks against the running API and development database
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/little-sprout` — approved mobile frontend and anonymous device-session handling
- `artifacts/api-server/src/routes/learning.ts` — learning API and server-side answer validation
- `lib/db/src/schema/learning.ts` — curriculum, child sessions, enrollment, scene progress, and attempts
- `lib/api-spec/openapi.yaml` — API contract; regenerate clients after changes

## Architecture decisions

- The server owns correctness, completion, and attempt counts. The client sends answers, never success flags.
- Answer retries reuse their request identifier so interrupted requests cannot count twice.
- Only scene content and learning records are persisted; bundled lesson artwork remains in the existing frontend.

## Product

The project has a canvas design preview and an Expo mobile application. The mobile application's approved UI is the source of truth for the full-stack Grade 1 → Mathematics → Addition implementation. The canvas remains a separate design prototype.

The core journey is Home → five finite full-screen vertical lesson scenes → lesson celebration → unlocking homework adventure → practice → parent feedback. Parent views distinguish independent answers, hints, explanations, and multiple attempts. Learning content stays tied to the school curriculum.

## User preferences

- Full-stack implementation includes the child Home and Profile, Grade 1 Mathematics, Homework, Practice/Exam, and same-child Parent Dashboard. Preserve the approved mobile UI and UX and the existing five-scene Addition experience.
- OCR, AI tutoring, and new AI features remain out of scope. Future curriculum topics should be clearly unavailable, not pretend to be live.
- Use an anonymous device-bound child profile for this phase; do not add sign-in or collect child personal details. Database progress survives refresh with the device credential, but clearing app storage loses access and cross-device recovery requires future account work.
- The mobile Addition lesson uses animated scenes synchronized with bundled English narration and captions. Preserve its playback controls and saved progress; the canvas is a separate reference prototype.
- The lesson experience is full-screen vertical content, not cards or an infinite feed. It ends after five parts.
- Use the supplied reference image as inspiration without copying it. Keep the child UI warm, visual, playful, and touch-friendly; keep parent feedback calm and informative.
- Mistakes receive supportive language and visual explanations, never a blunt “Wrong.”

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
