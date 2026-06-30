---
name: fang-business-diagnostic
description: Fang 经营关系诊断模型 V0.2。用于分析 SKU、父体、品线、小类目或新平台项目的经营阶段、SKU 角色、关系结构、库存/利润/现金流红线，并输出阶段化管理动作。Use when the user mentions Fang 经营模型、经营关系诊断、阶段管理引擎、SKU 诊断、父体诊断、品线诊断、扩品判断、止损判断、库存周转红线、真实贡献毛利、0-10/10-30/30-60/60-100 阶段。
---

# Fang 经营关系诊断模型

## Operating Rule

Always diagnose stage before judging performance. Do not use one KPI set for all businesses.

For any SKU, parent, product line, small category, or platform project:

1. Identify the current stage: `0-10`, `10-30`, `30-60`, or `60-100`.
2. Judge whether the active KPI matches that stage.
3. Classify SKU roles when SKU-level data exists: traffic SKU, main SKU, profit SKU, low-efficiency/abnormal SKU.
4. Compare relationships across parent, product line, size, price band, inventory, ads, profit, and cash cycle.
5. Run red-line checks before recommending any expansion.
6. Output actions as continue, optimize, pause replenishment, accelerate replenishment, expand related SKU, or stop-loss.

## Required Reference

Read `references/model-v0.2.md` before producing a full diagnosis, stage transition decision, red-line judgment, or operating action plan. Use it as the source of truth for stage KPI, forbidden actions, entry conditions, and Fang red-line rules.

## Output Shape

Prefer a concise operator-facing structure:

- `阶段判断`: current stage, evidence, and uncertainty.
- `主矛盾`: the one problem this stage must solve.
- `KPI 是否错位`: which metrics are being over-weighted or ignored.
- `关系诊断`: SKU/parent/product-line relationship findings.
- `红线检查`: profit, stockout, returns, inventory, cash flow, and expansion red lines.
- `动作建议`: immediate actions, weekly checks, and forbidden actions.
- `升级/止损条件`: what must be true before moving to the next stage or exiting.

If the user provides incomplete data, make the missing fields explicit and give a provisional diagnosis. Do not invent exact sales, margin, inventory, return, or cash-flow figures.
