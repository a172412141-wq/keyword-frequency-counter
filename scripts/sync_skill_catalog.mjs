import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDirectory, "..");
const userHome = homedir();
const outputPath = join(workspaceRoot, "data", "skill-catalog.generated.json");
const configPath = join(workspaceRoot, "config", "skill-publish.json");
const force = process.argv.includes("--force");

if (process.env.GITHUB_ACTIONS === "true" && !force) {
  console.log("Using the committed Skill catalog snapshot in GitHub Actions.");
  process.exit(0);
}

const roots = [
  {
    directory: join(workspaceRoot, "skills"),
    source: "workspace",
    pathPrefix: "skills",
    skipHidden: true,
  },
  {
    directory: join(userHome, ".codex", "skills"),
    source: "personal",
    pathPrefix: "~/.codex/skills",
    skipHidden: true,
  },
  {
    directory: join(userHome, ".agents", "skills"),
    source: "personal",
    pathPrefix: "~/.agents/skills",
    skipHidden: true,
  },
  {
    directory: join(userHome, ".codex", "skills", ".system"),
    source: "system",
    pathPrefix: "~/.codex/skills/.system",
    skipHidden: true,
  },
];

const allowedFrontmatterKeys = new Set([
  "allowed-tools",
  "description",
  "license",
  "metadata",
  "name",
]);

const publishConfig = existsSync(configPath)
  ? JSON.parse(readFileSync(configPath, "utf8"))
  : { exclude: [] };
const excludedNames = new Set(publishConfig.exclude ?? []);

function listSkillFiles(root) {
  if (!existsSync(root.directory)) return [];
  const files = [];

  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (root.skipHidden && entry.name.startsWith(".") && directory === root.directory) {
        continue;
      }
      const absolutePath = join(directory, entry.name);
      if (entry.isDirectory()) visit(absolutePath);
      if (entry.isFile() && entry.name === "SKILL.md") files.push(absolutePath);
    }
  }

  visit(root.directory);
  return files.sort();
}

function cleanScalar(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    if (trimmed.startsWith('"')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return trimmed.slice(1, -1);
      }
    }
    return trimmed.slice(1, -1).replaceAll("''", "'");
  }
  return trimmed;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
  if (!match) return { values: {}, keys: [], error: "缺少 YAML frontmatter" };

  const lines = match[1].split(/\r?\n/);
  const values = {};
  const keys = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const field = line.match(/^([^\s:#][^:]*):(?:\s*(.*))?$/);
    if (!field) continue;
    const key = field[1].trim();
    const rawValue = field[2] ?? "";
    keys.push(key);

    if (/^[>|][+-]?$/.test(rawValue.trim())) {
      const blockLines = [];
      while (index + 1 < lines.length && /^\s+/.test(lines[index + 1])) {
        index += 1;
        blockLines.push(lines[index].trim());
      }
      values[key] = rawValue.trim().startsWith(">")
        ? blockLines.join(" ")
        : blockLines.join("\n");
    } else {
      values[key] = cleanScalar(rawValue);
    }
  }

  return { values, keys, error: null };
}

function categoryFor(name, source) {
  if (source === "system") return "system";
  if (name.startsWith("lark-")) return "collaboration";
  if (
    name.includes("perspective") ||
    name === "huashu-nuwa" ||
    name === "x-mastery-mentor"
  ) {
    return "perspective";
  }
  if (name.includes("amazon") || name.includes("listing")) return "amazon";
  if (name.includes("fang") || name.includes("warehouse")) return "business";
  return "system";
}

function readinessFor(name) {
  if (name === "amazon-review-analyzer" || name === "fang-weekly-doc-reader") {
    return "hosted";
  }
  if (name.startsWith("lark-") || name === "datawarehouse-schema-explorer") {
    return "needs_config";
  }
  return "ready";
}

function requirementFor(name) {
  if (name.startsWith("lark-") || name === "fang-weekly-doc-reader") {
    return "需要安装并登录 lark-cli，且具备目标飞书资源的访问权限。";
  }
  if (name === "datawarehouse-schema-explorer") {
    return "需要连接 wb-data-mcp 只读服务。";
  }
  return undefined;
}

function publicPath(root, filePath) {
  const relativeDirectory = relative(root.directory, dirname(filePath)).split(sep).join("/");
  return relativeDirectory ? `${root.pathPrefix}/${relativeDirectory}` : root.pathPrefix;
}

const candidates = [];
for (const root of roots) {
  for (const filePath of listSkillFiles(root)) {
    const content = readFileSync(filePath, "utf8");
    const frontmatter = parseFrontmatter(content);
    const name = frontmatter.values.name?.trim();
    const description = frontmatter.values.description?.replace(/\s+/g, " ").trim();
    const issues = [];

    if (frontmatter.error) issues.push(frontmatter.error);
    if (!name) issues.push("缺少 name");
    if (!description) issues.push("缺少 description");
    if (name && (!/^[a-z0-9-]+$/.test(name) || name.length > 64)) {
      issues.push("name 不符合小写字母、数字和连字符规范");
    }
    const unsupportedKeys = frontmatter.keys.filter(
      (key) => !allowedFrontmatterKeys.has(key),
    );
    if (unsupportedKeys.length > 0) {
      issues.push(`frontmatter 含扩展字段：${unsupportedKeys.join("、")}`);
    }

    candidates.push({
      name,
      description,
      source: root.source,
      pathHint: publicPath(root, filePath),
      modifiedAt: statSync(filePath).mtime,
      issues,
    });
  }
}

const validCandidates = candidates.filter((candidate) => candidate.name && candidate.description);
const selectedByName = new Map();
for (const candidate of validCandidates) {
  if (!selectedByName.has(candidate.name)) selectedByName.set(candidate.name, candidate);
}

const selected = [...selectedByName.values()].filter(
  (candidate) => !excludedNames.has(candidate.name),
);
const skills = selected
  .map((candidate) => {
    const requirement = requirementFor(candidate.name);
    return {
      name: candidate.name,
      category: categoryFor(candidate.name, candidate.source),
      source: candidate.source,
      readiness: readinessFor(candidate.name),
      validation: candidate.issues.length === 0 ? "valid" : "warning",
      description: candidate.description,
      trigger: `请使用 $${candidate.name} 帮我完成这个任务`,
      ...(requirement ? { requirement } : {}),
      pathHint: candidate.pathHint,
      ...(candidate.issues.length > 0
        ? { validationNote: candidate.issues.join("；") }
        : {}),
    };
  })
  .sort((left, right) => left.name.localeCompare(right.name, "en"));

const newestSourceTime = selected.reduce(
  (newest, candidate) => Math.max(newest, candidate.modifiedAt.getTime()),
  0,
);
const warningSkills = skills.filter((skill) => skill.validation === "warning").length;
const snapshot = {
  generatedAt: newestSourceTime ? new Date(newestSourceTime).toISOString() : null,
  summary: {
    filesScanned: candidates.length,
    uniqueSkills: selectedByName.size,
    publishedSkills: skills.length,
    duplicateFiles: validCandidates.length - selectedByName.size,
    excludedSkills: selectedByName.size - skills.length,
    validSkills: skills.length - warningSkills,
    warningSkills,
  },
  skills,
};

writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
console.log(
  `Published ${snapshot.summary.publishedSkills} unique Skills from ${snapshot.summary.filesScanned} files ` +
    `(${snapshot.summary.duplicateFiles} duplicates, ${snapshot.summary.warningSkills} warnings).`,
);
