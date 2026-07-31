import { describe, expect, it } from "vitest";
import { diagnoseFangWeeklyDoc } from "./fangWeeklyDiagnostic";

describe("diagnoseFangWeeklyDoc", () => {
  it("prioritizes an explicit stage and detects red lines", () => {
    const diagnosis = diagnoseFangWeeklyDoc(`
      当前阶段 10-30
      GMV 本周增长 20%
      主 SKU 预计 7 天内断货
      退货率稳定
      贡献毛利为正
    `);

    expect(diagnosis.stage).toBe("10-30");
    expect(diagnosis.confidence).toBe("高");
    expect(diagnosis.redLineChecks.find((item) => item.category === "缺货")?.level).toBe("红线");
    expect(diagnosis.immediateActions.join(" ")).toContain("补货");
    expect(diagnosis.kpiMismatch.join(" ")).toContain("GMV");
  });

  it("keeps unknown data explicit instead of inventing a stage", () => {
    const diagnosis = diagnoseFangWeeklyDoc("本周讨论了团队分工和下周负责人。");
    expect(diagnosis.stage).toBe("未明确");
    expect(diagnosis.missingData).toContain("真实贡献毛利");
    expect(diagnosis.redLineChecks.every((item) => item.level === "待确认")).toBe(true);
  });
});
