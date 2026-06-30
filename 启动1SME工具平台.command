#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

CODEX_RUNTIME="/Users/1sme/.cache/codex-runtimes/codex-primary-runtime/dependencies"
NODE_BIN="$CODEX_RUNTIME/node/bin"
CODEX_BIN="$CODEX_RUNTIME/bin"
PYTHON_BIN="$CODEX_RUNTIME/python/bin/python3"
PNPM_BIN="$CODEX_BIN/pnpm"

if [ ! -x "$PYTHON_BIN" ]; then
  PYTHON_BIN="python3"
fi

if [ ! -x "$PNPM_BIN" ]; then
  PNPM_BIN="pnpm"
fi

mkdir -p .launcher-logs

if ! curl -sS http://127.0.0.1:8787/api/health >/dev/null 2>&1; then
  nohup "$PYTHON_BIN" platform_launcher.py --host 127.0.0.1 --port 8787 \
    > .launcher-logs/platform-launcher.log 2>&1 &
fi

if ! curl -sS http://127.0.0.1:3000 >/dev/null 2>&1; then
  PATH="$NODE_BIN:$CODEX_BIN:$PATH" nohup "$PNPM_BIN" dev --hostname 127.0.0.1 --port 3000 \
    > .launcher-logs/platform-next.log 2>&1 &
fi

sleep 2
open http://127.0.0.1:3000 >/dev/null 2>&1 || true

echo "1SME 工具平台已启动："
echo "  平台首页: http://127.0.0.1:3000"
echo "  启动中心: http://127.0.0.1:8787/api/services"
echo ""
echo "你可以关闭这个窗口，服务会继续在后台运行。"
