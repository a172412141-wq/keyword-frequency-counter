#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

CODEX_RUNTIME="/Users/1sme/.cache/codex-runtimes/codex-primary-runtime/dependencies"
NODE_BIN="$CODEX_RUNTIME/node/bin"
CODEX_BIN="$CODEX_RUNTIME/bin"
PNPM_BIN="$CODEX_BIN/pnpm"

if [ ! -x "$PNPM_BIN" ]; then
  PNPM_BIN="$(command -v pnpm || true)"
fi

if [ -z "${PNPM_BIN:-}" ]; then
  echo "pnpm not found. Run pnpm install first or install pnpm on this Mac." >&2
  exit 1
fi

export PATH="$NODE_BIN:$CODEX_BIN:$PATH"

if [ ! -d "$ROOT_DIR/.next/server" ] || [ -z "$(find "$ROOT_DIR/.next/server" -type f -print -quit)" ]; then
  echo "Production build not found. Run pnpm build before starting the stable platform service." >&2
  exit 1
fi

exec "$ROOT_DIR/node_modules/.bin/next" start --hostname 127.0.0.1 --port 3000
