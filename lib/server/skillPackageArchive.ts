import { constants } from "node:buffer";
import { stat } from "node:fs/promises";
import { basename, dirname, relative, resolve, sep } from "node:path";
import { readdir, readFile } from "node:fs/promises";
import {
  TOOL_SKILL_PACKAGES,
  findToolSkillPackage,
  type ToolSkillPackage,
} from "../toolSkillPackages";

type ZipEntry = {
  path: string;
  data: Buffer;
  mode: number;
};

type WindowsSkillScripts = {
  install: string;
  run: string;
  verify: string;
};

export type ToolSkillPackageSummary = Omit<
  ToolSkillPackage,
  "installScript" | "runScript" | "verifyScript"
> & {
  sourceStatus: Array<{ path: string; exists: boolean }>;
  missingSourcePaths: string[];
};

const EXCLUDED_NAMES = new Set([
  ".DS_Store",
  ".git",
  ".mypy_cache",
  ".next",
  ".pnpm-store",
  ".pytest_cache",
  ".ruff_cache",
  ".venv",
  "__pycache__",
  "build",
  "dist",
  "node_modules",
  "out",
  "venv",
]);

const STANDALONE_PACKAGE_JSON = {
  private: true,
  scripts: {
    dev: "next dev",
    build: "next build",
    start: "next start",
  },
  dependencies: {
    next: "16.2.9",
    react: "19.2.7",
    "react-dom": "19.2.7",
  },
  devDependencies: {
    "@tailwindcss/postcss": "4.3.1",
    "@types/node": "^24.0.0",
    "@types/react": "19.2.17",
    "@types/react-dom": "^19.2.0",
    tailwindcss: "4.3.1",
    typescript: "^5.9.3",
  },
  packageManager: "pnpm@11.5.3",
};

export async function listToolSkillPackageSummaries(
  workspaceRoot = process.cwd(),
): Promise<ToolSkillPackageSummary[]> {
  return Promise.all(
    TOOL_SKILL_PACKAGES.map(async (toolPackage) => {
      const packagedSourcePaths = toolPackage.skillTemplatePath
        ? [toolPackage.skillTemplatePath, ...toolPackage.sourcePaths]
        : toolPackage.sourcePaths;
      const sourceStatus = await Promise.all(
        packagedSourcePaths.map(async (sourcePath) => ({
          path: sourcePath,
          exists: await pathExists(resolveWorkspacePath(workspaceRoot, sourcePath)),
        })),
      );
      const missingSourcePaths = sourceStatus
        .filter((item) => !item.exists)
        .map((item) => item.path);
      return {
        id: toolPackage.id,
        skillName: toolPackage.skillName,
        title: toolPackage.title,
        category: toolPackage.category,
        deployKind: toolPackage.deployKind,
        deployLabel: toolPackage.deployLabel,
        description: toolPackage.description,
        trigger: toolPackage.trigger,
        localUrl: toolPackage.localUrl,
        installTarget: toolPackage.installTarget,
        sourcePaths: toolPackage.sourcePaths,
        privacy: toolPackage.privacy,
        inputs: toolPackage.inputs,
        outputs: toolPackage.outputs,
        workflow: toolPackage.workflow,
        packageHighlights: toolPackage.packageHighlights,
        standaloneApp: toolPackage.standaloneApp,
        sourceStatus,
        missingSourcePaths,
      };
    }),
  );
}

export async function buildSingleSkillArchive(packageId: string, workspaceRoot = process.cwd()) {
  const toolPackage = findToolSkillPackage(packageId);
  if (!toolPackage) {
    throw new Error(`Unknown skill package: ${packageId}`);
  }

  const skillRoot = `skills/${toolPackage.skillName}`;
  const entries = await createSkillEntries(toolPackage, workspaceRoot, skillRoot);
  return {
    fileName: `${toolPackage.skillName}-one-click.zip`,
    data: buildZip([...createOneClickInstallerEntries([toolPackage.skillName]), ...entries]),
  };
}

export async function buildAllSkillArchive(workspaceRoot = process.cwd()) {
  const nestedEntries = await Promise.all(
    TOOL_SKILL_PACKAGES.map((toolPackage) =>
      createSkillEntries(toolPackage, workspaceRoot, `skills/${toolPackage.skillName}`),
    ),
  );
  return {
    fileName: "1sme-skills-one-click.zip",
    data: buildZip([
      ...createOneClickInstallerEntries(TOOL_SKILL_PACKAGES.map((item) => item.skillName)),
      ...nestedEntries.flat(),
    ]),
  };
}

