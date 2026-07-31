---
name: fang-weekly-doc-reader
description: 读取飞书 Fang/BBY 周会文档并沉淀经营学习。Use when the user asks to 看周会、读取飞书周会文档、整理周会内容、更新 Fang weekly learning、提取 SKU/父体/品线/平台/库存/补货/KPI/扩品相关周会规则。
---

# Fang Weekly Doc Reader

## Operating Rule

Use this skill for Feishu/Lark weekly-review documents. The hosted panel in the 1SME platform reads the doc with `lark-cli`, archives raw content locally, and extracts Fang operating signals.

Before turning meeting notes into advice, apply the Fang stage lens: first identify whether the object is in `0-10`, `10-30`, `30-60`, or `60-100`; then judge KPI, red lines, and actions.

## Platform Tool

Open `http://127.0.0.1:3000`, choose `周会文档`, then either search recent Feishu docs or paste a doc URL/token.

The web tool writes archives to `skills/fang-weekly-doc-reader/weekly-meetings/`.

## Output Shape

- `阶段判断`: meeting-stage signal or unknown.
- `本次会议要点`: factual meeting bullets.
- `KPI 与红线`: profit, stockout, returns, inventory, cash flow, replenishment, expansion.
- `动作信号`: optimize, replenish, pause, expand, clean up, stop loss.
- `可沉淀规则`: reusable learning candidates.
- `待复验`: one-off observations.

Do not promote one-off observations into stable Fang rules without repeated evidence or explicit user confirmation.
