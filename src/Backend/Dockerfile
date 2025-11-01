FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

# System deps for pyodbc + MS ODBC Driver 18
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates gnupg apt-transport-https \
    unixodbc unixodbc-dev build-essential && \
    rm -rf /var/lib/apt/lists/*

# Add Microsoft repo (Debian 12 / bookworm) WITHOUT apt-key
RUN set -eux; \
    curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg; \
    echo 'deb [arch=amd64,arm64 signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/debian/12/prod bookworm main' > /etc/apt/sources.list.d/microsoft-prod.list; \
    apt-get update; \
    ACCEPT_EULA=Y apt-get install -y msodbcsql18; \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . /app

ENV PORT=10000
# run the Flask app via gunicorn, importing the WSGI app from wsgi.py
CMD ["sh","-c","gunicorn --bind 0.0.0.0:${PORT:-10000} wsgi:app"]

