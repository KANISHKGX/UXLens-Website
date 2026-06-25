# Microsoft's official Playwright image — ships a real Chromium plus every
# system library it needs to launch (the missing libs are exactly why
# Playwright's driver crashed under plain Nixpacks on Railway: "Connection
# closed while reading from the driver"). This makes capture_device()'s
# Playwright fallback succeed in production the same way Selenium succeeds
# locally, instead of falling through to thum.io.
FROM mcr.microsoft.com/playwright/python:v1.44.0-jammy

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && pip install --no-cache-dir --upgrade certifi
COPY . .

# Railway injects $PORT at runtime — same convention as the Procfile.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8100}"]
