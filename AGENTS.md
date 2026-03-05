# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Overview

Scheduler is a task management app that automatically schedules tasks into a calendar view. It uses a full-stack architecture: FastAPI backend + React frontend, connected via a generated OpenAPI client.

## Commands

### Full Stack (Docker)

```bash
docker compose watch        # Start full stack with hot reload
docker compose logs backend # View backend logs
docker compose stop frontend # Stop frontend (to run locally instead)
```

### Backend (from `backend/`)

```bash
uv sync                     # Install dependencies
source .venv/bin/activate   # Activate venv
fastapi dev app/main.py     # Run dev server (port 8000)
bash ./scripts/test.sh      # Run tests with coverage
bash ./scripts/lint.sh      # mypy + ruff check + ruff format check
uv run pre-commit run --all-files  # Run all pre-commit hooks
```

**First-time local setup (without Docker):** The superuser is NOT seeded automatically when running the backend locally — that only happens via the `backend-prestart` Docker service. After a fresh DB, seed it once:
```bash
python3 -c "from sqlmodel import Session; from app.core.db import engine, init_db; s = Session(engine); init_db(s)"
```

**Preferred way to run backend tests (with Docker stack running):**
```bash
docker compose exec backend bash scripts/tests-start.sh        # all tests
docker compose exec backend bash scripts/tests-start.sh -x     # stop on first failure
```

Run a single pytest test:
```bash
uv run pytest app/tests/api/routes/test_items.py::test_name -x
```

### Frontend (from `frontend/`)

```bash
npm install                 # Install dependencies
npm run dev                 # Start dev server (port 5173)
npm run lint                # Run Biome linter/formatter
npm run build               # TypeScript check + Vite build
npx playwright test         # Run E2E tests (requires backend running)
```

### Generating the Frontend Client

When backend API changes, regenerate the typed client (run from repo root):
```bash
./scripts/generate-client.sh
```
This exports the OpenAPI schema from the backend, processes it through `frontend/modify-openapi-operationids.js`, and regenerates `frontend/src/client/`.

### Database Migrations (Alembic)

```bash
# From backend/ directory:
alembic revision --autogenerate -m "Description of change"
alembic upgrade head
```

**IMPORTANT:** Any time you add or change a field on a SQLModel table model, you MUST:
1. Run `alembic revision --autogenerate -m "description"` from `backend/` to generate a migration
2. Run `alembic upgrade head` to apply it

Never leave a model change without a corresponding migration — the backend will return 500 errors if the database schema is out of sync.

## Architecture

### Backend (`backend/app/`)

- **Framework**: FastAPI with SQLModel (Pydantic v2 + SQLAlchemy) and PostgreSQL
- **`main.py`**: App entry point — sets up CORS and mounts `api_router` at `/api/v1`
- **`api/routes/`**: One file per resource (`tasks.py`, `items.py`, `users.py`, `login.py`, `utils.py`)
- **`models.py`**: All SQLModel models in one file — both DB table models and Pydantic schemas (e.g., `Task`, `TaskPublic`, `TasksPublic`)
- **`crud.py`**: CRUD helpers (currently mainly for users/items; tasks CRUD is inline in routes)
- **`core/config.py`**: `Settings` class reads from `.env` via pydantic-settings
- **`api/deps.py`**: FastAPI dependencies — `SessionDep`, `CurrentUser`
- **`alembic/versions/`**: Migration files

Authentication uses JWT tokens via `passlib`/`pyjwt`. The `Task` model has `owner_id` FK to `user.id`, so tasks are user-scoped.

### Frontend (`frontend/src/`)

- **Framework**: React 18 + TypeScript + Vite, TanStack Router (file-based routing), TanStack Query for data fetching
- **UI**: shadcn/ui components (Radix UI primitives + Tailwind CSS)
- **`client/`**: Auto-generated OpenAPI client (do not edit manually) — provides `TasksService`, `ItemsService`, etc.
- **`routes/_layout/`**: Page components — `index.tsx` (Dashboard), `tasks.tsx` (Inbox), `items.tsx`, `admin.tsx`
- **`components/tasks/`**: Task-specific components including `AddTaskForm.tsx` (single natural language input — parses `@tags`, `p1`–`p4` priority, day names for due date)
- **`hooks/`**: `useAuth.ts`, `useCustomToast.ts`

The Dashboard (`index.tsx`) shows a resizable split panel: Tasks list on the left, Calendar on the right.

### Data Flow

1. Frontend calls `TasksService.*` methods from the generated client
2. Client sends requests to `http://localhost:8000/api/v1/tasks/`
3. FastAPI routes validate with Pydantic, query PostgreSQL via SQLModel session
4. Responses are typed via `TaskPublic`/`TasksPublic` schemas

### Key Conventions

- All models live in `backend/app/models.py` — add new models there
- New API routes go in `backend/app/api/routes/` and must be registered in `backend/app/api/main.py`
- After any backend model/route change, regenerate the frontend client with `./scripts/generate-client.sh`
- Backend uses `uv` for package management; frontend uses `npm`
- Pre-commit hooks enforce: ruff (Python linting/formatting), mypy (type checking), eslint, prettier