function createOneClickInstallerEntries(skillNames: string[]): ZipEntry[] {
  return [
    {
      path: "双击安装到Codex.command",
      data: Buffer.from(renderMacInstaller(skillNames), "utf8"),
      mode: 0o100755,
    },
    {
      path: "双击安装到Codex-Windows.cmd",
      data: Buffer.from(renderWindowsInstaller(skillNames), "utf8"),
      mode: 0o100644,
    },
    {
      path: "安装说明.txt",
      data: Buffer.from(renderInstallReadme(skillNames.length), "utf8"),
      mode: 0o100644,
    },
  ];
}

function renderMacInstaller(skillNames: string[]) {
  const expectedSkills = skillNames.map(shellSingleQuote).join(" ");
  return normalizeScript(`#!/usr/bin/env bash
set -euo pipefail

PACKAGE_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$PACKAGE_DIR/skills"
CODEX_DIR="\${CODEX_HOME:-$HOME/.codex}"
TARGET_DIR="$CODEX_DIR/skills"
BACKUP_DIR="$CODEX_DIR/backups/1sme-$(date +%Y%m%d-%H%M%S)"
EXPECTED_SKILLS=(${expectedSkills})

show_message() {
  local title="$1"
  local message="$2"
  if command -v osascript >/dev/null 2>&1 && [[ -t 1 ]]; then
    osascript -e "display dialog \"$message\" with title \"$title\" buttons {\"好\"} default button \"好\"" >/dev/null 2>&1 || true
  fi
}

fail() {
  echo
  echo "安装失败：$1"
  show_message "安装失败" "$1"
  exit 1
}

[[ -d "$SOURCE_DIR" ]] || fail "安装包不完整，请重新下载并解压后再试。"
mkdir -p "$TARGET_DIR"

installed=0
for name in "\${EXPECTED_SKILLS[@]}"; do
  source_path="$SOURCE_DIR/$name"
  target_path="$TARGET_DIR/$name"
  [[ -d "$source_path" ]] || fail "缺少 $name，请重新下载安装包。"

  backup_path=""
  if [[ -e "$target_path" ]]; then
    mkdir -p "$BACKUP_DIR"
    backup_path="$BACKUP_DIR/$name"
    mv "$target_path" "$backup_path"
  fi

  if ! cp -R "$source_path" "$target_path"; then
    rm -rf "$target_path"
    if [[ -n "$backup_path" && -e "$backup_path" ]]; then
      mv "$backup_path" "$target_path"
    fi
    fail "$name 复制失败，原版本已恢复。"
  fi

  chmod +x "$target_path"/scripts/*.sh 2>/dev/null || true
  installed=$((installed + 1))
  echo "已安装：$name"
done

echo
echo "安装完成，共 $installed 个 Skill。"
echo "请重新打开 Codex 后使用。"
show_message "安装完成" "已安装 $installed 个 Skill。请重新打开 Codex 后使用。"
`);
}

function renderWindowsInstaller(skillNames: string[]) {
  const expectedSkills = skillNames.map((name) => `"${name}"`).join(" ");
  return `@echo off\r
setlocal EnableExtensions EnableDelayedExpansion\r
chcp 65001 >nul\r
title 1SME Skill 一键安装\r
\r
set "SOURCE_DIR=%~dp0skills"\r
if defined CODEX_HOME (\r
  set "CODEX_DIR=%CODEX_HOME%"\r
) else (\r
  set "CODEX_DIR=%USERPROFILE%\\.codex"\r
)\r
set "TARGET_DIR=%CODEX_DIR%\\skills"\r
set "BACKUP_DIR=%CODEX_DIR%\\backups\\1sme-%RANDOM%"\r
\r
if not exist "%SOURCE_DIR%" goto :broken\r
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"\r
if errorlevel 1 goto :failed\r
\r
set /a INSTALLED=0\r
for %%N in (${expectedSkills}) do (\r
  if not exist "%SOURCE_DIR%\\%%~N" goto :broken\r
  if exist "%TARGET_DIR%\\%%~N" (\r
    if not exist "!BACKUP_DIR!" mkdir "!BACKUP_DIR!"\r
    move "%TARGET_DIR%\\%%~N" "!BACKUP_DIR!\\%%~N" >nul\r
  )\r
  xcopy "%SOURCE_DIR%\\%%~N" "%TARGET_DIR%\\%%~N\\" /E /I /H /Y >nul\r
  if errorlevel 1 goto :failed\r
  set /a INSTALLED+=1\r
  echo 已安装：%%~N\r
)\r
\r
echo.\r
echo 安装完成，共 !INSTALLED! 个 Skill。\r
echo 请重新打开 Codex 后使用。\r
pause\r
exit /b 0\r
\r
:broken\r
echo 安装包不完整，请重新下载并解压后再试。\r
pause\r
exit /b 1\r
\r
:failed\r
echo 安装失败，请确认当前账号有写入权限后重试。\r
pause\r
exit /b 1\r
`;
}

