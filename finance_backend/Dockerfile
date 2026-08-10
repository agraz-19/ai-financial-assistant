# Base image: an official Python image with Python 3.12 already installed on
# a lightweight Linux distro ("slim" = fewer preinstalled extras = smaller image).
# We use 3.12 rather than matching your local 3.14 exactly -- 3.14 is very new
# and some packages (like sentence-transformers' dependencies) may not have
# published wheels for it yet. 3.12 is stable and well-supported everywhere.
FROM python:3.12-slim

# Prevents Python from writing .pyc files and buffers stdout -- makes logs
# show up immediately in `docker-compose logs` instead of being delayed.
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Everything from here on happens inside /app in the container's filesystem
# (this is NOT your D:\upi-finance-tracker folder -- it's a fresh filesystem
# that only contains what we explicitly copy in below).
WORKDIR /app

# System-level packages needed to BUILD some Python packages.
# - build-essential: C compiler, needed by some packages with native extensions
# - libpq-dev: Postgres client headers, needed to install psycopg2
# We install these, use them, then clean up apt's cache in the same layer to
# keep the final image smaller.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy ONLY requirements.txt first, before the rest of your code.
# Why: Docker caches each step. If your code changes but requirements.txt
# doesn't, Docker reuses the cached "pip install" step instead of re-running
# it -- saves you minutes on every rebuild while you're actively developing.
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# NOW copy the rest of your actual project code into the image.
COPY . .

# Django's default dev server port
EXPOSE 8000

# What actually runs when the container starts.
# IMPORTANT: 0.0.0.0, not 127.0.0.1 (Django's default). Inside a container,
# 127.0.0.1 means "only reachable from inside this exact container" -- your
# Windows browser couldn't reach it at all. 0.0.0.0 means "listen on every
# network interface," which is what lets Docker's port mapping (-p 8000:8000
# in docker-compose.yml) forward traffic from your Windows machine in.
# For local dev, runserver is fine (matches what you already use).
# For production later (Render), this would change to gunicorn instead --
# we'll cross that bridge in Week 3.
CMD ["sh", "-c", "python manage.py collectstatic --noinput && python manage.py migrate && (python manage.py createsuperuser --noinput || true) && gunicorn finance_backend.wsgi:application --bind 0.0.0.0:$PORT"]