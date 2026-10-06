# Selfstack

Track six areas of your life, see them as one **Life Score**, and get a weekly review written by Claude.

You check in once a day (mood, energy, and a 1-10 score for each area). The app turns that into a trend line, per-area pages, habit streaks and goals, and every week it writes a review and emails a digest.

![Dashboard](docs/screenshots/dashboard.png)

| | |
|---|---|
| ![Health area page](docs/screenshots/area-health.png) | ![Habits](docs/screenshots/habits.png) |
| ![Goals](docs/screenshots/goals.png) | ![Dashboard, light theme](docs/screenshots/dashboard-light.png) |

## Why this exists

Mira wasn't failing loudly. She just drifted: skipped the gym "just today", left the call unanswered "until tomorrow". One night, too tired to plan, she gave her day a number for each part of her life. It took ten seconds. A week later she saw a pattern: the days she slept well, her work went up; the days she called her sister, everything did. Her life wasn't six separate problems, it was one stack, and each layer pulled on the others. So she stopped trying to fix everything and just kept noticing.

Selfstack is that habit: one quick check-in a day, six areas of life stacked into one Life Score, and an honest weekly review.

## What it does

- **Six life areas:** Health, Mind, Relationships, Work, Money, Growth. Each has its own page with a score trend, metrics, habits and goals.
- **Life Score:** one 0-10 number, defined once in [`backend/app/services/scoring.py`](backend/app/services/scoring.py) and mirrored in [`frontend/lib/scoring.ts`](frontend/lib/scoring.ts).
- **Daily check-in** wizard: mood, energy, six area scores, a reflection. Missing days show as gaps, not zeros.
- **Habits** with streaks and one-tap logging with Undo; **goals** with milestones; **journal** with an AI summary; **metrics** you define yourself (weight, sleep, steps, ...).
- **AI analysis:** a note after each check-in, an on-demand coach, and a weekly review. Capped at 10 AI calls per user per day.
- **Weekly digest email** (opt-out in Settings) and a scheduled job that generates everyone's review on Sunday.
- **Accounts:** register, log in, forgot/reset password, email verification, theme sync, data export, account deletion.
- **Command palette** (`Ctrl+K`), keyboard shortcuts, light and dark themes, a web app manifest and icons for adding it to a home screen.

## Architecture

```
Browser ── Next.js 14 (App Router, TanStack Query, Zustand, Recharts)
              │  JWT access token (15 min) + rotating refresh token (7 days)
              ▼
          FastAPI  ── services/ (business logic) ── SQLAlchemy 2 async ── PostgreSQL
              │                                    └─ Alembic migrations
              ├─ ai/        Anthropic Claude: daily analysis, journal, weekly review
              ├─ Resend     transactional email (reset, verify, digest)
              └─ Azure Blob avatar uploads (optional)

GitHub Actions: CI (lint, tests, Playwright) · weekly cron → /analysis/weekly-reviews/generate-all
```

```
ai-pos/
├── backend/            FastAPI app: app/{api,models,schemas,services,ai,core}, alembic/, tests/
├── frontend/           Next.js app: app/, components/, lib/ (api, hooks), e2e/ (Playwright), DESIGN.md
├── docs/screenshots/   README images (regenerate with frontend/scripts/screenshots.mjs)
├── docker-compose.yml        local stack: db + backend + frontend
├── docker-compose.e2e.yml    CI stack for the browser tests (no real credentials)
└── .github/workflows/        ci.yml, cron.yml, deploy-backend.yml, deploy-frontend.yml
```

Design rules for the UI (tokens, colours, accessibility) are in [`frontend/DESIGN.md`](frontend/DESIGN.md).

## Run it locally

### With Docker (recommended)

```bash
docker compose up --build
```

Open <http://localhost:3000>, register, and do a check-in. This starts Postgres, applies the migrations, and runs the API (<http://localhost:8000/docs>) and the web app. It works on a fresh clone with no `.env` files.

AI analysis and email are off until you add keys: copy `backend/.env.example` to `backend/.env` and fill in `ANTHROPIC_API_KEY` (and `RESEND_API_KEY` for email). Compose picks the file up automatically. If port 5432 is taken, run with `DB_PORT=5433`.

### Without Docker

