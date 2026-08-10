# ---- Stage 1: build React frontend ----
FROM node:20-slim AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
ARG VITE_API_BASE_URL=/api/
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ---- Stage 2: Django backend, serving the built frontend ----
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY finance_backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY finance_backend/ .
COPY --from=frontend-build /frontend/dist ./frontend_dist

EXPOSE 8000

CMD ["sh", "-c", "python manage.py collectstatic --noinput && python manage.py migrate && (python manage.py createsuperuser --noinput || true) && gunicorn finance_backend.wsgi:application --bind 0.0.0.0:$PORT --timeout 120"]