# 关键词词频统计

一个在浏览器本地运行的英文关键词词频统计工具。输入多行关键词组，即可获得词根、出现次数和占比，并支持复制 TSV 或导出带 UTF-8 BOM 的 CSV。

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

- `lib/wordFrequency.ts`：清洗、拆词、词频统计、占比与排序
- `lib/export.ts`：TSV 复制内容与 CSV 文件生成
- `components/`：输入、摘要、操作按钮与结果表格
- `app/page.tsx`：页面状态与组件组合

如需修改标点清理规则，请调整 `lib/wordFrequency.ts` 中的 `PUNCTUATION_REGEX`。

后续扩展 Amazon Listing 分析时，可在保持当前精确统计口径的基础上，增加字段分区（标题、五点、Search Terms）、重复覆盖提醒和按字段筛选；不要直接改变现有统计函数的默认规则。