function renderInstallReadme(skillCount: number) {
  return `1SME Skill 一键安装包

Windows 10/11：双击“双击安装到Codex-Windows.cmd”。
macOS：双击“双击安装到Codex.command”。

安装完成后重新打开 Codex 即可使用。
本安装包包含 ${skillCount} 个 Skill；更新时会先备份已有版本。
`;
}

function renderWindowsSkillScripts(toolPackage: ToolSkillPackage): WindowsSkillScripts {
  if (toolPackage.deployKind === "next-panel") {
    return renderNextPanelWindowsScripts(toolPackage.standaloneApp?.defaultPort ?? 3000);
  }

  if (toolPackage.deployKind === "fastapi") {
    return renderFastApiWindowsScripts("bulk-ad-diagnostic-generator", "api:app", 8000);
  }

  if (toolPackage.deployKind === "streamlit") {
    return renderStreamlitWindowsScripts("business-analysis", "app.py", 8501);
  }

  if (toolPackage.deployKind === "next-fastapi") {
    return renderNextFastApiWindowsScripts();
  }

  return {
    install: normalizePowerShell(`$ErrorActionPreference = "Stop"
$SkillDir = Split-Path -Parent $PSScriptRoot
Write-Host "Skill is ready at $SkillDir"
`),
    run: normalizePowerShell(`$ErrorActionPreference = "Stop"
Write-Host "This is a Codex workflow Skill. Open Codex and say:"
Write-Host "用 fang-business-diagnostic 分析这个 SKU / 父体 / 品线"
`),
    verify: normalizePowerShell(`$ErrorActionPreference = "Stop"
$SkillDir = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $SkillDir "SKILL.md"))) { throw "SKILL.md is missing." }
if (-not (Test-Path (Join-Path $SkillDir "agents/openai.yaml"))) { throw "agents/openai.yaml is missing." }
Write-Host "Skill structure is valid."
`),
  };
}

function renderNextPanelWindowsScripts(defaultPort: number): WindowsSkillScripts {
  return {
    install: normalizePowerShell(`$ErrorActionPreference = "Stop"
$SkillDir = Split-Path -Parent $PSScriptRoot
$SourceDir = Join-Path $SkillDir "assets/source"
Set-Location $SourceDir

if (Get-Command pnpm -ErrorAction SilentlyContinue) {
  & pnpm install
} elseif (Get-Command npm -ErrorAction SilentlyContinue) {
  & npm install
} else {
  throw "Node.js 20 or newer is required. Install it from https://nodejs.org and retry."
}
if ($LASTEXITCODE -ne 0) { throw "Dependency installation failed with exit code $LASTEXITCODE." }
`),
    run: normalizePowerShell(`param([int]$Port = 0)
$ErrorActionPreference = "Stop"
$SkillDir = Split-Path -Parent $PSScriptRoot
$SourceDir = Join-Path $SkillDir "assets/source"
if ($Port -le 0) { $Port = if ($env:PORT) { [int]$env:PORT } else { ${defaultPort} } }
Set-Location $SourceDir

if (Get-Command pnpm -ErrorAction SilentlyContinue) {
  & pnpm dev --hostname 127.0.0.1 --port $Port
} elseif (Get-Command npm -ErrorAction SilentlyContinue) {
  & npm run dev -- --hostname 127.0.0.1 --port $Port
} else {
  throw "Node.js 20 or newer is required. Install it from https://nodejs.org and retry."
}
exit $LASTEXITCODE
`),
    verify: normalizePowerShell(`$ErrorActionPreference = "Stop"
$SkillDir = Split-Path -Parent $PSScriptRoot
$SourceDir = Join-Path $SkillDir "assets/source"
Set-Location $SourceDir

if (Get-Command pnpm -ErrorAction SilentlyContinue) {
  & pnpm build
} elseif (Get-Command npm -ErrorAction SilentlyContinue) {
  & npm run build
} else {
  throw "Node.js 20 or newer is required. Install it from https://nodejs.org and retry."
}
if ($LASTEXITCODE -ne 0) { throw "Build verification failed with exit code $LASTEXITCODE." }
`),
  };
}

