# Little Sprout

Little Sprout is a child-friendly learning app for Grade 1 mathematics. The
current learning path focuses on addition: a narrated five-scene story about
putting two groups of apples together, followed by homework, practice, and exam
adventures. Progress and answer checking are backed by an Express API and
PostgreSQL.

## Contents

- [Project status](#project-status)
- [What the app does](#what-the-app-does)
- [Project structure](#project-structure)
- [How the system works](#how-the-system-works)
- [Requirements](#requirements)
- [Local development](#local-development)
- [Install and run locally](#install-and-run-locally)
- [Database setup](#database-setup)
- [Commands](#commands)
- [API overview](#api-overview)
- [Progress, privacy, and recovery](#progress-privacy-and-recovery)
- [Tests](#tests)
- [Narration audio](#narration-audio)
- [Current limitations](#current-limitations)

## Project status

The repository contains the Expo application, API, database schema, generated
API client, a separate product-demo artifact, and a mockup sandbox. The main
app and API are designed to run as separate services.

The implemented learning content is intentionally narrow: Grade 1 Math,
starting with Addition. Subtraction and other future curriculum topics are
shown as unavailable rather than presented as finished lessons. Photo-based
homework recognition is not connected to an OCR or vision provider.

## What the app does

### Child learning experience

- Home screen with the current learning path and shortcuts to homework,
  practice, and the family view.
- A Grade 1 Mathematics path with a five-scene addition lesson:
  1. A narrated apple story introduces the addition problem.
  2. A second narrated scene combines the two groups.
  3. The learner moves apples into the group.
  4. The learner answers a multiple-choice counting question.
  5. The learner answers a final addition question.
- English narration, synchronized captions, playback controls, bundled
  illustrations, and saved lesson position.
- Supportive feedback, hints, and visual counting help.
- A **See your story** review mode. Review starts with fresh interactions and
  does not create new saved lesson attempts or change completion progress.
- Homework based on the printed-page catalog for the Grade 1 Math Example
  Book. Exercises are currently available for addition pages 4 and 5,
  subtraction page 7, and shapes page 8. Pages without exercises remain listed
  but cannot start a homework run.
- Practice and exam modes with choice, counting, direct-answer, ordering,
  drag/order, and matching questions.
- A retry-friendly exam adventure: an incorrect answer is saved as an attempt,
  but the learner must answer correctly to unlock the next stop.

### Family view

The grown-up area has Dashboard, Child progress, and Insights views. It
summarizes saved lesson and activity progress, attempts, correct answers,
streaks, and concepts that may need more practice. Insights are based on saved
answers, not predictions.

The family view also supports configuring reward options. Eligible completed
homework or exam runs can save a snapshot of an enabled reward, so later edits
to the reward list do not rewrite an already completed run.

### Separate project artifacts

- **Little Sprout — Short Demo** (`artifacts/little-sprout-demo`) is a separate
  video-style product demonstration. It is not the mobile app and does not
  replace the live API-backed experience.
- **Mockup Sandbox** (`artifacts/mockup-sandbox`) is a separate Vite-based
  workspace for design prototypes.

## Project structure

```text
artifacts/
  api-server/          Express API service and HTTP tests
  little-sprout/       Expo / React Native app, assets, and app logic tests
  little-sprout-demo/  Separate product-demo artifact
  mockup-sandbox/      Vite design-prototype sandbox
lib/
  api-spec/            OpenAPI source and API-client code generation
  api-zod/             Generated API schemas and types
  api-client-react/    Generated React Query API client
  db/                  Drizzle PostgreSQL schema and database connection
scripts/               Shared workspace scripts
```

The root is a pnpm workspace. Keep app-specific code in its existing package;
shared database, API contract, and generated client code live under `lib/`.

## How the system works

```text
Expo app ── generated React Query client ── Express API ── PostgreSQL
```

- **Mobile app:** Expo SDK, React Native, Expo Router, TypeScript, and TanStack
  Query. The same app can be previewed on the web.
- **API:** Express 5 with Zod request/response validation and Pino logging.
  Routes are mounted under `/api`.
- **Database:** PostgreSQL with Drizzle ORM. The schema covers curriculum,
  device-created child profiles and sessions, lesson progress and attempts,
  activity runs and answers, and reward settings.
- **API contract:** `lib/api-spec/openapi.yaml` is the OpenAPI source.
  Orval generates the React API client and shared schemas.
- **Initial content:** the API seeds the addition curriculum and sample
  activities on first use. The textbook pages are kept in a code catalog.

Both the app and API are needed for the complete learning experience. The app
uses `EXPO_PUBLIC_API_URL` as the API origin when one is provided. Web previews
can use a same-origin `/api` route; native devices need an API address they can
reach over the network.

## Requirements

- Node.js 20 or later and pnpm 9 or later.
- A PostgreSQL database.
- A `DATABASE_URL` environment variable available to the API and database
  package.

Do not commit database credentials. Set `DATABASE_URL` in the environment
where the API runs. The API cannot start without it. A PostgreSQL database
must be provisioned before the full app can run.

## Local development

Install dependencies from the repository root:

```sh
pnpm install
```

Set `DATABASE_URL` to a development PostgreSQL database, apply the schema as
described below, then start the API in one terminal:

```sh
DATABASE_URL="$DATABASE_URL" PORT=8080 pnpm --filter @workspace/api-server run dev
```

The API health check is available at `http://localhost:8080/api/healthz`.
Start the Expo app in a second terminal:

```sh
EXPO_PUBLIC_API_URL=http://localhost:8080 PORT=8081 pnpm --filter @workspace/little-sprout run dev
```

For a physical phone, replace `localhost` in `EXPO_PUBLIC_API_URL` with an API
address reachable from that phone. Use HTTPS for a deployed API. When the
variable is omitted, web uses the current origin and native platforms display
a connection-configuration error.

To run the demo video or prototype sandbox, start either package separately:

```sh
PORT=5173 pnpm --filter @workspace/little-sprout-demo run dev
PORT=5174 pnpm --filter @workspace/mockup-sandbox run dev
```

The web app can be built and served as a static export. Set the public API
origin at build time so it is embedded in the web bundle:

```sh
EXPO_PUBLIC_API_URL=https://<api-host> pnpm --filter @workspace/little-sprout run build
pnpm --filter @workspace/little-sprout run serve
```

Store publishing and native app binaries are not configured in this
repository.

## Database setup

After provisioning a development PostgreSQL database and setting
`DATABASE_URL`, push the Drizzle schema with:

```sh
pnpm --filter @workspace/db run push
```

This command applies schema changes to the database named by `DATABASE_URL`.
Confirm that it points to the intended **development** database before
running it. Avoid `push-force` unless you have reviewed its impact and intend
to force a schema change.

The API seeds the lesson and activity catalog when requests first need it.
Schema creation and content seeding are separate: the schema must exist before
the API can persist data.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm install` | Install workspace dependencies. Run at the repository root. |
| `pnpm run typecheck` | Type-check libraries, artifacts, and scripts. |
| `pnpm run build` | Type-check and run available workspace builds. |
| `pnpm --filter @workspace/api-server run dev` | Build and start the API in development mode. |
| `pnpm --filter @workspace/api-server run build` | Build the API bundle. |
| `pnpm --filter @workspace/api-server run start` | Start the built API; requires `PORT` and `DATABASE_URL`. |
| `pnpm --filter @workspace/api-server test` | Run API HTTP integration tests against the configured API and database. |
| `pnpm --filter @workspace/little-sprout run dev` | Start the Expo development server. Set `EXPO_PUBLIC_API_URL` for native or cross-origin access. |
| `pnpm --filter @workspace/little-sprout run typecheck` | Type-check the Expo app. |
| `pnpm --filter @workspace/little-sprout run build` | Build the app's web output. |
| `pnpm --filter @workspace/little-sprout run serve` | Serve the built app. |
| `pnpm --filter @workspace/db run push` | Push the Drizzle schema to the selected database. |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerate API client and schema output from OpenAPI. |

The Expo app has focused logic test files under
`artifacts/little-sprout/tests/`, but currently does not define a package-level
`test` script. API HTTP tests are in `artifacts/api-server/tests/`.

## API overview

All API routes use the `/api` prefix. The health check and session-creation
route are public. Other routes below require the device session's bearer token
in the `Authorization` header.

| Route | Purpose |
| --- | --- |
| `GET /api/healthz` | API health check; does not require a session. |
| `POST /api/learning/session` | Create a device-bound child session. |
| `GET /api/learning/state` | Read the lesson, saved scene progress, and summary. |
| `PATCH /api/learning/scenes/:sceneId/progress` | Save monotonic scene position and drag progress. |
| `POST /api/learning/scenes/:sceneId/attempts` | Submit a lesson answer for server-side validation. |
| `POST /api/learning/scenes/:sceneId/advance` | Complete a scene and advance the lesson when requirements are met. |
| `POST /api/learning/scenes/:sceneId/explanation` | Record that the learner used an explanation. |
| `GET /api/activities` | Read the activity catalog and this child's run summary. |
| `POST /api/activities/:activityId/runs` | Start or resume an activity run. |
| `GET /api/activities/runs/:runId` | Read an owned activity run. |
| `POST /api/activities/runs/:runId/attempts` | Submit the current activity answer. |
| `GET /api/textbooks` | List the available textbook catalog. |
| `GET /api/textbooks/:bookId/pages` | List printed pages and exercise availability. |
| `POST /api/textbooks/:bookId/pages/:pageNumber/runs` | Start or resume homework from an exercise page. |
| `GET /api/homework/photo/status` | Report photo-recognition availability. |
| `POST /api/homework/photo/recognize` | Recognition is currently unavailable and returns HTTP 503. |
| `GET /api/dashboard` | Read same-child family dashboard metrics and insights. |
| `GET /api/reward-config`, `PUT /api/reward-config` | Read or save the reward configuration. |
| `GET /api/reward-options`, `POST /api/reward-options` | List or create reward options. |
| `PATCH /api/reward-options/:rewardId`, `DELETE /api/reward-options/:rewardId` | Update or delete a reward option. |

The full request and response contract is in `lib/api-spec/openapi.yaml`.

## Progress, privacy, and recovery

- There is no sign-in or account system. The API creates an anonymous child
  profile for the device; the initial display name is currently `Sam`.
- The app stores the bearer token in device-local AsyncStorage. The database
  stores a hash of that token, not the original bearer token.
- Saved learning progress and attempts live in PostgreSQL and are scoped to
  the device session. Clearing the app's local storage removes the token
  needed to reconnect to that profile. There is no cross-device recovery.
- The family view uses the same device session as the child experience; this
  project does not implement a separate parent login or account boundary.
- The server validates answers and controls lesson/activity advancement. The
  client does not decide whether an answer is correct.
- Submission request IDs make retries idempotent. If a request's result is
  uncertain because the network failed, the app preserves the original answer
  and request ID rather than silently creating a different attempt.
- Lesson review is a separate, temporary replay. It does not add durable
  attempts, completion, or learning progress.
- The camera permission text describes photographing homework, but no
  recognition provider or parent question-review pipeline is connected yet.
  The API explicitly reports that recognition is unavailable.

## Tests

The API test command sends HTTP requests to the running API and checks
persistence, session isolation, answer recovery, activity adventures, and
reward behavior. It requires a running API and a development database.

Additional app logic tests cover activity-answer normalization and recovery,
story-review isolation, and story audio behavior. Those test files are present
but are not currently connected to an Expo package test command.

For a workspace-level check:

```sh
pnpm run typecheck
pnpm run build
```

## Narration audio

The addition story and grouping scene use bundled English WAV narration and
caption timing in `artifacts/little-sprout/assets/audio/`. The accompanying
`README.md` in that directory documents the Kokoro model and voice attribution,
audio format, timing data, and the offline regeneration process. Narration
generation dependencies and model weights are intentionally not app
dependencies.

## Current limitations

- Addition is the only implemented lesson. Subtraction and other future
  curriculum topics are marked unavailable in the app.
- Homework exercises come from the pages currently transcribed into the
  textbook catalog; this is not a general PDF reader or homework authoring
  system.
- Photo capture/recognition does not extract questions yet. An OCR/vision
  provider and parent review process must be connected before that feature can
  create activities.
- Profiles are anonymous and device-bound. There is no login, parent account,
  cross-device sync, or lost-device recovery.

## Product requirements

- Preserve the existing mobile experience and five-scene Addition lesson.
- Keep lesson content full-screen and finite; do not turn it into an infinite
  feed or a card-based lesson.
- Keep the child-facing experience warm, visual, playful, and easy to use by
  touch. Keep family feedback calm and informative.
- Use supportive feedback and visual explanations for mistakes; do not show
  blunt “Wrong” messages.
- Keep exams retry-friendly. Only correct answers unlock the next stop, and a
  completed adventure may grant a parent-configured reward.
- Keep future curriculum topics clearly marked as unavailable until they are
  implemented.
- For homework, use the printed textbook exercise pages or the camera intake
  flow. Camera and recognition states must report honestly; automated
  recognition is not connected yet. AI tutoring is out of scope.
- Keep the child profile anonymous and device-bound for this phase. Do not add
  sign-in or collect child personal details. Clearing local app storage loses
  access to that device profile; cross-device recovery requires future account
  work.
- The mobile Addition lesson uses animated scenes synchronized with bundled
  English narration and captions. Preserve its playback controls and saved
  progress.
