# Local Deployment Reference

## Prerequisites

- Node.js 20 or newer
- npm or pnpm
- Internet access while installing dependencies and collecting public review data
- A CJK-capable system font. The app checks common macOS, Windows, and Linux font locations.

## Install the Codex Skill

After downloading and extracting the one-click ZIP:

- On macOS, double-click `双击安装到Codex.command`.
- On Windows 10/11, double-click `双击安装到Codex-Windows.cmd`.

The installer copies the Skill to:

```text
macOS/Linux: ~/.codex/skills/amazon-review-analyzer
Windows: %USERPROFILE%\.codex\skills\amazon-review-analyzer
```

Existing installations are moved into a timestamped backup before replacement.

## Install Application Dependencies

Run these commands from the installed Skill directory.

macOS/Linux:

```bash
scripts/install.sh
```

Windows PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

## Start the Local Application

macOS/Linux:

```bash
PORT=3011 scripts/run.sh
```

Windows PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run.ps1 -Port 3011
```

Open:

```text
http://127.0.0.1:3011
```

Use another free port when `3011` is already occupied.

## Verify

macOS/Linux:

```bash
scripts/verify.sh
```

Windows PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify.ps1
```

Verification performs a production Next.js build. For a functional check, submit one valid ASIN in `basic` or `full` mode and confirm the downloaded ZIP contains `.pdf` and `.docx` reports.

## Runtime Notes

- Review collection uses the public Woot/Amazon review endpoint configured in the bundled server source.
- The service binds to `127.0.0.1` by default and is not exposed to the public internet.
- PDF and Word generation require a CJK-capable font. Install Microsoft YaHei, SimSun, Arial Unicode MS, Noto Sans CJK, or WenQuanYi Zen Hei if startup reports that no supported font is available.
- The `full` mode is the recommended balance between coverage and collection time.
