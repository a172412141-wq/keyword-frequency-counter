# Amazon 广告诊断表生成器

上传 Amazon Ads Bulk `.xlsx`，选择 ASIN、SKU、Campaign 或 Ad Group 后，生成一份保留原模板结构、样式、筛选、冻结窗格、公式和图表的广告诊断工作簿。

## 功能

- 自动识别标准多工作表 Bulk 中的 `Sponsored Products Campaigns`、`SP Search Term Report` 和 `Portfolios`，同时兼容旧单表文件。
- 兼容 Amazon 导出文件错误声明工作表尺寸为 `A1:A1` 的情况。
- 在生成前校验核心指标、父体识别字段和搜索词来源字段，并按 Campaign / Ad Group 关联搜索词。
- 支持多选 ASIN / SKU 精确筛选，以及多选 Campaign / Ad Group 包含筛选。
- 生成 8 个模板 Sheet，并重建 Bulk、广告位、搜索词、词频和广告组合数据。
- 公式使用实际数据范围，避免模板中的超大整列引用。
- 输出文件名：`广告诊断表_{父体}_{日期}.xlsx`。
- 内置模板已移除真实广告数据和外部链接。

## 本地运行

```bash
cd ad-diagnostic-generator
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn api:app --reload --host 127.0.0.1 --port 8000
```

浏览器打开 `http://127.0.0.1:8000`。前端与 Excel 生成 API 由同一个 FastAPI 服务提供，无需额外启动前端工程。

如需使用 Streamlit 版本：

```bash
streamlit run app.py
```

## 测试

```bash
pip install -r requirements-dev.txt
pytest -q
```

## 前端与 API

- `frontend/index.html`：上传、选择父体、下载结果的完整交互页面。
- `frontend/styles.css`：响应式视觉样式。
- `frontend/app.js`：文件校验、API 请求、筛选和下载逻辑。
- `frontend/sample-bulk.xlsx`：可在首页直接载入的合成示例数据。
- `api.py`：提供 `/api/analyze`、`/api/generate`、`/api/health`。

API 文档运行后可在 `http://127.0.0.1:8000/api/docs` 查看。

## 部署到 Streamlit Community Cloud（备选）

1. 在 Streamlit Community Cloud 中选择本 GitHub 仓库。
2. Main file path 填写 `ad-diagnostic-generator/app.py`。
3. Python 版本建议选择 3.11 或 3.12。
4. 不需要环境变量或外部数据库。

## 数据与限制

- 文件在内存中处理，不写入数据库。
- 标准 Bulk 包含 `Portfolios` 时会自动填入预算类型、组合预算和起止日期；缺失的单表文件标记为 `N/A`。
- 输出不包含 `LX_Asin`、`NicheWord`、`NicheAsin` 和 `H1F广告架构`。
- 公式由 Excel/WPS 在首次打开时自动重算。

## 模板维护

仓库中的 `assets/广告诊断表_空白模板.xlsx` 是脱敏模板。若需要基于新的私有模板重建：

```bash
python scripts/build_clean_template.py /path/to/private-template.xlsx
```

脚本会删除动态业务数据、外部链接和不兼容的图表外部数据引用，再输出可安全发布的空白模板。
