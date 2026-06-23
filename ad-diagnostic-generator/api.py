from __future__ import annotations

import io
import json
from pathlib import Path
from urllib.parse import quote

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from generator import (
    InputValidationError,
    generate_diagnostic_workbook,
    parent_options,
    read_bulk_input,
    safe_filename,
)


BASE_DIR = Path(__file__).parent
FRONTEND_DIR = BASE_DIR / "frontend"
MAX_UPLOAD_BYTES = 200 * 1024 * 1024

app = FastAPI(
    title="Amazon 广告诊断表生成器",
    description="Analyze Amazon Ads Bulk files and generate a template-based diagnostic workbook.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url=None,
)
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


FIELD_LABELS = {
    "ASIN (Informational only)": "ASIN（优先）",
    "SKU": "SKU",
    "Campaign Name": "Campaign Name",
    "Campaign Name (Informational only)": "Campaign Name（信息列）",
    "Ad Group Name": "Ad Group Name",
    "Ad Group Name (Informational only)": "Ad Group Name（信息列）",
}


@app.exception_handler(InputValidationError)
async def handle_validation_error(_, exc: InputValidationError) -> JSONResponse:
    return JSONResponse(status_code=422, content={"detail": str(exc)})


@app.get("/", include_in_schema=False)
async def index() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


async def read_upload(file: UploadFile) -> bytes:
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=415, detail="仅支持 .xlsx 文件。")
    payload = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(payload) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="文件不能超过 200MB。")
    if not payload:
        raise HTTPException(status_code=422, detail="上传文件为空。")
    return payload


@app.post("/api/analyze")
async def analyze(file: UploadFile = File(...)) -> dict[str, object]:
    payload = await read_upload(file)
    try:
        bulk = read_bulk_input(payload)
    except InputValidationError:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"无法读取 Excel：{exc}") from exc

    options = parent_options(bulk)
    return {
        "file": {"name": file.filename, "size": len(payload)},
        "summary": {
            "sheet_name": bulk.sheet_name,
            "header_row": bulk.header_row,
            "data_rows": len(bulk.rows),
            "field_count": len(bulk.headers),
            "search_term_sheet_name": bulk.search_term_sheet_name,
            "search_term_rows": len(bulk.search_term_rows),
            "portfolio_sheet_name": bulk.portfolio_sheet_name,
            "portfolio_rows": len(bulk.portfolio_rows),
        },
        "fields": [
            {
                "name": field,
                "label": FIELD_LABELS.get(field, field),
                "count": len(values),
                "values": values,
            }
            for field, values in options.items()
        ],
    }


@app.post("/api/generate")
async def generate(
    file: UploadFile = File(...),
    selected_field: str = Form(...),
    selected_values: list[str] | None = Form(None),
    selected_value: str | None = Form(None),
) -> StreamingResponse:
    payload = await read_upload(file)
    try:
        bulk = read_bulk_input(payload)
        values = selected_values or ([selected_value] if selected_value else [])
        workbook_bytes, stats = generate_diagnostic_workbook(bulk, selected_field, values)
    except InputValidationError:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"生成 Excel 失败：{exc}") from exc

    filename_label = values[0] if len(values) == 1 else f"{values[0]}_等{len(values)}项"
    filename = safe_filename(filename_label)
    encoded_filename = quote(filename)
    stats_json = json.dumps(stats.__dict__, ensure_ascii=True, separators=(",", ":"))
    return StreamingResponse(
        io.BytesIO(workbook_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}",
            "X-Generation-Stats": stats_json,
        },
    )
