---
name: amazon-review-analyzer
description: 批量采集、清洗并分析 Amazon ASIN 评论，为每个 ASIN 生成独立 ZIP，内含中文 PDF、可编辑 Word、Markdown、评论 CSV、指标 JSON 和产品机会 CSV。Use when the user asks to analyze Amazon reviews, import ASINs in batches, identify review pain points or product opportunities, export review reports, or locally deploy/package the Amazon review analysis tool.
---

# Amazon 评论批量分析

## Workflow

1. Normalize ASINs from pasted text, Amazon URLs, CSV, or TXT input.
2. Remove duplicates and keep at most 20 ASINs per batch.
3. Select a collection mode:
   - `basic`: use one review window for a fast preview.
   - `full`: collect one window per star rating; use this by default.
   - `max`: collect star-rating and sort combinations for broader coverage.
4. Process ASINs sequentially so each ASIN receives its own status and download.
5. Produce one ZIP per ASIN containing PDF, DOCX, Markdown, CSV, JSON, opportunity CSV, and manifest files.
6. Report collection warnings explicitly. Never convert an upstream request failure into a false zero-review result.

## Analysis Rules

- Treat the collected reviews as a stratified sample, not the product's true rating distribution.
- Interpret theme percentages only within their corresponding low-, three-, or high-star segment.
- Prioritize low-star themes by frequency, then provide representative excerpts and concrete product actions.
- Preserve original review text in CSV while using concise excerpts in narrative reports.
- Keep all user-provided ASIN lists and generated reports local unless the user explicitly requests sharing or hosted deployment.

## Local Tool

Use the bundled Next.js application in `assets/source` when the task requires batch input, progress tracking, or downloadable report packages.

Read `references/local-deploy.md` before installing, starting, verifying, or troubleshooting the local application.

## Expected Outputs

For every successful ASIN, return an independent ZIP with:

- Chinese business-brief PDF report
- Editable Word `.docx` report with embedded Chinese font subset
- Markdown analysis report
- Normalized full-review CSV
- Metrics and theme JSON
- Product-opportunity CSV
- Manifest and collection warnings

## Validation

Before handing off a packaged or modified version:

1. Validate this Skill with the Skill Creator validator.
2. Install dependencies for the bundled source.
3. Run automated tests and a production build.
4. Generate at least one real or fixture-based ASIN package.
5. Check ZIP integrity and confirm both PDF and DOCX entries exist.
