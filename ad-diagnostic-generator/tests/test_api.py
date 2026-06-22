from __future__ import annotations

import io
from pathlib import Path

from fastapi.testclient import TestClient
from openpyxl import load_workbook

from api import app


client = TestClient(app)


def sample_bulk() -> bytes:
    return (Path(__file__).parents[1] / "frontend" / "sample-bulk.xlsx").read_bytes()


def test_frontend_and_health_are_served():
    response = client.get("/")
    assert response.status_code == 200
    assert "把一张 Bulk" in response.text
    assert client.get("/api/health").json() == {"status": "ok"}
    assert client.get("/static/styles.css").status_code == 200


def test_analyze_returns_parent_choices():
    response = client.post(
        "/api/analyze",
        files={"file": ("bulk.xlsx", sample_bulk(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["summary"]["data_rows"] == 5
    asin = next(field for field in body["fields"] if field["name"] == "ASIN (Informational only)")
    assert asin["values"] == ["B0DEMO0001"]


def test_generate_downloads_workbook():
    response = client.post(
        "/api/generate",
        files={"file": ("bulk.xlsx", sample_bulk(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        data={"selected_field": "ASIN (Informational only)", "selected_value": "B0DEMO0001"},
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    assert "filename*=UTF-8''" in response.headers["content-disposition"]
    workbook = load_workbook(io.BytesIO(response.content), data_only=False, keep_links=False)
    assert workbook["Bulk"]["W15"].value == "B0DEMO0001"
    assert workbook["BidingAdjustment"]["AH6"].value == "Placement Top"


def test_analyze_rejects_non_xlsx():
    response = client.post(
        "/api/analyze",
        files={"file": ("bulk.csv", b"a,b\n1,2", "text/csv")},
    )
    assert response.status_code == 415
