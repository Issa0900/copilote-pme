FROM python:3.12-slim

# tesseract-ocr : requis par pytesseract pour l'OCR des PDF scannés
# (voir app/ingestion.py). libpq-dev/gcc : compilation de psycopg2-binary
# sur certaines architectures.
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