function renderFastApiWindowsScripts(sourceFolder: string, appTarget: string, defaultPort: number) {
  const sourceExpression = `Join-Path $SkillDir "assets/source/${sourceFolder}"`;
  return {
    install: normalizePowerShell(`$ErrorActionPreference = "Stop"
$SkillDir = Split-Path -Parent $PSScriptRoot
$SourceDir = ${sourceExpression}
Set-Location $SourceDir

if (Get-Command py -ErrorAction SilentlyContinue) {
  & py -3 -m venv .venv
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
  & python -m venv .venv
} else {
  throw "Python 3.10 or newer is required. Install it from https://python.org and retry."
}
if ($LASTEXITCODE -ne 0) { throw "Python environment creation failed with exit code $LASTEXITCODE." }

$VenvPython = Join-Path $SourceDir ".venv/Scripts/python.exe"
& $VenvPython -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) { throw "Python dependency installation failed with exit code $LASTEXITCODE." }
`),
    run: normalizePowerShell(`param([int]$Port = 0)
$ErrorActionPreference = "Stop"
$SkillDir = Split-Path -Parent $PSScriptRoot
$SourceDir = ${sourceExpression}
if ($Port -le 0) { $Port = if ($env:PORT) { [int]$env:PORT } else { ${defaultPort} } }
Set-Location $SourceDir
$VenvPython = Join-Path $SourceDir ".venv/Scripts/python.exe"
if (-not (Test-Path $VenvPython)) { throw "Run scripts/install.ps1 before starting the tool." }
& $VenvPython -m uvicorn ${appTarget} --host 127.0.0.1 --port $Port
exit $LASTEXITCODE
`),
    verify: normalizePowerShell(`$ErrorActionPreference = "Stop"
$SkillDir = Split-Path -Parent $PSScriptRoot
$SourceDir = ${sourceExpression}
$VenvPython = Join-Path $SourceDir ".venv/Scripts/python.exe"
if (-not (Test-Path $VenvPython)) { throw "Run scripts/install.ps1 before verification." }
Set-Location $SourceDir
& $VenvPython -m compileall .
if ($LASTEXITCODE -ne 0) { throw "Python verification failed with exit code $LASTEXITCODE." }
`),
  };
}

function renderStreamlitWindowsScripts(sourceFolder: string, appFile: string, defaultPort: number) {
  const scripts = renderFastApiWindowsScripts(sourceFolder, "unused:app", defaultPort);
  const sourceExpression = `Join-Path $SkillDir "assets/source/${sourceFolder}"`;
  return {
    ...scripts,
    run: normalizePowerShell(`param([int]$Port = 0)
$ErrorActionPreference = "Stop"
$SkillDir = Split-Path -Parent $PSScriptRoot
$SourceDir = ${sourceExpression}
if ($Port -le 0) { $Port = if ($env:PORT) { [int]$env:PORT } else { ${defaultPort} } }
Set-Location $SourceDir
$VenvPython = Join-Path $SourceDir ".venv/Scripts/python.exe"
if (-not (Test-Path $VenvPython)) { throw "Run scripts/install.ps1 before starting the tool." }
& $VenvPython -m streamlit run ${appFile} --server.address 127.0.0.1 --server.port $Port
exit $LASTEXITCODE
`),
  };
}

