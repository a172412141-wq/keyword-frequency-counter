from __future__ import annotations

import argparse
import json
import subprocess
import time
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.error import URLError
from urllib.request import Request, urlopen


BASE_DIR = Path(__file__).resolve().parent
LOG_DIR = BASE_DIR / ".launcher-logs"
BUSINESS_ANALYZER_DIR = Path.home() / "Documents" / "New project" / "amazon-inventory-profit-analyzer"


@dataclass(frozen=True)
class Service:
    id: str
    label: str
    description: str
    url: str
    health_url: str
    cwd: Path
    command: tuple[str, ...]


SERVICES: dict[str, Service] = {
    "bulk": Service(
        id="bulk",
        label="Bulk 表分析",
        description="Amazon Ads Bulk 诊断表生成器",
        url="http://127.0.0.1:8000/",
        health_url="http://127.0.0.1:8000/api/health",
        cwd=BASE_DIR / "bulk-ad-diagnostic-generator",
        command=(
            "./.venv/bin/uvicorn",
            "api:app",
            "--host",
            "127.0.0.1",
            "--port",
            "8000",
        ),
    ),
    "business": Service(
        id="business",
        label="经营分析",
        description="Amazon 库存利润经营分析工具",
        url="http://127.0.0.1:8501/",
        health_url="http://127.0.0.1:8501/_stcore/health",
        cwd=BUSINESS_ANALYZER_DIR,
        command=(
            "./.venv/bin/streamlit",
            "run",
            "app.py",
            "--server.headless",
            "true",
            "--server.port",
            "8501",
            "--server.address",
            "127.0.0.1",
        ),
    ),
}


def service_running(service: Service) -> bool:
    try:
        req = Request(service.health_url, headers={"User-Agent": "1sme-platform-launcher"})
        with urlopen(req, timeout=0.8) as response:
            return 200 <= response.status < 500
    except (OSError, URLError):
        return False


def serialize_service(service: Service) -> dict[str, Any]:
    return {
        "id": service.id,
        "label": service.label,
        "description": service.description,
        "url": service.url,
        "running": service_running(service),
        "logPath": str(LOG_DIR / f"{service.id}.log"),
        "missing": not service.cwd.exists(),
    }


def start_service(service: Service) -> dict[str, Any]:
    if service_running(service):
        return {"started": False, "alreadyRunning": True, "service": serialize_service(service)}

    if not service.cwd.exists():
        raise FileNotFoundError(f"Service directory not found: {service.cwd}")

    executable = service.cwd / service.command[0]
    if not executable.exists():
        raise FileNotFoundError(f"Service executable not found: {executable}")

    LOG_DIR.mkdir(parents=True, exist_ok=True)
    log_file = (LOG_DIR / f"{service.id}.log").open("ab")
    log_file.write(f"\n\n[{time.strftime('%Y-%m-%d %H:%M:%S')}] starting {service.id}\n".encode())
    log_file.flush()

    subprocess.Popen(
        service.command,
        cwd=service.cwd,
        stdout=log_file,
        stderr=subprocess.STDOUT,
        stdin=subprocess.DEVNULL,
        start_new_session=True,
    )

    deadline = time.time() + 12
    while time.time() < deadline:
        if service_running(service):
            return {"started": True, "alreadyRunning": False, "service": serialize_service(service)}
        time.sleep(0.35)

    return {"started": True, "alreadyRunning": False, "service": serialize_service(service)}


class LauncherHandler(BaseHTTPRequestHandler):
    server_version = "1SMELauncher/1.0"

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self) -> None:
        if self.path == "/api/health":
            self._send_json({"status": "ok"})
            return
        if self.path == "/api/services":
            self._send_json({"services": [serialize_service(service) for service in SERVICES.values()]})
            return
        self._send_json({"detail": "Not found"}, status=404)

    def do_POST(self) -> None:
        if self.path == "/api/services/start-all":
            results = []
            for service in SERVICES.values():
                try:
                    results.append({"id": service.id, **start_service(service)})
                except Exception as exc:  # noqa: BLE001
                    results.append({"id": service.id, "error": str(exc), "service": serialize_service(service)})
            self._send_json({"results": results})
            return

        prefix = "/api/services/"
        suffix = "/start"
        if self.path.startswith(prefix) and self.path.endswith(suffix):
            service_id = self.path[len(prefix) : -len(suffix)]
            service = SERVICES.get(service_id)
            if not service:
                self._send_json({"detail": "Unknown service"}, status=404)
                return
            try:
                self._send_json(start_service(service))
            except Exception as exc:  # noqa: BLE001
                self._send_json({"detail": str(exc), "service": serialize_service(service)}, status=500)
            return

        self._send_json({"detail": "Not found"}, status=404)

    def log_message(self, format: str, *args: Any) -> None:
        return

    def _send_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _send_json(self, payload: dict[str, Any], status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self._send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    parser = argparse.ArgumentParser(description="Local service launcher for the 1SME tools platform.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8787)
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), LauncherHandler)
    print(f"1SME launcher listening on http://{args.host}:{args.port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
