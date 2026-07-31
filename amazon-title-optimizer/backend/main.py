from __future__ import annotations

import os
from typing import Any, Literal, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field

from listing_optimizer import build_listing_result
from utils import (
    build_listing_batch_results,
    build_result,
    create_blank_template_workbook,
    create_listing_template_workbook,
    read_title_rows,
)


class OptimizeRequest(BaseModel):
    title: str = Field(..., min_length=1)
    brand: Optional[str] = ""
    category: Optional[str] = ""


class OptimizeResponse(BaseModel):
    original: str
    status: Literal["PASS", "FAIL"]
    issues: list[str]
    optimized_title: str


class ListingOptimizeRequest(BaseModel):
    title: str = Field(..., min_length=1)
    brand: Optional[str] = ""
    category: Optional[str] = ""
    bullets: list[str] = Field(default_factory=list)
    aplus_content: Optional[str] = ""


app = FastAPI(title="Amazon Title Batch Optimizer Tool", version="1.0.0")

frontend_origins = os.getenv(
    "FRONTEND_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,"
    "http://localhost:3001,http://127.0.0.1:3001,"
    "http://localhost:3020,http://127.0.0.1:3020",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in frontend_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/title/optimize", response_model=OptimizeResponse)
def optimize_single(payload: OptimizeRequest) -> dict[str, object]:
    return build_result(payload.title, payload.brand or "", payload.category or "")


@app.get("/api/title/template")
def download_template() -> Response:
    return Response(
        content=create_blank_template_workbook(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": 'attachment; filename="amazon-title-optimizer-template.xlsx"',
        },
    )


@app.post("/api/listing/optimize")
def optimize_listing(payload: ListingOptimizeRequest) -> dict[str, Any]:
    return build_listing_result(
        payload.title,
        payload.brand or "",
        payload.category or "",
        payload.bullets,
        payload.aplus_content or "",
    )


@app.get("/api/listing/template")
def download_listing_template() -> Response:
    return Response(
        content=create_listing_template_workbook(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": 'attachment; filename="amazon-listing-copy-template.xlsx"',
        },
    )


@app.post("/api/listing/batch-optimize")
async def batch_optimize_listing(file: UploadFile = File(...)) -> list[dict[str, Any]]:
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Only .xlsx files are supported.")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        results = build_listing_batch_results(contents)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not results:
        raise HTTPException(status_code=400, detail="No listing rows found in the workbook.")

    return results


@app.post("/api/title/batch-optimize", response_model=list[OptimizeResponse])
async def batch_optimize(file: UploadFile = File(...)) -> list[dict[str, object]]:
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Only .xlsx files are supported.")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        rows = read_title_rows(contents)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not rows:
        raise HTTPException(status_code=400, detail="No title rows found in the workbook.")

    return [
        build_result(row["title"], row.get("brand", ""), row.get("category", ""))
        for row in rows
    ]