function renderNextFastApiWindowsScripts(): WindowsSkillScripts {
  return {
    install: normalizePowerShell(`$ErrorActionPreference = "Stop"
$SkillDir = Split-Path -Parent $PSScriptRoot
$Root = Join-Path $SkillDir "assets/source/amazon-title-optimizer"
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
Set-Location $Backend

if (Get-Command py -ErrorAction SilentlyContinue) {
  & py -3 -m venv .venv
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
  & python -m venv .venv
} else {
  throw "Python 3.10 or newer is required. Install it from https://python.org and retry."
}
if ($LASTEXITCODE -ne 0) { throw "Python environment creation failed with exit code $LASTEXITCODE." }
$VenvPython = Join-Path $Backend ".venv/Scripts/python.exe"
& $VenvPython -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) { throw "Python dependency installation failed with exit code $LASTEXITCODE." }

Set-Location $Frontend
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
  & pnpm install
} elseif (Get-Command npm -ErrorAction SilentlyContinue) {
  & npm install
} else {
  throw "Node.js 20 or newer is required. Install it from https://nodejs.org and retry."
}
if ($LASTEXITCODE -ne 0) { throw "Frontend dependency installation failed with exit code $LASTEXITCODE." }
`),
    run: normalizePowerShell(`param([int]$BackendPort = 0, [int]$FrontendPort = 0)
$ErrorActionPreference = "Stop"
$SkillDir = Split-Path -Parent $PSScriptRoot
$Root = Join-Path $SkillDir "assets/source/amazon-title-optimizer"
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
if ($BackendPort -le 0) { $BackendPort = if ($env:BACKEND_PORT) { [int]$env:BACKEND_PORT } else { 8010 } }
if ($FrontendPort -le 0) { $FrontendPort = if ($env:FRONTEND_PORT) { [int]$env:FRONTEND_PORT } else { 3010 } }
$VenvPython = Join-Path $Backend ".venv/Scripts/python.exe"
if (-not (Test-Path $VenvPython)) { throw "Run scripts/install.ps1 before starting the tool." }

$BackendProcess = Start-Process -FilePath $VenvPython -ArgumentList @("-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "$BackendPort") -WorkingDirectory $Backend -PassThru
$FrontendExitCode = 0
try {
  Set-Location $Frontend
  $env:NEXT_PUBLIC_API_BASE_URL = "http://127.0.0.1:$BackendPort"
  if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    & pnpm dev --hostname 127.0.0.1 --port $FrontendPort
  } elseif (Get-Command npm -ErrorAction SilentlyContinue) {
    & npm run dev -- --hostname 127.0.0.1 --port $FrontendPort
  } else {
    throw "Node.js 20 or newer is required. Install it from https://nodejs.org and retry."
  }
  $FrontendExitCode = $LASTEXITCODE
  if ($FrontendExitCode -ne 0) { throw "Frontend stopped with exit code $FrontendExitCode." }
} finally {
  if ($BackendProcess -and -not $BackendProcess.HasExited) {
    Stop-Process -Id $BackendProcess.Id -Force
  }
}
exit $FrontendExitCode
`),
    verify: normalizePowerShell(`$ErrorActionPreference = "Stop"
$SkillDir = Split-Path -Parent $PSScriptRoot
$Root = Join-Path $SkillDir "assets/source/amazon-title-optimizer"
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$VenvPython = Join-Path $Backend ".venv/Scripts/python.exe"
if (-not (Test-Path $VenvPython)) { throw "Run scripts/install.ps1 before verification." }
Set-Location $Backend
& $VenvPython -m compileall .
if ($LASTEXITCODE -ne 0) { throw "Backend verification failed with exit code $LASTEXITCODE." }

Set-Location $Frontend
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
  & pnpm build
} elseif (Get-Command npm -ErrorAction SilentlyContinue) {
  & npm run build
} else {
  throw "Node.js 20 or newer is required. Install it from https://nodejs.org and retry."
}
if ($LASTEXITCODE -ne 0) { throw "Frontend verification failed with exit code $LASTEXITCODE." }
`),
  };
}

async function createSkillEntries(
  toolPackage: ToolSkillPackage,
  workspaceRoot: string,
  rootFolder: string,
) {
  const entries = new Map<string, ZipEntry>();
  const addText = (entryPath: string, content: string, mode = 0o100644) => {
    addEntry(entries, {
      path: `${rootFolder}/${entryPath}`,
      data: Buffer.from(content, "utf8"),
      mode,
    });
  };

  addText("SKILL.md", renderSkillMarkdown(toolPackage));
  addText("agents/openai.yaml", renderOpenAiYaml(toolPackage));
  addText("references/local-deploy.md", renderLocalDeployReference(toolPackage));
  addText("scripts/install.sh", normalizeScript(toolPackage.installScript), 0o100755);
  addText("scripts/run.sh", normalizeScript(toolPackage.runScript), 0o100755);
  addText("scripts/verify.sh", normalizeScript(toolPackage.verifyScript), 0o100755);
  const windowsScripts = renderWindowsSkillScripts(toolPackage);
  addText("scripts/install.ps1", windowsScripts.install);
  addText("scripts/run.ps1", windowsScripts.run);
  addText("scripts/verify.ps1", windowsScripts.verify);

  if (toolPackage.skillTemplatePath) {
    const absoluteTemplatePath = resolveWorkspacePath(
      workspaceRoot,
      toolPackage.skillTemplatePath,
    );
    if (!(await pathExists(absoluteTemplatePath))) {
      throw new Error(`Missing Skill template: ${toolPackage.skillTemplatePath}`);
    }
    await collectEntries(entries, {
      absolutePath: absoluteTemplatePath,
      workspaceRoot,
      destinationRoot: rootFolder,
      sourceRootName: toolPackage.skillTemplatePath,
      stripSourceRoot: true,
    });
  }

  if (toolPackage.standaloneApp) {
    addStandaloneAppScaffold(entries, toolPackage, rootFolder);
    await copySourcePaths(entries, workspaceRoot, rootFolder, toolPackage, "assets/source");
  } else if (toolPackage.deployKind === "skill-only") {
    await copySkillOnlySource(entries, workspaceRoot, rootFolder, toolPackage);
  } else {
    await copySourcePaths(entries, workspaceRoot, rootFolder, toolPackage, "assets/source");
  }

  return Array.from(entries.values()).sort((a, b) => a.path.localeCompare(b.path));
}

