# AI Financial Assistant

An AI-powered personal finance assistant that lets users upload UPI/bank statements (CSV and PDF), automatically categorizes transactions using an LLM, generates AI-written spending insights and budget recommendations, and answers natural-language questions about their own transaction history via Retrieval-Augmented Generation (RAG).

**Live demo:** `https://ai-financial-assistant-t1nd.onrender.com`

---

## ✨ Features

- **Statement upload & parsing** — CSV (PhonePe-style, alias-based column matching) and PDF (Google Pay, regex-based with LLM fallback for unrecognized layouts)
- **Hybrid AI categorization** — fast keyword heuristics run first; only genuinely ambiguous transactions are sent to an LLM, keeping API usage low
- **AI-generated insights** — monthly spending summaries, budget advice, and recommendations grounded strictly in the user's real transaction data (no hallucinated figures)
- **RAG-powered chat** — ask questions like *"how much did I spend on food this month?"* and get answers retrieved from your own embedded transaction history (ChromaDB + Gemini embeddings), scoped per-user and per-statement
- **Analytics dashboard** — month-scoped and all-time views: category breakdowns, spending trends, daily spend charts, biggest expenses, trailing-average budget forecasts
- **Dashboard** — all-time or per-statement scope, KPIs (income/expense/savings with period-over-period % change), AI health score, category pie chart, monthly trend chart
- **Authentication** — JWT-based login, username/password signup, and Google OAuth
- **Account settings** — profile editing, password change, category management, CSV export of all transactions, account deletion
- **Duplicate-safe re-uploads** — SHA-256 file hashing so re-uploading the same statement reprocesses instead of duplicating data
- **Uptime monitoring** — lightweight `/health/` endpoint pinged externally to reduce free-tier cold starts

---

## 🧱 Tech Stack

| Layer                                  | Technology                                                                  |
| -------------------------------------- | --------------------------------------------------------------------------- |
| Backend                                | Django + Django REST Framework                                              |
| Database                               | PostgreSQL (SQLite for local dev)                                           |
| Caching                                | Redis (in-memory fallback if unavailable)                                   |
| Vector DB                              | ChromaDB (persistent, local)                                                |
| Embeddings                             | Google Gemini Embedding API                                                 |
| LLM (categorization / insights / chat) | OpenRouter (free-tier models, auto-router)                                  |
| Statement parsing                      | pandas, pdfplumber                                                          |
| Auth                                   | JWT (`djangorestframework-simplejwt`) + `django-allauth` (Google OAuth) |
| Frontend                               | React (Vite) + Tailwind CSS + Recharts                                      |
| Containerization                       | Docker + Docker Compose                                                     |
| Deployment                             | Render (single service serving Django API + built React frontend)           |
| Uptime                                 | UptimeRobot pinging`/health/`                                             |

---

## 📂 Project Structure

```
upi-finance-tracker/
├── docker-compose.yml
├── finance_backend/              # Django project
│   ├── finance_backend/          # settings, urls, wsgi/asgi
│   └── tracker/                  # single Django app
│       ├── models.py             # Category, Statement, Transaction, MonthlyInsight, ChatMessage
│       ├── serializers.py
│       ├── views.py
│       ├── urls.py
│       ├── parsers/               # csv_parser.py, pdf_parser.py
│       ├── ai/                    # categorize.py, embeddings.py, rag_chat.py, prompts.py
│       └── services/              # insights.py, analytics.py, upload_service.py
└── frontend/                     # React (Vite) app
    └── src/
        ├── pages/
        ├── components/
        ├── services/
        ├── hooks/
        └── context/
```

---

## 🚀 Getting Started

### Backend

```bash
cd finance_backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Docker (full stack)

```bash
docker compose up --build
```

Runs Postgres, Redis, and the Django app together, with ChromaDB persisted in a named volume.

---

## 🔑 Environment Variables

Create `finance_backend/.env`:

```
SECRET_KEY=
GEMINI_API_KEY=
OPENROUTER_API_KEY=
DEBUG=true
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0,testserver
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FRONTEND_URL=http://localhost:5173
```

For Docker/Render, also set `DB_ENGINE=postgres` plus `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, and `REDIS_URL`.

---

## 🗺️ Key API Endpoints

| Endpoint                                    | Description                  |
| ------------------------------------------- | ---------------------------- |
| `POST /api/token/`                        | JWT login                    |
| `POST /api/register/`                     | Username/password signup     |
| `GET /api/me/`                            | Current user profile         |
| `POST /api/statements/`                   | Upload & process a statement |
| `GET /api/dashboard/?scope=all\|statement` | Dashboard data               |
| `GET /api/analytics/?scope=month\|all`     | Analytics data               |
| `POST /api/chat/ask/`                     | RAG chat question            |
| `GET /health/`                            | Uptime health check          |

---

## 🧠 Design Notes

- **Single Django app** (`tracker`) by design — `parsers/`, `ai/`, and `services/` are plain Python subpackages, not separate Django apps, keeping migrations and URL wiring simple for a solo project.
- **RAG scoping**: every embedded transaction is namespaced by both `user_id` and `statement_id` in ChromaDB metadata, and chat retrieval filters on both — preventing cross-user or cross-upload data leakage.
- **Cost-conscious AI usage**: heuristic categorization resolves most transactions without any API call; only ambiguous ones reach the LLM. Insight generation is Redis-cached and keyed off the statement's `processed_at` timestamp so re-processing invalidates stale results automatically.
- **Honest forecasting**: the "predicted next month spend" feature is a transparent trailing-average of the last few months — explicitly not framed as a real forecasting model.

---

## 📌 Status

Actively developed portfolio project. Core upload → categorize → insight → chat pipeline is complete and deployed; ongoing polish on analytics, auth flows, and deployment hardenin

# AI Financial Assistant

 AI Financial Assistant is a Django + React starter for uploading statements, parsing transactions, categorizing spend, and surfacing AI-assisted insights.

## Layout

- `finance_backend/` holds the Django project and the single `tracker` app.
- `frontend/` is a Vite-based React starter for the Phase 2 UI.
- `templates/`, `static/`, and `media/` support the Phase 1 server-rendered experience and uploads.

## Backend

```bash
cd finance_backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## Docker

```bash
docker compose up --build
```

## What is scaffolded

- Custom user model for finance-specific fields.
- Core models for categories, statements, and transactions.
- DRF serializers, viewsets, and API routing.
- Parser, AI, and service modules ready for business logic.
- Minimal React Vite starter for the next phase.
