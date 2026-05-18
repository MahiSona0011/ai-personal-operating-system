# AI Personal Operating System

A full-stack AI-powered life management platform that delivers personalised coaching through daily check-ins, goal tracking, habit monitoring, and AI-generated weekly reviews.

## Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Python, FastAPI, PostgreSQL, SQLAlchemy (async), Alembic |
| **Auth** | JWT, bcrypt, refresh token rotation, rate limiting |
| **AI** | Anthropic Claude API — daily analysis, weekly reviews, on-demand coaching |
| **Cloud** | Microsoft Azure Blob Storage |
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS |
| **State & Data** | React Query (TanStack), Zustand, Recharts, Zod, React Hook Form |
| **DevOps** | Docker, docker-compose |

## Features

- **Goal & Milestone Tracking** — set goals across life areas with progress percentages and target dates
- **Daily Check-ins** — log mood, energy, and reflections; AI generates personalised analysis after each check-in
- **Habit Monitoring** — track habits with streak data and completion rates
- **Journaling** — write entries with AI-powered insights
- **Weekly AI Review** — Claude generates a full weekly performance narrative with highlights and improvement areas
- **On-Demand AI Coaching** — ask questions and get contextual AI responses based on your data
- **Analytics Dashboard** — interactive charts (Recharts) visualising progress trends across all life areas
- **Secure Auth** — JWT access tokens (15 min), refresh tokens (7 days), bcrypt password hashing

## Architecture

```
ai-pos/
├── backend/               # Python FastAPI application
│   ├── app/
│   │   ├── api/v1/        # REST API endpoints
│   │   ├── models/        # SQLAlchemy ORM models (10+ tables)
│   │   ├── schemas/       # Pydantic request/response schemas
│   │   ├── services/      # Business logic layer
│   │   ├── ai/            # Claude AI integration & prompt engineering
│   │   └── core/          # Config, database, security, middleware
│   └── alembic/           # Database migrations
├── frontend/              # Next.js 14 application
│   └── src/
└── docker-compose.yml     # Full-stack container orchestration
```

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL
- Docker (optional)

### Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env         # Fill in your credentials
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

### Docker (Full Stack)
```bash
docker-compose up --build
```

API docs available at `http://localhost:8000/docs`

## Environment Variables

See `backend/.env.example` for required variables:
- `DATABASE_URL` — PostgreSQL connection string
- `SECRET_KEY` — JWT signing key
- `ANTHROPIC_API_KEY` — Claude AI API key
- `AZURE_STORAGE_CONNECTION_STRING` — Azure Blob Storage
