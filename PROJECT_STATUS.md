# AI-POS — Project Status, Remaining Work & Interface Guide

> Audited 2026-10-06 by reading the source (≈40k lines incl. config; ≈3.6k backend Python, ≈7.5k frontend TS/TSX).
> **What I could NOT do:** run the app, run pytest (the venv's base Python 3.10 is gone), or run vitest (devDependencies not installed). Everything below about *looks* is derived from the code and design tokens, not from screenshots. Everything about *completeness* is from reading the code; items marked **(suspected)** are unverified.
> `README.md` is untouched (it's stale — see §6).

---

## 1. Executive summary

| Area | Done | Notes |
|---|---|---|
| Backend API | ~95% | 13 tables, 12 routers, 54 endpoints, all wired. Gaps: rate-limiter not actually active, one suspected concurrency bug |
| AI layer (Claude) | ~90% | Daily analysis, weekly review, on-demand all implemented with prompt caching. **Zero automated tests, never verified in this audit** |
| Frontend features | ~85% | 15 dashboard pages + auth + onboarding. 5 pages are thin wrappers; Mental area has no page |
| Visual polish | ~70% | Real theming system, but 2 Tailwind-config bugs make success states and the Inter font silently not apply |
| Testing | ~25% | 29 backend tests (core CRUD only), 13 frontend tests; nothing on AI, journals, metrics, sessions, export, uploads |
| Build health | **Broken** | `npm run type-check` fails on 3 real errors → CI frontend job fails → deploy workflows never fire |
| Infra / deploy | ~60% | Dockerfile + compose (backend+db only), CI, deploy workflows written but never exercised; no frontend Dockerfile |
| **Overall (my estimate)** | **≈ 75–80%** | Feature-complete in shape; remaining work is mostly correctness, verification, polish and deployment |

---

## 2. What is done — granular

### 2.1 Backend (`backend/`) — FastAPI, SQLAlchemy 2.0 async, PostgreSQL

**Auth & security** — complete
- [x] Register / login / refresh / logout / `GET+PATCH /auth/me` / change-password / `PATCH /auth/me/onboarding`
- [x] JWT dual-token (15 min access, 7 day refresh), refresh rotation + reuse detection (`user_sessions` table)
- [x] bcrypt hashing (12 rounds), request-ID middleware, security-headers middleware, CORS from env
- [x] Swagger docs auto-disabled when `ENVIRONMENT=production`
- [ ] **Rate limiting is configured but not enforced** — see §3 P1

**Domain endpoints** — complete
| Router | Endpoints |
|---|---|
| `checkins` | today (get-or-create), create, patch, complete, 7/30-day trend |
| `habits` | list, today-with-status, create, patch, delete, log, per-habit logs, streak |
| `goals` | list, create, patch, delete, complete, add milestone, complete milestone |
| `sessions` (work/learning) | list, create, patch, delete, stats (totals, avg quality, by-area, by-week) |
| `journals` | list (filterable), create, get, patch, delete |
| `metrics` | list (filterable), create, get, patch, delete |
| `analysis` | trigger check-in analysis (202), on-demand, list/patch recommendations, generate/list weekly reviews |
| `dashboard` | one aggregate call: today's check-in, habit summary, 8 area scores + trend direction |
| `uploads` | avatar → Azure Blob (5 MB cap, content-type allow-list) |
| `export` | `checkins.csv`, `habits.csv` (streamed, 30/90/365 days) |
| `notifications` | weekly-digest fan-out (secured by `x-digest-secret`) |

**AI** — implemented
- [x] Three prompt modules (daily, weekly, on-demand) + `prompt_builder` (214 lines of context assembly) + `response_parser`
- [x] Fast model (Haiku) for daily/on-demand, quality model (Sonnet) for weekly; Anthropic prompt caching (`cache_control: ephemeral`)
- [x] Per-user daily call cap (`AI_MAX_DAILY_CALLS_PER_USER=10`) enforced in analysis endpoints
- [x] Weekly review state machine: `pending → in_progress → completed | failed`
- [x] Failures are caught and logged rather than crashing the request

**Data** — complete
- [x] 13 tables: users, user_sessions, life_areas, daily_checkins, habits, habit_logs, goals, milestones, sessions, metrics, journal_entries, ai_recommendations, weekly_reviews
- [x] 2 Alembic migrations (initial schema + seed of the 8 life areas)
- [x] `sqlalchemy.JSON` (not JSONB) so SQLite tests work

**Email** — Resend: welcome email (on register, background task) + weekly digest. **Digest has no scheduler** (needs an external cron hitting the endpoint — not set up).

### 2.2 Frontend (`frontend/`) — Next.js 14 App Router, TS, Tailwind 3, Zustand, TanStack Query 5

**Platform**
- [x] Axios client with request auth header + 401 interceptor that queues requests, refreshes once, retries
- [x] `middleware.ts` route guard: unauthenticated → `/login?redirect=…`; pending onboarding → `/onboarding`; completed users bounced off `/onboarding`
- [x] Zustand stores (auth persisted + cookie for middleware; UI sidebar state), 9 React Query hook modules, 12 typed API modules
- [x] Theme: `next-themes`, class-based, **default dark**, follows system if user hasn't chosen

**Pages**
| Route | State | What it contains |
|---|---|---|
| `/login`, `/register` | ✅ | zod + react-hook-form, inline errors, error banner |
| `/onboarding` | ✅ | 6 screens: Welcome → Profile → Life Areas → First Goal → First Habit → Done |
| `/dashboard` | ✅ | Life Score ring, 8-area grid with trend arrows, check-in CTA card, today's habits with one-tap log |
| `/checkin` | ✅ | 4-step animated wizard (areas → mood/energy → reflections → review/AI); resumable; "already complete" state |
| `/habits` | ✅ | Cards with streak/best/total, 12-week heatmap, create/edit/delete modal |
| `/goals` | ✅ | Progress-ring cards, milestones (checkable), priority badges, create/edit/complete/delete |
| `/analysis` | ✅ | Recommendation feed (`InsightCard`), on-demand ask panel, weekly review summary |
| `/reviews` | ✅ | List + detail view of weekly reviews, generate button |
| `/journal` | ✅ | List + editor, mood tags, life-area tags, AI summary/themes/sentiment display |
| `/metrics` | ✅ | Per-area metric picker (31 predefined keys), entry form, Recharts line charts |
| `/learning` | ✅ | Work-session log modal, session cards, weekly-minutes bar chart, stats |
| `/settings` | ✅ | Profile + avatar upload, CSV export (30/90/365), change password |
| `/health`, `/finances`, `/social`, `/career` | ⚠️ thin | 5-line wrappers around `LifeAreaPage` = **that area's habits + goals only**. No area-specific metrics, charts or AI |
| `/productivity` | ⚠️ thin | Same wrapper for Discipline + Focus combined |
| `/` | ✅ | redirects to `/dashboard` |

**Responsive** — sidebar becomes a slide-over overlay <768px with backdrop; hamburger in top bar; grids collapse (`grid-cols-2 sm:grid-cols-4`, `col-span-12 md:col-span-*`); heatmap scrolls horizontally.

### 2.3 Infra & tests
- [x] `backend/Dockerfile` — multi-stage, non-root user, gunicorn + uvicorn workers
- [x] `docker-compose.yml` — backend + Postgres 16 with healthcheck, hot-reload mount
- [x] `.github/workflows/ci.yml` (backend ruff+pytest; frontend lint+type-check+build), `deploy-backend.yml` (GHCR → Railway hook), `deploy-frontend.yml` (Vercel)
- [x] Backend tests: auth 11, habits 7, goals 6, check-ins 5 = **29**, SQLite in-memory fixtures
- [x] Frontend tests: 13 across 4 files (CheckinCTACard, LifeScoreRing, StepIndicator, authStore)

---

## 3. What is left — granular, prioritized

### P0 — Blocking (fix first, all small)
1. **Type-check fails → CI frontend job fails → no deploy.** [InsightCard.tsx:59](frontend/components/analysis/InsightCard.tsx#L59), `:65`, and [OnDemandPanel.tsx:124](frontend/components/analysis/OnDemandPanel.tsx#L124): `raw.something && (<jsx/>)` where `raw` is `Record<string, unknown>` → `unknown` isn't a valid `ReactNode`. Fix: `typeof raw.x === "string" && …`. (The other tsc errors are just missing devDependencies.)
2. **Tailwind config is missing `success`, `warning`, and `border-strong`** ([tailwind.config.ts](frontend/tailwind.config.ts)). I generated the CSS to confirm: `text-success`, `bg-success`, `bg-success/10`, `border-border-strong` emit **nothing**. Visible effect: the "Done today" habit state loses its green, check-in wizard completed-step dots/lines are unstyled, trend-up arrows aren't green, "check-in complete" text on the dashboard card is uncoloured. The tokens exist in `tokens.css`; they're just not mapped.
3. **Dev environment is broken.** `backend/venv` points at a deleted Python 3.10 → pytest can't run. `frontend/node_modules` lacks vitest / testing-library / jsdom. Recreate the venv (CI uses 3.12), `npm install`. **Until then none of the test counts above are verified as passing.**

### P1 — Correctness / security
4. **Rate limiter does nothing.** [main.py](backend/app/main.py) builds a `Limiter` and handler, but never adds `SlowAPIMiddleware` and no route has `@limiter.limit`. Add the middleware and tighter limits on `/auth/login`, `/auth/register`, and AI endpoints.
5. **(suspected)** [dashboard.py:20](backend/app/api/v1/endpoints/dashboard.py#L20) runs three queries with `asyncio.gather` on a **single `AsyncSession`**. SQLAlchemy doesn't support concurrent operations on one session and typically raises "another operation is in progress". The dashboard is the landing page, so verify immediately; fix by awaiting sequentially.
6. **No `/forgot-password` or reset flow** — middleware whitelists the path but there's no page or backend endpoints. Needs: token model/endpoint, Resend email, two pages.
7. **Email verification** absent (register → straight in).
8. **AI cap is per-endpoint** — confirm it covers weekly-review generation too (it calls the more expensive model).
9. **Weekly digest has no scheduler** — wire a Railway/GitHub cron to `POST /notifications/weekly-digest`.

### P2 — Product gaps
10. **Mental life area has no page or nav entry** (Discipline+Focus → Productivity; Learning, Career, Health, Social, Financial each have one; Mental, id 6, is orphaned except in check-ins/metrics/journal).
11. **Area pages are generic.** Each could show: that area's metric charts (data already exists via `/metrics`), score trend line from check-ins, recent AI insights tagged to the area.
12. **No check-in history / score-trend chart anywhere** — `/checkins/trend` endpoint exists but no page consumes it. A Life-Score-over-time chart on the dashboard is the obvious missing hero feature.
13. **No weekly-review auto-generation** (user must click). Same cron as #9.
14. Journal: AI summary/themes fields exist; verify the journal → AI-insight trigger is actually wired (not confirmed in this audit).
15. Settings has no theme preference, notification toggle, timezone edit, or account deletion / data wipe.
16. No empty-state illustrations, toasts (errors surface as inline text only), or delete-confirmation dialogs (habit/goal delete fires immediately).
17. No PWA manifest / favicon / OG tags (no `frontend/public/` exists).

### P3 — Accessibility & visual polish (details in §4.5)
18. **Inter font isn't applied.** `layout.tsx` loads Inter into `--font-inter`, but `tailwind.config.ts` has no `fontFamily.sans` mapping, so `font-sans` resolves to Tailwind's default system stack. One-line fix.
19. **Light-mode contrast failures** (WCAG AA 4.5:1): muted text 2.56:1, Learning/Career/Mental/Financial colours used as text 1.9–2.2:1, white-on-accent button 4.23:1 (light) / **3.47:1 (dark)**. Hard-coded area colours aren't theme-adjusted.
20. Inconsistent styling approach: some files use semantic classes (`bg-surface`), others verbose `bg-[hsl(var(--bg-surface))]`; `--success`/`--warning` have no dark variants.
21. Mood/energy emoji are the only non-token colours (hard-coded `hsl(330 81% 60%)`, `hsl(38 92% 50%)`).

### P4 — Testing
22. Backend: add tests for sessions, journals, metrics, uploads (mock blob), export CSV, notifications secret, refresh-token reuse detection, and AI services with a mocked Anthropic client.
23. CI backend job uses a Postgres URL but conftest uses SQLite, and "exit 5 = pass" masks missing tests — remove that escape hatch.
24. Frontend: tests only cover 4 components; add the check-in wizard flow, auth middleware, API client refresh queue.
25. No end-to-end test (Playwright) of register → onboarding → check-in → dashboard.

### P5 — Deployment
26. No `frontend/Dockerfile`; compose has no frontend service.
27. `README.md` is stale: references `frontend/src/`, `.env.local.example` (doesn't exist), "10+ tables" (14), omits CSV export/email/onboarding.
28. First real deploy: Railway (backend + Postgres, run `alembic upgrade head`), Vercel (frontend, `NEXT_PUBLIC_API_URL`), set secrets listed in the deploy workflows, set `CORS_ORIGINS` to the Vercel domain, set `ENVIRONMENT=production`.
29. Rotate/verify secrets: `backend/.env` exists locally (gitignored — good); make sure real keys never reached a commit.

**Suggested order:** P0 (≈1 hour) → verify dashboard (#5) → rate limiter (#4) → deploy to staging → P2 #10/#12 → forgot-password → tests → polish.

---

## 4. How the interface works and looks

### 4.1 App shell
```
┌──────────┬────────────────────────────────────────────────────┐
│ ☰ AI-POS │  Tuesday, Oct 6   Life Score: 7.4 ▲      ☾  (M) Mahi│  ← TopBar, h-14
│──────────│────────────────────────────────────────────────────│
│ ▣ Dashboard                                                     │
│ ☑ Daily Check-In │                                              │
│ ⚡ Habits        │   <main> scrolls, p-4 (md: p-6)              │
│ ◎ Goals          │   content max-w-7xl centered                 │
│ 🧠 AI Analysis   │                                              │
│ 📅 Reviews       │                                              │
│ ─────────        │                                              │
│ ♥ Health  ↗ Finances  👥 Social  📖 Learning                    │
│ 💼 Career  📊 Productivity  📜 Journal  〰 Metrics               │
│──────────│                                                      │
│ ⚙ Settings                                                      │
│ ⏻ Logout │                                                      │
└──────────┴────────────────────────────────────────────────────┘
```
- **Sidebar**: `w-56` expanded, `w-14` icon-only (☰ toggles, 200 ms transition), on a `surface` background with right border. Gradient "AI-POS" wordmark (accent→accent-2). Active item = accent text on 10% accent tint; hover = `elevated` fill. Two groups split by a hairline: *core* (Dashboard, Check-In, Habits, Goals, AI Analysis, Reviews) and *life areas / data*. Icons are Lucide, 16 px.
- **Mobile (<768 px)**: sidebar is a fixed 256 px slide-over from the left with a 40% black backdrop; tapping a link or the backdrop closes it. TopBar shows a hamburger and a short date ("Oct 6").
- **TopBar**: translucent surface with backdrop blur. Date, then **Life Score** (green ▲ / red ▼ / neutral), theme toggle (sun in dark mode, moon in light), avatar circle (photo, or first initial on a 20% accent tint) + display name (hidden on mobile).

### 4.2 Screens
- **Login / Register** — vertically centred 384 px column on the base background; gradient "AI-POS" title, subtitle, a bordered `surface` card with uppercase 12 px field labels, red-tinted error banner, full-width accent button, "Create one" link in accent.
- **Onboarding** — centred 448 px column, `rounded-2xl` card with `p-8`, dot step indicator above. Welcome screen: 👋 in an accent-tint circle, "Welcome, {first name}!", three emoji tiles (🎯 Track Goals / 🔥 Build Habits / 🤖 AI Coaching), big accent "Let's get started". Life Areas screen: 2-column toggle chips, selected = accent border + 8% tint + ✓, unselected = 60% opacity; footer "n of 8 areas selected".
- **Dashboard** — 12-column grid.
  - Row 1: left (4 cols) **Life Score ring**: 160 px radial gauge, 70→100% thickness, round caps, accent fill on an `elevated` track, big number centred ("7.4" / "Life Score"), caption "Based on today's check-in". Right (8 cols) **Life Areas**: 4×2 grid (2×4 on phones) of tiles; each has a 3 px left border in its area colour, name, big score, and a trend line (↗ green / ↘ red / – grey) with "x.x avg".
  - Row 2: **Check-in CTA** (5 cols — prompts, shows a pulsing ✨ while AI analyses, then the summary) and **Today's habits** (7 cols — tap to log).
- **Check-In wizard** — 672 px column. Step dots (done = green, current = accent with a soft ring, upcoming = border grey) joined by lines; labels hidden on phones. Card with slide-left/right transition (Framer Motion, 200 ms). Step 1: eight 1–10 sliders, each tinted with its area colour and showing a coloured numeric readout. Step 2: Mood & Energy sliders with emoji that change per value (😞→🙂 / 😴→😐), pink and amber tracks. Step 3: tag-style inputs for wins, blockers, action plan. Step 4: read-only review + "Complete & analyse". Back / "Step n of 4" / Next below.
- **Habits** — responsive grid of cards: area-coloured dot, title, area name, edit/delete icons (delete turns red on hover), a full-width "Log today" button that flips to a green "Done today ✓", a stats row (🔥 streak in amber when > 0, 🏆 best, total), and a **12-week heatmap** of 12 px squares in the area colour at 25–100% opacity by completion intensity, with a tooltip.
- **Goals** — cards with an area-coloured left border, an SVG **progress ring** (area colour, animated stroke), priority badge (low = grey, medium = blue, high = red), target date, expandable milestone checklist (strike-through when done), complete/delete actions, trophy icon when finished. Modal for create/edit.
- **AI Analysis** — feed of `InsightCard`s. Each is colour-coded by type (daily = accent violet, weekly = green, on-demand = purple, journal = amber), with summary, a tinted "top insight" box, prioritised action list with area chips, patterns bullets, "system change" outlined box, dismiss ✕, and a **1–5 star rating** (amber stars). On-demand panel lets you ask a question.
- **Reviews / Journal / Metrics / Learning / Settings** — same card language: `surface` cards, `border` hairlines, uppercase 12 px section labels; Metrics and Learning use Recharts (lines / bars) in the tokens' colours; Journal shows selected entry with an accent-tinted border and mood pills.
- **Area pages** (Health, Finances, Social, Career, Productivity) — title with one coloured dot per area, "n habits · n active goals", then a Habits section and an Active Goals section with dashed-border empty states and "+ New" outline buttons.

### 4.3 Components & interaction vocabulary
- **Button**: `default` (accent fill, white text), `outline`, `ghost`, `destructive`; sizes sm 32 / default 36 / lg 44 / icon 36 px; 2 px accent focus ring; disabled = 50% opacity.
- **Badge**: pill, 15%-tint background with solid text; variants default/secondary/destructive/success/outline.
- **Skeletons** pulse 0.5↔1 opacity over 1.5 s for every loading state (ring, grid, cards).
- **Corner radius**: base 10 px (`--radius: 0.625rem`); cards `rounded-lg`/`rounded-xl`, onboarding `rounded-2xl`, pills fully round.
- **Motion**: `fade-in` (4 px rise, 0.2 s), wizard slide, sidebar width transition, progress-ring stroke 0.5 s, `animate-pulse` on AI "thinking".
- **Type**: Inter is *loaded*, but see P3-18 — currently renders the system sans stack. Sizes: 12 px labels, 14 px body, 20–24 px page titles, 30 px hero numbers.
- **Utilities**: `.text-gradient` (135° accent→accent-2), `.card-glass` (80% surface + 8 px blur).

### 4.4 Colour themes
The app has **one palette in two modes** (light / dark), switched by the `dark` class. The default is **dark**; "system" is honoured until the user toggles. Colours are HSL CSS variables in [tokens.css](frontend/styles/tokens.css) mapped through [tailwind.config.ts](frontend/tailwind.config.ts).

**Surface & text**
| Token | Light | Dark |
|---|---|---|
| bg-base (page) | `#FFFFFF` | `#080C16` |
| bg-surface (cards, sidebar) | `#F7F7F7` | `#0F1524` |
| bg-elevated (hover, tracks, tiles) | `#F0F0F0` | `#171F30` |
| fg-primary | `#0F1729` | `#F1F5F9` |
| fg-secondary | `#65758B` | `#94A3B8` |
| fg-muted | `#97A3B4` | `#607085` |
| border | `#DCE0E4` | `#20283C` |
| border-strong | `#C0C6CE` | `#2E3A56` |

**Brand & semantic**
| Token | Light | Dark |
|---|---|---|
| accent (primary violet) | `#7C64F2` | `#8F74FB` |
| accent-2 (sky, gradient partner) | `#3EBAF4` | `#56C3F5` |
| accent-foreground | `#FFFFFF` | `#FFFFFF` |
| destructive | `#EF4343` | `#EF4343` |
| success | `#21C45D` | `#21C45D` *(not mapped in Tailwind — P0-2)* |
| warning | `#F59F0A` | `#F59F0A` *(not mapped in Tailwind)* |

**The 8 life-area colours** (identical in both modes; used for dots, left borders, sliders, rings, heatmaps, chips)
| Area | Colour | | Area | Colour |
|---|---|---|---|---|
| Discipline | `#7C64F2` violet | | Health | `#EF4343` red |
| Focus | `#A862EA` purple | | Mental | `#F59F0A` amber |
| Learning | `#3EBAF4` sky | | Social | `#EC4699` pink |
| Career | `#21C45D` green | | Financial | `#21CAB9` teal |

Other fixed colours: mood slider pink `#EC4699`-ish (`hsl(330 81% 60%)`), energy slider amber, streak flame amber, star ratings amber.

**Mood of the design**: a dark, low-chroma navy canvas with a single violet accent, tinted-fill (10–15%) selection states instead of solid blocks, hairline borders, and colour used almost exclusively to encode *which life area* something belongs to.

### 4.5 Accessibility (computed WCAG contrast)
| Pair | Light | Dark | AA (4.5) |
|---|---|---|---|
| fg-primary on base | 17.9 | 17.8 | ✅ |
| fg-secondary on surface | 4.38 | 7.10 | ⚠️ light just misses |
| fg-muted on base | **2.56** | 3.87 | ❌ both |
| accent as text on surface | 3.95 | 5.25 | ⚠️ light |
| white on accent button | 4.23 | **3.47** | ⚠️ / ❌ |
| Learning/Career/Mental/Financial colour as text | **1.9–2.2** | 7.9–8.9 | ❌ light |

Dark mode is the healthier theme; light mode needs darkened area/accent shades if used for text.

---

## 5. Tech inventory
- **Backend**: FastAPI 0.115, SQLAlchemy 2.0 async + asyncpg, Alembic, Pydantic 2, PyJWT, passlib/bcrypt, slowapi, Anthropic SDK 0.39, azure-storage-blob, Resend, gunicorn/uvicorn. Models: `claude-haiku-4-5` (fast), `claude-sonnet-4-6` (quality) — both configurable via env.
- **Frontend**: Next.js 14.2, React 18, Tailwind 3.4, TanStack Query 5, Zustand 4, Recharts 2, Framer Motion 11, react-hook-form + zod, next-themes, lucide-react, date-fns, axios, vitest.

## 6. Housekeeping
- Existing `README.md` needs a rewrite (see P5-27); this file can become its source.
- Memory note said "Phases 1–6 complete" — accurate for feature scope; this audit adds that **build/CI health and verification were never confirmed**, which is what Phase 7 should be.
