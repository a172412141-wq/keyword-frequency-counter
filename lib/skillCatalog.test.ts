import { describe, expect, it } from "vitest";
import { SKILL_CATALOG, SKILL_CATALOG_AUDIT } from "./skillCatalog";

describe("Skill catalog", () => {
  it("publishes every deduplicated scanned Skill by default", () => {
    expect(SKILL_CATALOG_AUDIT.summary.excludedSkills).toBe(0);
    expect(SKILL_CATALOG_AUDIT.summary.publishedSkills).toBe(
      SKILL_CATALOG_AUDIT.summary.uniqueSkills,
    );
  });

  it("contains unique, public-safe catalog entries", () => {
    const names = SKILL_CATALOG.map((skill) => skill.name);
    expect(new Set(names).size).toBe(names.length);

    for (const skill of SKILL_CATALOG) {
      expect(skill.description.trim()).not.toBe("");
      expect(skill.trigger).toContain(skill.name);
      expect(skill.pathHint).not.toContain("/Users/");
    }
  });

  it("keeps validation warnings visible instead of silently dropping Skills", () => {
    const warnings = SKILL_CATALOG.filter((skill) => skill.validation === "warning");
    expect(warnings).toHaveLength(SKILL_CATALOG_AUDIT.summary.warningSkills);
    expect(warnings.every((skill) => Boolean(skill.validationNote))).toBe(true);
  });
});