function addStandaloneAppScaffold(
  entries: Map<string, ZipEntry>,
  toolPackage: ToolSkillPackage,
  rootFolder: string,
) {
  const app = toolPackage.standaloneApp;
  if (!app) return;

  const addText = (entryPath: string, content: string, mode = 0o100644) => {
    addEntry(entries, {
      path: `${rootFolder}/assets/source/${entryPath}`,
      data: Buffer.from(content, "utf8"),
      mode,
    });
  };

  addText(
    "package.json",
    `${JSON.stringify(
      {
        ...STANDALONE_PACKAGE_JSON,
        name: `${toolPackage.skillName}-local-app`,
        dependencies: {
          ...STANDALONE_PACKAGE_JSON.dependencies,
          ...app.dependencies,
        },
        devDependencies: {
          ...STANDALONE_PACKAGE_JSON.devDependencies,
          ...app.devDependencies,
        },
      },
      null,
      2,
    )}\n`,
  );
  const serverExternalPackages = app.serverExternalPackages ?? [];
  addText(
    "next.config.ts",
    `import type { NextConfig } from "next";\n\nconst nextConfig: NextConfig = ${JSON.stringify(
      serverExternalPackages.length > 0 ? { serverExternalPackages } : {},
      null,
      2,
    )};\n\nexport default nextConfig;\n`,
  );
  addText("postcss.config.mjs", `const config = { plugins: { "@tailwindcss/postcss": {} } };\n\nexport default config;\n`);
  addText(
    "tsconfig.json",
    `${JSON.stringify(
      {
        compilerOptions: {
          target: "ES2017",
          lib: ["dom", "dom.iterable", "esnext"],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: "esnext",
          moduleResolution: "bundler",
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: "react-jsx",
          incremental: true,
          plugins: [{ name: "next" }],
          paths: {
            "@/*": ["./*"],
          },
        },
        include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
        exclude: ["node_modules"],
      },
      null,
      2,
    )}\n`,
  );
  addText("next-env.d.ts", `/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n\n// This file is generated by Next.js.\n`);
  addText("app/globals.css", renderStandaloneGlobals());
  addText("app/layout.tsx", renderStandaloneLayout(toolPackage));
  addText("app/page.tsx", renderStandalonePage(toolPackage));
}

async function copySourcePaths(
  entries: Map<string, ZipEntry>,
  workspaceRoot: string,
  rootFolder: string,
  toolPackage: ToolSkillPackage,
  destinationPrefix: string,
) {
  for (const sourcePath of toolPackage.sourcePaths) {
    const absolutePath = resolveWorkspacePath(workspaceRoot, sourcePath);
    if (!(await pathExists(absolutePath))) continue;
    await collectEntries(entries, {
      absolutePath,
      workspaceRoot,
      destinationRoot: `${rootFolder}/${destinationPrefix}`,
      sourceRootName: sourcePath,
    });
  }
}

async function copySkillOnlySource(
  entries: Map<string, ZipEntry>,
  workspaceRoot: string,
  rootFolder: string,
  toolPackage: ToolSkillPackage,
) {
  const primarySkillPath = toolPackage.sourcePaths.find((sourcePath) =>
    sourcePath.endsWith(`/${toolPackage.skillName}`),
  );
  if (!primarySkillPath) {
    await copySourcePaths(entries, workspaceRoot, rootFolder, toolPackage, "assets/source");
    return;
  }

  const absolutePath = resolveWorkspacePath(workspaceRoot, primarySkillPath);
  if (!(await pathExists(absolutePath))) return;
  await collectEntries(entries, {
    absolutePath,
    workspaceRoot,
    destinationRoot: rootFolder,
    sourceRootName: primarySkillPath,
    stripSourceRoot: true,
  });
}

