# Little Sprout

**[Watch the narrated app demo on Google Drive](https://drive.google.com/file/d/1i21QSDuVHp4lJEj1QpC_zUCvFuciONcm/view?usp=sharing)**

Little Sprout is an illustrated learning companion for children aged 6–7.
The implemented curriculum starts with **Grade 1 → Mathematics → Addition**.
It runs with ordinary Node.js, pnpm and PostgreSQL; no Replit account, gateway,
injected domain, SDK or platform login is needed.

## Features and product boundaries

- Five finite, full-screen addition scenes with animated artwork, bundled
  English narration, captions, playback controls and supportive explanations.
- Server-validated answers, saved scene progress, completion and safe retry
  identifiers. Replaying a completed story does not erase earned completion.
- Textbook homework selection, question-by-question adventures, camera intake,
  practice and retry-friendly exams. Correct answers unlock the next stop.
- Same-child parent dashboard, feedback, reward management and earned rewards.
- Anonymous device-bound sessions persisted in browser/native app storage.
  No child account, personal details or third-party AI service is required.
- Separate optional demo and design prototype; the Expo app is the actual product.

Only the included curriculum is implemented. Future topics are unavailable.
Camera intake is supported but **automatic homework recognition is not connected**.
AI tutoring, account recovery and cross-device profiles are not implemented.
Clearing app storage or changing the website origin loses access to that device's
profile even though its database records remain. Parent screens are not protected
by a separate parent account or PIN. Do not treat them as an authorization boundary.
Device tokens are bearer credentials: use HTTPS and protect database backups.

## Stack and layout

| Directory | Purpose |
| --- | --- |
| `artifacts/little-sprout` | Expo SDK 57, React Native 0.86, React 19.2, Expo Router; native and web app |
| `artifacts/api-server` | Express 5, TypeScript, esbuild ESM server bundle, Pino |
| `lib/db` | PostgreSQL, Drizzle ORM and Drizzle Kit schema tooling |
| `lib/api-spec` | OpenAPI contract and Orval code generation |
| `lib/api-client-react`, `lib/api-zod` | Generated React Query clients and Zod validators |
| `artifacts/little-sprout-demo` | Optional Vite/React demo player |
| `artifacts/mockup-sandbox` | Optional Vite/React design prototype |

The server owns correctness, completion and attempt counts. Clients send answers,
not success flags. Retries retain the same request ID to avoid duplicate attempts.
Bundled artwork and narration stay in the application, not in the database.

## Prerequisites

- Node.js **24 LTS** (`.nvmrc` pins 24.22.1; package engines require 24.13+).
- pnpm **10.26.1** (`corepack enable` and `corepack prepare pnpm@10.26.1 --activate`,
  or install that pnpm version using your usual Node package manager).
- PostgreSQL **16+**, running locally or reachable over the network.
- For native development: an Expo Go version supporting SDK 57 or a matching
  development build. iOS simulator requires macOS/Xcode; Android emulator requires
  Android Studio. Physical phones and the computer must be mutually reachable.

## Fresh development setup

1. Clone the repository and run `pnpm install --frozen-lockfile`.
2. Create a **new development database** using your PostgreSQL administration
   tool, for example `createdb -U postgres little_sprout`. This requires a
   PostgreSQL role with database creation privileges.
3. Copy `.env.example` to `.env` at the repository root. Set `DATABASE_URL` for
   your own role, password, host and fresh database. Never commit `.env`.
4. Run `pnpm db:push`. This explicitly applies the schema to the selected
   development database. Read any Drizzle prompts carefully. It is not an
   automatic startup or production migration. Curriculum is seeded by the API
   when first used; no external seed service is required.
5. Run `pnpm dev`, then open **http://localhost:3000**.

Root launcher commands load `.env` using Node's built-in loader; existing shell
environment variables take precedence. Child package commands run directly do
not load the root `.env` automatically. The commands work without shell-specific
environment assignment syntax.

### Browser routing

In development the API listens on `PORT` (default 3000) and forwards non-API
requests to Expo Metro on port 8081. Open port 3000, **not Metro's port**, to keep
API requests and device storage on one origin. Reload the page after frontend
edits if Fast Refresh is unavailable through the HTTP proxy. Restart `pnpm dev`
after server edits. Do not expose development servers publicly.

Production uses the same Node server: `/api/*` serves JSON and other routes serve
the Expo web export, with an HTML fallback for deep links. Missing assets return
404 rather than HTML. API paths never fall through to the SPA.
The existing lesson flow keeps its navigation at `/`: refreshing returns to
Home with saved progress, rather than reopening the exact scene.

### Native devices

Set `EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_LAN_IP:3000` in root `.env`, then run
`pnpm dev:native`. Scan Expo's QR code with a compatible Expo Go app, or use a
development build. Allow ports 3000 and 8081 through your local firewall.
`localhost` on a phone means the phone, not the computer. Android emulator
normally reaches its host through `10.0.2.2`; iOS simulator can use localhost.

The value must be an **origin**, with no `/api` suffix, path, query, fragment or
credentials. HTTP is allowed only in development; production native bundles
require HTTPS. Invalid/missing native configuration displays a connection error
instead of sending device credentials to a guessed host. Web ignores this value
and always uses same-origin `/api`.

Expo public values are embedded at bundle time, are readable by users, and must
never contain secrets. Restart Metro after changing them.

## Environment variables

| Variable | Where / default | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | API + schema commands, required | PostgreSQL connection URL; secret |
| `PORT` | API runtime, `3000` | Public Node HTTP port |
| `EXPO_PUBLIC_API_URL` | Native bundle | Reachable API origin; HTTPS in release |
| `TEST_API_URL` | HTTP tests, `http://127.0.0.1:3000/api` | Explicit test server URL including `/api` |
| `NODE_ENV` | Launcher sets development/production | Runtime mode |
| `SERVE_WEB` | `pnpm start` sets `true` | Serve built web app and optional previews |
| `EXPO_DEV_ORIGIN` | `pnpm dev` sets localhost:8081 | Internal development-only HTTP proxy target |
| `LOG_LEVEL` | API logger | Optional logging level |
| `VITE_DEMO_VIDEO_URL` | Optional demo build | Direct playable media URL; otherwise Drive link |

No session secret, cloud connector or AI key is needed. Native API access uses
Authorization bearer headers; it does not depend on cross-site cookies.

## Commands

```text
pnpm dev                         # API + Expo, browser on localhost:3000
pnpm dev:native                  # API + Expo LAN QR
pnpm db:push                     # explicit development schema initialization/update
pnpm typecheck                  # shared libraries and all applications
pnpm build                      # typecheck, API bundle, web export and optional previews
pnpm start                      # serve production builds, default port 3000
pnpm test                       # HTTP integration + frontend logic tests
pnpm --filter @workspace/api-spec codegen
pnpm --filter @workspace/little-sprout build:native
pnpm --filter @workspace/little-sprout-demo dev
pnpm --filter @workspace/mockup-sandbox dev
```

HTTP tests require a running API connected to a **disposable database**. They
create child sessions and learning records; never point them at production.
They cover persistence, session isolation, answer retries, homework/exam
adventures and reward selection. Native export creates JS/assets only, not
signed IPA/APK files. Native binary builds/signing are a separate Expo/native
toolchain workflow and are not provided as an app-store submission setup.

## Production build and hosting

1. Install with `pnpm install --frozen-lockfile` (include development dependencies
   during build).
2. Run `pnpm build`. Web does not need a public API hostname because it uses `/api`.
3. Provision PostgreSQL and apply **reviewed schema changes explicitly** using
   your migration process. This project currently provides a Drizzle schema,
   not a reviewed versioned production migration history. For a brand-new empty
   database, an administrator can explicitly use Drizzle push after review.
   Back up existing databases before changes. Startup never changes the schema.
4. Set `DATABASE_URL`, `NODE_ENV=production` and optionally `PORT` on the host.
5. Run `pnpm start` from the repository root.

Use a host supporting a persistent Node 24 HTTP process, PostgreSQL network
access, and HTTPS termination (for example a VM or compatible Node hosting
service). Keep the monorepo layout, installed runtime dependencies, the complete
API `dist` directory (including logging workers), the web `dist`, and any optional
preview builds. A static-only host cannot run this API. Bind at the domain root,
not under a subdirectory. Configure your reverse proxy to forward all routes to
Node, including `/api`, deep links and assets. Set sensible request/time limits,
backups and access controls for your own infrastructure. No hosting is provisioned.

Optional builds are served at `/little-sprout-demo/` and `/__mockup/`. The design
prototype is not connected to saved learning state. The demo defaults to the
exact Google Drive link above; the large historical recording is not in Git.
See [demo setup](artifacts/little-sprout-demo/README.md) for self-hosted playback.
Drive availability and access permissions are controlled externally.

## Media and verification limitations

Lesson narration and required artwork are bundled and work without an AI service.
Browser autoplay rules may require a tap before audio; captions remain available.
Camera access requires permission and normally HTTPS (localhost is an exception).
Browser camera and native camera behavior differ. A desktop build/test does not
prove physical-device microphone/speaker, camera, LAN, or store-build behavior.
See [verification notes](docs/verification.md) for checks run during portability
work and checks that still require other operating systems or physical devices.
