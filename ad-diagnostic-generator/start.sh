#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8000}"
exec uvicorn api:app --host 0.0.0.0 --port "$PORT"
