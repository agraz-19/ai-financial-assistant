# UPI Finance Tracker

UPI Finance Tracker is a Django + React starter for uploading statements, parsing transactions, categorizing spend, and surfacing AI-assisted insights.

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

