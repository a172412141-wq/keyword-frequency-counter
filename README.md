# 亚马逊关键词工具箱

一个在浏览器本地运行的亚马逊关键词工具站，当前包含：

- **关键词词频统计**：任意组合输出单词根、双词根和三词根的出现次数与占比。
- **组合关键词工具**：自动清洗关键词、识别 1–4 gram 词根、归一同义词、过滤冲突，并按精准 / 扩展 / 全量模式生成关键词。
- **我的词根规则库**：把人工修正保存为本地规则，支持新增、编辑、删除，以及 JSON 导入导出备份。

两个工具都支持复制结果和导出带 UTF-8 BOM 的 CSV，输入内容不会上传。

在线使用：[关键词词频统计](https://a172412141-wq.github.io/keyword-frequency-counter/)

## 本地运行

```bash
pnpm install
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 质量检查

```bash
pnpm test
pnpm lint
pnpm build
```

## 部署到 Vercel

将项目推送到 GitHub 后，在 Vercel 导入仓库即可。框架选择 Next.js，构建命令使用 `pnpm build`，无需配置环境变量。

仓库同时配置了 GitHub Pages 自动部署。推送到 `main` 分支后，GitHub Actions 会运行测试、构建静态站点并更新在线版本。

## 代码结构

- `lib/wordFrequency.ts`：清洗、拆词、单/双/三词根统计、占比与排序
- `lib/export.ts`：TSV 复制内容与 CSV 文件生成
- `lib/keywordNormalizer.ts`：组合工具的输入清洗和常见变体统一
- `lib/rootExtractor.ts`：词根提取、分类、短语覆盖和置信度
- `lib/rootRules.ts`：用户规则校验、持久化格式和人工修正转换
- `lib/synonymRules.ts`：可扩展的同义词组与 canonical root 规则
- `lib/conflictRules.ts`：同义、尺寸、颜色、材质和场景冲突检查
- `lib/combinationGenerator.ts`：受控组合、去重、排序和数量保护
- `components/`：两个工具的输入、设置、词根表格与结果组件
- `app/page.tsx`：同站点工具切换与页面组合

如需修改标点清理规则，请调整 `lib/wordFrequency.ts` 中的 `PUNCTUATION_REGEX`。

组合工具的类目词典集中在 `lib/keywordConfig.ts`。后续扩展其他 Amazon 类目时可追加短语、同义词和默认冲突组，不需要改动组合生成主流程。用户在页面中保存的规则会覆盖默认判断，并保存在当前浏览器的 `localStorage`；可通过 JSON 导出进行定期备份和跨设备迁移。

后续可以接入 Brand Analytics、广告转化数据或多语言规则，但当前版本不依赖后端、数据库、账号或外部 API。
