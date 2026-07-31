# 1SME 工具平台

一个把常用 1SME 工具和 Codex Skill 入口放到同一平台的本地工具站，当前包含：

- **Skill Hub**：集中浏览个人 Skill、系统 Skill 和平台工具入口。
- **Skill 封装**：为平台工具生成同时支持 Windows 与 macOS 的 Codex Skill 一键安装 ZIP。
- **Fang 经营关系诊断模型**：按经营阶段判断 SKU、父体、品线和新平台项目，输出红线检查与阶段化动作。
- **周会经营快速诊断**：粘贴飞书 Fang/BBY 周会文档链接，自动读取并归档内容，按 Fang 阶段模型输出主矛盾、KPI 错位、经营关系、六类红线、立即动作和升级/止损条件。
- **Listing 文案合规优化**：支持单条和 Excel 批量处理标题、五点、A+，旁边展示新版标题准则、优化流程和老版 Listing 文案建议沉淀。
- **ASIN 批量评论分析**：粘贴 Excel 单列或导入 CSV/TXT，逐个采集和分析书面评论，并为每个 ASIN 生成含 PDF、Word、CSV、JSON 的独立 ZIP 分析包。
- **经营分析**：内嵌 Amazon 库存利润经营分析工具。
- **关键词词频统计**：任意组合输出单词根、双词根和三词根的出现次数与占比。
- **组合关键词工具**：自动清洗关键词、识别 1–4 gram 词根、归一同义词、过滤冲突，并按精准 / 扩展 / 全量模式生成关键词。
- **我的词根规则库**：把人工修正保存为本地规则，支持新增、编辑、删除，以及 JSON 导入导出备份。

关键词工具都支持复制结果和导出带 UTF-8 BOM 的 CSV。默认本地服务模式下，上传文件只在本机进程内处理。

管理员页面在 `/admin`，本地默认账号是 `admin@1sme.local`，默认密码是 `1sme-admin`。上线前请更换环境变量，并使用 Cloudflare Access 做公网账号放行。

## 本地运行

```bash
pnpm install
pnpm dev:local
```

打开 [http://localhost:3000](http://localhost:3000)。

日常使用推荐双击稳定入口，它会启动本地启动器，并由启动器用生产模式托管平台前端：

```bash
./启动1SME工具平台.command
```

本地启动器 API 默认运行在 `http://127.0.0.1:8787`，只建议本机使用。前端、Listing 优化和经营分析服务可以在平台里的“本地工具启动中心”统一启动、检查和重启。

## 环境变量

```bash
NEXT_PUBLIC_ADMIN_EMAIL=your-email@example.com
NEXT_PUBLIC_ADMIN_PASSWORD_SHA256=你的密码SHA256
ADMIN_BASIC_USER=your-email@example.com
ADMIN_BASIC_PASSWORD=强密码
NEXT_PUBLIC_TITLE_OPTIMIZER_API_URL=http://127.0.0.1:8010
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

如果只部署静态工具，Vercel / GitHub Pages 可直接使用。若要把经营分析和管理员页面一起公网化，优先使用 Cloudflare Tunnel + Cloudflare Access，并按邮箱限制 `/admin`。

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
- `components/AmazonReviewBatchPanel.tsx`：ASIN 批量导入、任务队列和独立分析包下载
- `lib/server/amazonReviewAnalyzer.ts`：评论采集、去重、主题分析和报告生成
- `lib/server/reviewReportDocuments.ts`：PDF 与 Word 商务简报生成器
- `app/api/review-analysis/[asin]/route.ts`：单个 ASIN 的 ZIP 分析包接口
- `amazon-title-optimizer/`：Amazon Listing 标题、五点和 A+ 合规批量优化 FastAPI 后端和独立 Next 前端
- `app/page.tsx`：统一工具平台首页
- `app/admin/page.tsx`：管理员页面
- `proxy.ts`：可选的 `/admin` 服务端 Basic Auth
- `platform_launcher.py`：本地工具启动器 API
- `skills/fang-business-diagnostic/SKILL.md`：Fang 经营关系诊断与阶段管理 Skill
- `skills/fang-weekly-doc-reader/SKILL.md`：飞书周会文档读取与 Fang 周会沉淀 Skill
- `skills/amazon-review-analyzer/SKILL.md`：Amazon 评论批量分析、报告输出和本地部署 Skill
- `docs/local-deploy.md`：高效率本地部署说明
- `docs/zero-cost-deploy.md`：0 成本公网部署建议
- `docs/knowledge/amazon-ads-bulk-analysis-essence.md`：已下线 Bulk 工具留下的数据口径、诊断框架和工程经验

如需修改标点清理规则，请调整 `lib/wordFrequency.ts` 中的 `PUNCTUATION_REGEX`。

组合工具的类目词典集中在 `lib/keywordConfig.ts`。后续扩展其他 Amazon 类目时可追加短语、同义词和默认冲突组，不需要改动组合生成主流程。用户在页面中保存的规则会覆盖默认判断，并保存在当前浏览器的 `localStorage`；可通过 JSON 导出进行定期备份和跨设备迁移。

后续可以接入 Brand Analytics、广告转化数据或多语言规则，但当前版本不依赖后端、数据库、账号或外部 API。
