# 1SME 工具平台

一个把常用 1SME 工具和 Codex Skill 入口放到同一平台的本地工具站，当前包含：

- **Skill Hub**：集中浏览个人 Skill、系统 Skill 和平台工具入口。
- **Flynn1 Skill**：本地优先的 Bulk 表分析工作流，覆盖进度显示、高效率本地部署和隐私保护。
- **Fang 经营关系诊断模型**：按经营阶段判断 SKU、父体、品线和新平台项目，输出红线检查与阶段化动作。
- **Bulk 表分析**：内嵌 Amazon Ads Bulk 诊断表生成器，支持本地服务和托管备用服务切换。
- **经营分析**：内嵌 Amazon 库存利润经营分析工具。
- **关键词词频统计**：任意组合输出单词根、双词根和三词根的出现次数与占比。
- **组合关键词工具**：自动清洗关键词、识别 1–4 gram 词根、归一同义词、过滤冲突，并按精准 / 扩展 / 全量模式生成关键词。
- **我的词根规则库**：把人工修正保存为本地规则，支持新增、编辑、删除，以及 JSON 导入导出备份。

关键词工具都支持复制结果和导出带 UTF-8 BOM 的 CSV。默认本地服务模式下，上传文件只在本机进程内处理。

管理员页面在 `/admin`，本地默认账号是 `admin@1sme.local`，默认密码是 `1sme-admin`。上线前请更换环境变量，并使用 Cloudflare Access 做公网账号放行。

## 本地运行

```bash
pnpm install
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000)。

如果要同时启动平台、本地启动器和可用的本地服务，可以双击：

```bash
./启动1SME工具平台.command
```

本地启动器 API 默认运行在 `http://127.0.0.1:8787`，只建议本机使用。

## 环境变量

```bash
NEXT_PUBLIC_ADMIN_EMAIL=your-email@example.com
NEXT_PUBLIC_ADMIN_PASSWORD_SHA256=你的密码SHA256
ADMIN_BASIC_USER=your-email@example.com
ADMIN_BASIC_PASSWORD=强密码
NEXT_PUBLIC_BULK_LOCAL_URL=http://127.0.0.1:8000/
NEXT_PUBLIC_BUSINESS_ANALYSIS_URL=http://127.0.0.1:8501/
NEXT_PUBLIC_LAUNCHER_URL=http://127.0.0.1:8787
```

生成 SHA256：

```bash
node -e "const crypto=require('crypto'); console.log(crypto.createHash('sha256').update('你的密码').digest('hex'))"
```

本地高效率部署见 [docs/local-deploy.md](docs/local-deploy.md)；0 成本公网部署方案见 [docs/zero-cost-deploy.md](docs/zero-cost-deploy.md)。

## 质量检查

```bash
pnpm test
pnpm lint
pnpm build
```

## 部署

如果只部署静态关键词工具，Vercel / GitHub Pages 仍然可用。若要把 Bulk 表分析、经营分析和管理员页面一起公网化，优先使用 Cloudflare Tunnel + Cloudflare Access，避免免费容器冷启动，也能按你的邮箱限制 `/admin`。

## 代码结构

- `lib/wordFrequency.ts`：清洗、拆词、单/双/三词根统计、占比与排序
- `lib/export.ts`：TSV 复制内容与 CSV 文件生成
- `lib/keywordNormalizer.ts`：组合工具的输入清洗和常见变体统一
- `lib/rootExtractor.ts`：词根提取、分类、短语覆盖和置信度
- `lib/rootRules.ts`：用户规则校验、持久化格式和人工修正转换
- `lib/synonymRules.ts`：可扩展的同义词组与 canonical root 规则
- `lib/conflictRules.ts`：同义、尺寸、颜色、材质和场景冲突检查
- `lib/combinationGenerator.ts`：受控组合、去重、排序和数量保护
- `components/`：平台模块、关键词工具、内嵌服务和管理员组件
- `app/page.tsx`：统一工具平台首页
- `app/admin/page.tsx`：管理员页面
- `proxy.ts`：可选的 `/admin` 服务端 Basic Auth
- `platform_launcher.py`：本地工具启动器 API
- `skills/Flynn1/SKILL.md`：本地优先 Bulk 表分析工作流 Skill
- `skills/fang-business-diagnostic/SKILL.md`：Fang 经营关系诊断与阶段管理 Skill
- `docs/local-deploy.md`：高效率本地部署说明
- `docs/zero-cost-deploy.md`：0 成本公网部署建议

如需修改标点清理规则，请调整 `lib/wordFrequency.ts` 中的 `PUNCTUATION_REGEX`。

组合工具的类目词典集中在 `lib/keywordConfig.ts`。后续扩展其他 Amazon 类目时可追加短语、同义词和默认冲突组，不需要改动组合生成主流程。用户在页面中保存的规则会覆盖默认判断，并保存在当前浏览器的 `localStorage`；可通过 JSON 导出进行定期备份和跨设备迁移。

后续可以接入 Brand Analytics、广告转化数据或多语言规则，但当前版本不依赖后端、数据库、账号或外部 API。
