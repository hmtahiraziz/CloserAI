# CloserAI

AI Sales Call Closer powered **exclusively by Retell AI**. CloserAI lets sales managers add leads, launch outbound AI calls, monitor outcomes, review transcripts and recordings, inspect qualification and objections, and manage booked appointments.

> **Compliance:** Production outbound sales calling must be configured according to the laws and consent requirements of the jurisdictions in which it is used. This portfolio project is for demonstration purposes.

## Key features

- Retell-powered outbound voice sales conversations
- **Browser web call** to test the agent with mic/speakers (no phone number)
- Lead & campaign management with CSV import/export
- Secure Retell custom functions (availability, booking, DNC, handoff)
- Signed webhook ingestion with idempotent processing
- Post-call analysis: BANT, objections, competitors, scores
- Analytics dashboard with documented formulas
- Demo mode with simulated webhooks (no paid call required)

## Architecture

```
Sales manager → Next.js dashboard → NestJS API → PostgreSQL
NestJS API → Retell outbound call API
Retell voice agent → prospect phone
Retell agent → CloserAI custom function endpoints
Retell webhooks → CloserAI webhook processor → PostgreSQL → dashboard
```

Retell owns telephony, ASR/TTS, conversation reasoning, knowledge retrieval, tool selection, transfer, transcription, recording, sentiment, and post-call analysis. CloserAI owns auth, CRM data, outbound initiation, function endpoints, webhook persistence, appointments, analytics, and the dashboard.

## Stack

- **Frontend:** Next.js (App Router), Tailwind, TanStack Query, React Hook Form, Zod, Recharts
- **Backend:** NestJS, Prisma, PostgreSQL, Swagger
- **Voice AI:** Retell AI only (no OpenAI/Anthropic/Gemini)
- **Monorepo:** pnpm workspaces

## Local setup

```bash
# 1. Install
pnpm install

# 2. Env
cp .env.example .env
cp .env packages/database/.env
cp .env apps/api/.env
cp .env.example apps/web/.env.local

# Put Retell secrets in apps/api/.env (Nest loads that when you run pnpm dev:api).
# Root .env is also loaded as a fallback.

# 3. Database (Docker Compose OR local Postgres)
docker compose up -d
# If Docker is unavailable, create DB on local Postgres:
#   createuser -s closerai && createdb -O closerai closerai
#   (user/password closerai/closerai matching DATABASE_URL)

pnpm db:generate
pnpm db:migrate
# or: pnpm --filter @closerai/database exec prisma migrate deploy
pnpm db:seed

# 4. Build shared packages & run
pnpm --filter @closerai/shared build
pnpm --filter @closerai/database build
pnpm dev
```

- Web: http://localhost:3000  
- API: http://localhost:4000/api  
- Swagger: http://localhost:4000/api/docs  

## Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@closerai.demo` | `DemoPass123!` |
| Sales rep | `rep@closerai.demo` | `DemoPass123!` |

With `DEMO_MODE=true`, open **Demo Lab** to simulate `call_started`, `call_ended`, and `call_analyzed` without placing a paid Retell call. Simulated calls are labeled in the UI. Starting **Start AI Call** always attempts a real Retell call when credentials are configured.

## Environment variables

See [`.env.example`](.env.example). Never commit real secrets.

## Tests

```bash
pnpm --filter @closerai/shared test
pnpm --filter @closerai/api test
# E2E (stack must be running):
E2E_READY=1 pnpm --filter @closerai/web test:e2e
```

## Retell configuration

See:

- [docs/retell-setup.md](docs/retell-setup.md)
- [docs/agent-prompt.md](docs/agent-prompt.md)
- [docs/function-contracts.md](docs/function-contracts.md)
- [docs/webhook-events.md](docs/webhook-events.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/demo-script.md](docs/demo-script.md)
- Knowledge base markdown in [docs/retell-knowledge-base](docs/retell-knowledge-base)

## Known limitations

- Availability uses an internal weekly schedule (Google Calendar interface-ready)
- Meeting URLs are fictional local placeholders
- Recording URLs from Retell are stored as provided (protect via Retell access controls)
- No BullMQ/Redis in MVP — DB-backed webhook job processing
- `Retell.verify` may be missing in some SDK versions; HMAC fallback is implemented

## License

Portfolio / demonstration project.
