# Amazon Title Batch Optimizer Tool (v1.0)

Production-ready MVP for batch checking and optimizing Amazon product titles from `.xlsx` files.

## Features

- Upload Excel workbooks with `Title`, optional `Brand`, and optional `Category` columns
- Detect compliance issues: length, promo language, invalid symbols, format noise, repetition, weak structure, and claim risk
- Generate optimized titles with banned words removed, tokens deduplicated, product type moved early, and length capped at 75 characters
- FastAPI backend and Next.js 14 frontend connected through REST APIs

## Local Backend

```bash
cd amazon-title-optimizer/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend health check:

```bash
curl http://127.0.0.1:8000/api/health
```

## Local Frontend

```bash
cd amazon-title-optimizer/frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If the backend runs somewhere else:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000 npm run dev
```

## Docker

```bash
cd amazon-title-optimizer
docker compose up --build
```

Frontend: [http://localhost:3000](http://localhost:3000)
Backend: [http://localhost:8000](http://localhost:8000)

## API

### `POST /api/title/batch-optimize`

Multipart form upload:

- `file`: `.xlsx` workbook

Returns:

```json
[
  {
    "original": "Example title",
    "status": "FAIL",
    "issues": ["OVER_LENGTH"],
    "optimized_title": "Optimized title"
  }
]
```

### `POST /api/title/optimize`

```json
{
  "title": "Acme best phone case case case!",
  "brand": "Acme",
  "category": "Phone Case"
}
```
