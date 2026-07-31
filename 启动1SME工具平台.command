#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

BUSINESS_ANALYZER_DIR="${BUSINESS_ANALYZER_DIR:-$ROOT_DIR/business-analysis}"

CODEX_RUNTIME="/Users/1sme/.cache/codex-runtimes/codex-primary-runtime/dependencies"
PYTHON_BIN="$CODEX_RUNTIME/python/bin/python3"

if [ ! -x "$PYTHON_BIN" ]; then
  PYTHON_BIN="python3"
fi

mkdir -p .launcher-logs

check_url() {
  curl -sS --fail --max-time 2 "$1" >/dev/null 2>&1
}

wait_for_url() {
  local url="$1"
  local label="$2"
  local deadline=$((SECONDS + 45))
  until check_url "$url"; do
    if [ "$SECONDS" -ge "$deadline" ]; then
      echo "$label 启动超时：$url" >&2
      return 1
    fi
    sleep 1
  done
}

start_bulk_service() {
  if check_url http://127.0.0.1:8000/api/health; then
    return
  fi

  (
    cd "$ROOT_DIR/bulk-ad-diagnostic-generator"
    nohup ./.venv/bin/uvicorn api:app --host 127.0.0.1 --port 8000 \
      >> "$ROOT_DIR/.launcher-logs/bulk.log" 2>&1 &
    echo "$!" > "$ROOT_DIR/.launcher-logs/bulk.pid"
  )
}

start_business_service() {
  if check_url http://127.0.0.1:8501/_stcore/health; then
    return
  fi

  (
    cd "$BUSINESS_ANALYZER_DIR"
    nohup ./.venv/bin/streamlit run app.py \
      --server.headless true \
      --server.port 8501 \
      --server.address 127.0.0.1 \
      >> "$ROOT_DIR/.launcher-logs/business.log" 2>&1 &
    echo "$!" > "$ROOT_DIR/.launcher-logs/business.pid"
  )
}

if ! check_url http://127.0.0.1:8787/api/health; then
  nohup "$PYTHON_BIN" platform_launcher.py --host 127.0.0.1 --port 8787 \
    > .launcher-logs/platform-launcher.log 2>&1 &
fi

wait_for_url http://127.0.0.1:8787/api/health "本地启动器"

curl -sS --fail --max-time 60 -X POST \
  http://127.0.0.1:8787/api/services/platform-web/start >/dev/null

start_bulk_service
start_business_service

wait_for_url http://127.0.0.1:3000 "1SME 平台前端"
wait_for_url http://127.0.0.1:8000/api/health "Bulk 表分析"
wait_for_url http://127.0.0.1:8501/_stcore/health "经营分析"
open http://127.0.0.1:3000 >/dev/null 2>&1 || true

echo "1SME 工具平台已启动："
echo "  平台首页: http://127.0.0.1:3000"
echo "  启动中心: http://127.0.0.1:8787/api/services"
echo ""
echo "你可以关闭这个窗口，服务会继续在后台运行。"