async function collectEntries(
  entries: Map<string, ZipEntry>,
  options: {
    absolutePath: string;
    workspaceRoot: string;
    destinationRoot: string;
    sourceRootName: string;
    stripSourceRoot?: boolean;
  },
) {
  const sourceStat = await stat(options.absolutePath);
  const sourceBase = sourceStat.isDirectory() ? options.absolutePath : dirname(options.absolutePath);
  const rootRelativeName = normalizeZipPath(options.sourceRootName);

  async function walk(currentPath: string) {
    const currentName = basename(currentPath);
    if (EXCLUDED_NAMES.has(currentName)) return;

    const currentStat = await stat(currentPath);
    if (currentStat.isDirectory()) {
      const children = await readdir(currentPath);
      await Promise.all(children.map((child) => walk(resolve(currentPath, child))));
      return;
    }

    if (!currentStat.isFile()) return;

    const relativeToSource = sourceStat.isDirectory()
      ? relative(sourceBase, currentPath)
      : basename(currentPath);
    const destinationRelative = options.stripSourceRoot
      ? relativeToSource
      : `${rootRelativeName}${sourceStat.isDirectory() ? `/${relativeToSource}` : ""}`;
    const destinationPath = normalizeZipPath(`${options.destinationRoot}/${destinationRelative}`);
    const data = await readFile(currentPath);

    addEntry(entries, {
      path: destinationPath,
      data,
      mode: currentStat.mode & 0o111 ? 0o100755 : 0o100644,
    });
  }

  await walk(options.absolutePath);
}

function renderSkillMarkdown(toolPackage: ToolSkillPackage) {
  return `---
name: ${toolPackage.skillName}
description: Use when a user wants to run, install, package, or locally deploy ${toolPackage.title}; ${toolPackage.description}
---

# ${toolPackage.title}

This Skill packages the local deployment workflow for ${toolPackage.title}.

## Default Stance

${toolPackage.privacy}

Prefer local processing first. Ask before sending user files, credentials, ad data, inventory data, Listing drafts, or Feishu document content to any hosted service.

## Included Source

Bundled source lives in \`assets/source\` unless this is a Skill-only package. Read \`references/local-deploy.md\` for the exact source layout, runtime assumptions, ports, and verification commands.

## Local Deployment

On macOS or Linux, run from this Skill folder:

\`\`\`bash
scripts/install.sh
scripts/run.sh
\`\`\`

On Windows, use PowerShell:

\`\`\`powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\install.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\run.ps1
\`\`\`

Default local URL:

\`\`\`text
${toolPackage.localUrl ?? "Codex Skill only; no web server is required."}
\`\`\`

## Workflow

${toolPackage.workflow.map((item, index) => `${index + 1}. ${item}`).join("\n")}

## Inputs

${toolPackage.inputs.map((item) => `- ${item}`).join("\n")}

## Outputs

${toolPackage.outputs.map((item) => `- ${item}`).join("\n")}

## Verification

On macOS or Linux, run:

\`\`\`bash
scripts/verify.sh
\`\`\`

On Windows, run:

\`\`\`powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\verify.ps1
\`\`\`
`;
}

function renderOpenAiYaml(toolPackage: ToolSkillPackage) {
  return `interface:
  display_name: "${escapeYamlString(toolPackage.title)}"
  short_description: "${escapeYamlString(toolPackage.description)}"
  default_prompt: "${escapeYamlString(`Use $${toolPackage.skillName} to ${toolPackage.trigger}`)}"
`;
}

function renderLocalDeployReference(toolPackage: ToolSkillPackage) {
  const envNotes = toolPackage.standaloneApp?.envNotes ?? [];
  return `# Local Deployment Reference

## Install Target

\`\`\`text
macOS/Linux: ${toolPackage.installTarget}
Windows: %USERPROFILE%\\.codex\\skills\\${toolPackage.skillName}
\`\`\`

## Source Paths

${toolPackage.sourcePaths.map((sourcePath) => `- \`${sourcePath}\``).join("\n")}

## Package Contents

${toolPackage.packageHighlights.map((item) => `- ${item}`).join("\n")}

## Deployment Type

