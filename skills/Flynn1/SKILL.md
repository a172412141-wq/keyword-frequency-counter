---
name: Flynn1
description: Use when a user wants the 1SME local tool platform workflow for Amazon Ads Bulk diagnostics, visible progress display, efficient local-only deployment, or packaging/running the Bulk analysis service without uploading private files.
---

# Flynn1

Flynn1 is the local-first 1SME workflow for Amazon Ads Bulk diagnostics.

Use this skill when the user asks to:

- run Bulk 表分析 locally
- add or verify progress display for Bulk analysis
- deploy the 1SME platform locally with high efficiency
- keep Amazon Ads Bulk files private on the user's machine
- generate the 8-sheet advertising diagnostic workbook from a Bulk `.xlsx`

## Default stance

Process Amazon Ads Bulk files locally by default. These files can include private campaign, SKU, ASIN, spend, sales, and search term data.

Do not upload user files to hosted services unless the user explicitly approves hosted processing.

## Local deployment

Preferred one-click startup from the workspace root:

```bash
./启动1SME工具平台.command
```

Then open:

```text
http://127.0.0.1:3000
```

Use the Admin page to start local services:

```text
http://127.0.0.1:3000/admin
```

Default local services:

```text
1SME platform:     http://127.0.0.1:3000
Local launcher:   http://127.0.0.1:8787
Bulk FastAPI app: http://127.0.0.1:8000
Business app:     http://127.0.0.1:8501
```

The launcher must stay local. Do not expose port `8787` publicly.

## Manual local startup

Use these commands when the one-click launcher is unavailable:

```bash
pnpm dev --hostname 127.0.0.1 --port 3000
```

```bash
python3 platform_launcher.py --host 127.0.0.1 --port 8787
```

```bash
cd bulk-ad-diagnostic-generator
./.venv/bin/uvicorn api:app --host 127.0.0.1 --port 8000
```

## Efficiency rules

- Keep Bulk processing on `127.0.0.1` for fastest upload/download on a local machine.
- Reuse `/api/analyze` before `/api/generate`; the analyze response returns `cache_key`.
- Send `cache_key` to `/api/generate` so the FastAPI process reuses the parsed workbook.
- Prefer one Bulk FastAPI process for desktop use. A single process keeps the in-memory cache hot and avoids duplicating large Excel objects across workers.
- Use hosted Render only as a convenience fallback, not for private or large files.

## Progress display expectations

The Bulk web app should show a modal progress card during long operations.

Required stages:

```text
上传
读取校验
生成工作簿
准备下载
```

Expected frontend elements:

- `#loading-overlay`
- `#progress-stage`
- `#progress-percent`
- `#progress-fill`
- `#progress-steps`

Expected behavior:

- Analyze starts at upload, advances through read/validation, and finishes before showing field selection.
- Generate starts with selected filters, advances through filtering/workbook generation, and finishes before triggering download.
- If the cache expires, the UI should tell the user it is rereading the Bulk file and continue.

## Workbook workflow

1. Upload a `.xlsx` Amazon Ads Bulk file.
2. Click `读取并校验 Bulk`.
3. Choose one filter field:
   - `ASIN (Informational only)`
   - `SKU`
   - `Campaign Name`
   - `Campaign Name (Informational only)`
   - `Ad Group Name`
   - `Ad Group Name (Informational only)`
   - `Portfolio Name (Informational only)`
   - `Portfolio ID`
4. Select one or more values.
5. Choose formula mode:
   - `formulas` for editable formulas
   - `values` for static values
6. Generate the 8-sheet diagnostic workbook.

Expected workbook sheets:

```text
广告组合预算
Bulk
BidingAdjustment
广告位可视化
搜索词模板
词频分析(全部搜索词）
词频分析 (不出单搜素词)
否词库
```

## Verification checklist

Run from the workspace root:

```bash
pnpm test
pnpm lint
pnpm build
```

Run for the Bulk FastAPI app:

```bash
cd bulk-ad-diagnostic-generator
./.venv/bin/python -m pytest -q
node --check frontend/app.js
```

For visual checks, open `http://127.0.0.1:3000`, switch to `Bulk表分析`, use the sample file, and confirm the progress card appears during analyze and generate.