You need Python 3.12 (CI's version; 3.10+ works), Node 20, and a Postgres database.

```bash
# backend
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # set SECRET_KEY and DATABASE_URL at least
alembic upgrade head
uvicorn app.main:app --reload

# frontend (another terminal)
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

## Environment variables

Nothing secret is committed. Real values go in `backend/.env` (gitignored), your host's settings, or GitHub secrets.

### Backend ([`config.py`](backend/app/core/config.py))

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `SECRET_KEY` | yes | none | Signs JWTs. In production it must be random and 32+ characters (`openssl rand -hex 32`); the app refuses to start otherwise. |
| `DATABASE_URL` | yes | none | `postgresql+asyncpg://user:pass@host/db` |
| `ENVIRONMENT` | no | `development` | `production` hides `/docs` and enables the `SECRET_KEY` check. |
| `CORS_ORIGINS` | no | `["http://localhost:3000"]` | JSON list of allowed browser origins. Set to your frontend domain. |
| `FRONTEND_URL` | no | `http://localhost:3000` | Base URL used in emailed links (reset, verify). |
| `ANTHROPIC_API_KEY` | for AI | empty | Claude API key. Without it AI features fail gracefully. |
| `AI_MODEL_FAST` / `AI_MODEL_QUALITY` | no | see file | Models for short vs long tasks. |
| `AI_MAX_DAILY_CALLS_PER_USER` | no | `10` | Daily AI budget per user (shared by all AI features). |
| `AI_BATCH_DELAY_SECONDS` | no | `2.0` | Pause between users in the weekly batch. |
| `DIGEST_SECRET` | for cron | empty | Shared secret the scheduler sends as `x-digest-secret`. Empty disables the scheduler endpoints. |
| `RESEND_API_KEY` / `EMAIL_FROM` | for email | empty | Transactional email via Resend. |
| `AZURE_STORAGE_CONNECTION_STRING` / `AZURE_BLOB_CONTAINER` | for avatars | empty | Avatar uploads. |
| `RATE_LIMIT_*`, `RATE_LIMIT_ENABLED` | no | see file | Per-minute limits (general, auth, AI) and per-hour limits (reset, verify). |

### Frontend (baked in at build time)

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api/v1` | Where the browser sends API calls. |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Absolute URL for link-preview (Open Graph) tags. |

## Scripts

| Where | Command | What it does |
|---|---|---|
| backend | `ruff check .` | Lint |
| backend | `pytest` | Test suite (SQLite; Postgres-only tests are skipped unless `TEST_POSTGRES_URL` is set) |
| backend | `pytest --cov=app/api --cov=app/services --cov-fail-under=80` | What CI runs |
| backend | `alembic upgrade head` / `alembic revision --autogenerate -m "..."` | Apply / create migrations |
| frontend | `npm run dev` / `build` / `start` | Develop / production build / serve it |
| frontend | `npm run lint` / `type-check` / `test` | ESLint / `tsc` / Vitest |
| frontend | `npm run test:e2e` | Playwright journeys (needs the API, see [`docker-compose.e2e.yml`](docker-compose.e2e.yml)) |
| frontend | `node scripts/generate-icons.mjs` | Regenerate favicon, PWA icons and the social card from `public/icon.svg` |

**Postgres tests:** point `TEST_POSTGRES_URL` at a scratch database. The test drops every table in it, so never use a database you care about.

## CI and deploy

- **CI** (`ci.yml`) runs backend lint and tests (80% coverage floor), frontend lint, type-check, tests and build, and the Playwright e2e job. The `CI OK` job passes only when all three do; make it a required status check in the branch protection settings.
- **Weekly jobs** (`cron.yml`): Sunday 18:00 UTC generates reviews, 19:00 UTC sends the digest. Needs the `API_URL` and `DIGEST_SECRET` GitHub secrets, and the same `DIGEST_SECRET` on the backend.
- **Backend → Railway** (`deploy-backend.yml`, after CI passes on `main`): builds the image, pushes it to GHCR, and calls the Railway deploy hook. [`backend/railway.json`](backend/railway.json) runs `alembic upgrade head` before each release and health-checks `/health`. Set `DATABASE_URL`, `SECRET_KEY`, `ENVIRONMENT=production`, `CORS_ORIGINS`, `FRONTEND_URL`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY` and `DIGEST_SECRET` in Railway. Secret: `RAILWAY_DEPLOY_HOOK`.
- **Frontend → Vercel** (`deploy-frontend.yml`): set `NEXT_PUBLIC_API_URL` (the Railway URL plus `/api/v1`) and `NEXT_PUBLIC_SITE_URL` in the Vercel project. Secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
- The `frontend/Dockerfile` (standalone Next.js server, non-root) is for running the app anywhere Docker runs; Vercel doesn't use it.

The deploy workflows run on every green push to `main`, so merging is a production release.

## Known limitations

- Users from before the six-area redesign keep their old onboarding priority areas (they aren't remapped).
- A failed daily check-in analysis stores nothing, so there's no "failed, retry" state yet (journal analysis has one).
- Streaks and the data export use the server's date, not the user's timezone; everything else is timezone-aware.
- The cmdk command palette trips an axe `aria-valid-attr-value` warning while filtering (third-party component).
