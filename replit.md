# Little Sprout

An illustrated educational companion for children aged 6–7, starting with Grade 1 → Mathematics → Addition.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
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

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

The current deliverable is a UI/UX prototype in two forms: a canvas design preview and an Expo mobile prototype. The complete requested brief is in `attached_assets/Pasted-I-want-to-build-a-children-s-educational-learning-platf_1790687073677.txt`.

The core journey is Home → five finite full-screen vertical lesson scenes → lesson celebration → unlocking homework adventure → practice → parent feedback. Parent views distinguish independent answers, hints, explanations, and multiple attempts. Learning content stays tied to the school curriculum.

## User preferences

- Await explicit design approval before full-product implementation.
- Do not build a backend, database, authentication, AI, or OCR during this prototype phase.
- Treat lesson animations as prototype video storyboards, not finished instructional videos.
- The lesson experience is full-screen vertical content, not cards or an infinite feed. It ends after five parts.
- Use the supplied reference image as inspiration without copying it. Keep the child UI warm, visual, playful, and touch-friendly; keep parent feedback calm and informative.
- Mistakes receive supportive language and visual explanations, never a blunt “Wrong.”

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
