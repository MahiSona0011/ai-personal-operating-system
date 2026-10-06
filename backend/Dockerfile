FROM python:3.12-slim AS builder
WORKDIR /build
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.12-slim AS runtime
WORKDIR /app
RUN groupadd -r aipos && useradd -r -g aipos aipos
COPY --from=builder /install /usr/local
COPY . .
RUN chown -R aipos:aipos /app
USER aipos
EXPOSE 8000
# Apply migrations, then serve. Hosts like Render set $PORT and WEB_CONCURRENCY (free tier: 512 MB, so 1 worker).
CMD ["sh", "-c", "alembic upgrade head && exec gunicorn app.main:app --worker-class uvicorn.workers.UvicornWorker --workers ${WEB_CONCURRENCY:-2} --bind 0.0.0.0:${PORT:-8000} --timeout 30 --graceful-timeout 10"]
