#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
staging_dir="$(mktemp -d)"

restore_server_files() {
  if [[ -d "$staging_dir/api" ]]; then
    mv "$staging_dir/api" "$project_root/app/api"
  fi
  if [[ -f "$staging_dir/proxy.ts" ]]; then
    mv "$staging_dir/proxy.ts" "$project_root/proxy.ts"
  fi
  rm -rf "$staging_dir"
}

trap restore_server_files EXIT

if [[ -d "$project_root/app/api" ]]; then
  mv "$project_root/app/api" "$staging_dir/api"
fi
if [[ -f "$project_root/proxy.ts" ]]; then
  mv "$project_root/proxy.ts" "$staging_dir/proxy.ts"
fi

cd "$project_root"
GITHUB_ACTIONS=true pnpm build
