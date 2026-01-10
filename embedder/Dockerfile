FROM python:3.12-slim

WORKDIR /app

# Install dependencies
RUN pip install --no-cache-dir fastapi uvicorn fastembed

COPY bm25_service.py .

EXPOSE 8002

CMD ["uvicorn", "bm25_service:app", "--host", "0.0.0.0", "--port", "8002"]