\`\`\`text
${toolPackage.deployLabel}
\`\`\`

## macOS/Linux Commands

Install dependencies:

\`\`\`bash
scripts/install.sh
\`\`\`

Run locally:

\`\`\`bash
scripts/run.sh
\`\`\`

Verify:

\`\`\`bash
scripts/verify.sh
\`\`\`

## Windows Commands

Install dependencies:

\`\`\`powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\install.ps1
\`\`\`

Run locally:

\`\`\`powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\run.ps1
\`\`\`

Verify:

\`\`\`powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\verify.ps1
\`\`\`

${toolPackage.localUrl ? `Default URL:\n\n\`\`\`text\n${toolPackage.localUrl}\n\`\`\`\n` : ""}
${envNotes.length > 0 ? `## Environment Notes\n\n${envNotes.map((item) => `- ${item}`).join("\n")}\n` : ""}
## Workflow

${toolPackage.workflow.map((item, index) => `${index + 1}. ${item}`).join("\n")}
`;
}

function renderStandaloneLayout(toolPackage: ToolSkillPackage) {
  return `import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "${escapeTsString(toolPackage.title)}",
  description: "${escapeTsString(toolPackage.description)}",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
`;
}

function renderStandalonePage(toolPackage: ToolSkillPackage) {
  const app = toolPackage.standaloneApp;
  if (!app) throw new Error("Missing standalone app config");

  return `"use client";

import { ${app.componentName} } from "${app.componentPath}";

export default function Page() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 max-w-4xl sm:mb-10">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-teal-700">
            <span className="h-px w-8 bg-teal-500" />
            {${JSON.stringify(app.eyebrow)}}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
            {${JSON.stringify(app.title)}}
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
            {${JSON.stringify(app.description)}}
          </p>
        </header>
        <${app.componentName} />
      </div>
    </main>
  );
}
`;
}

function renderStandaloneGlobals() {
  return `@import "tailwindcss";

:root {
  --background: #f5f7fa;
  --foreground: #14213d;
}

* {
  box-sizing: border-box;
}

html {
  background: var(--background);
}

body {
  min-height: 100vh;
  margin: 0;
  color: var(--foreground);
  background:
    radial-gradient(circle at 12% 0%, rgba(20, 184, 166, 0.09), transparent 28rem),
    linear-gradient(180deg, #fbfcfd 0%, var(--background) 24rem);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
    "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

button,
input,
select,
textarea {
  font: inherit;
}

button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 3px solid rgba(13, 148, 136, 0.2);
  outline-offset: 2px;
}

::selection {
  color: #0f3d3a;
  background: #ccfbf1;
}
`;
}

function buildZip(entries: ZipEntry[]) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  const { dosDate, dosTime } = getDosDateTime(new Date());

  for (const entry of entries) {
    const name = Buffer.from(normalizeZipPath(entry.path), "utf8");
    const data = entry.data;
    if (name.length > 0xffff) throw new Error(`Zip path is too long: ${entry.path}`);
    if (data.length > constants.MAX_LENGTH) throw new Error(`Zip entry is too large: ${entry.path}`);

    const crc = crc32(data);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, name, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(0x031e, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(((entry.mode & 0xffff) << 16) >>> 0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, name);

    offset += localHeader.length + name.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

function crc32(data: Buffer) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[i] = value >>> 0;
  }
  return table;
})();

function getDosDateTime(date: Date) {
  const year = Math.max(date.getFullYear(), 1980);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  return { dosDate, dosTime };
}

function addEntry(entries: Map<string, ZipEntry>, entry: ZipEntry) {
  entries.set(normalizeZipPath(entry.path), {
    ...entry,
    path: normalizeZipPath(entry.path),
  });
}

function normalizeZipPath(value: string) {
  return value.split(sep).join("/").replace(/^\/+/, "").replace(/\/+/g, "/");
}

function resolveWorkspacePath(workspaceRoot: string, sourcePath: string) {
  const resolved = resolve(workspaceRoot, sourcePath);
  const root = resolve(workspaceRoot);
  if (resolved !== root && !resolved.startsWith(`${root}${sep}`)) {
    throw new Error(`Source path escapes workspace: ${sourcePath}`);
  }
  return resolved;
}

async function pathExists(path: string) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function normalizeScript(script: string) {
  return script.trimEnd() + "\n";
}

function normalizePowerShell(script: string) {
  return script.trimEnd().replace(/\r?\n/g, "\r\n") + "\r\n";
}

function escapeYamlString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ");
}

function escapeTsString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function shellSingleQuote(value: string) {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}
