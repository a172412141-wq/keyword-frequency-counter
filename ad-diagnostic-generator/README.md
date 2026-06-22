# Amazon 广告诊断表生成器

上传 Amazon Ads Bulk `.xlsx`，选择 ASIN、SKU、Campaign 或 Ad Group 后，生成一份保留原模板结构、样式、筛选、冻结窗格、公式和图表的广告诊断工作簿。

## 功能

- 自动识别表头位于第 1 行或第 14 行的 Bulk 文件。
- 在生成前校验核心指标、父体识别字段和搜索词来源字段。
- 按 ASIN / SKU 精确筛选，按 Campaign / Ad Group 包含筛选。
- 生成 12 个模板 Sheet，并重建 Bulk、广告位、搜索词、词频、广告组合和 ASIN-SKU 数据。
- 公式使用实际数据范围，避免模板中的超大整列引用。
- 输出文件名：`广告诊断表_{父体}_{日期}.xlsx`。
- 内置模板已移除真实广告数据和外部链接。

## 本地运行

```bash
cd ad-diagnostic-generator
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
streamlit run app.py
```

浏览器打开 `http://localhost:8501`。

## 测试

```bash
pip install -r requirements-dev.txt
pytest -q
```

## 部署到 Streamlit Community Cloud

1. 在 Streamlit Community Cloud 中选择本 GitHub 仓库。
2. Main file path 填写 `ad-diagnostic-generator/app.py`。
3. Python 版本建议选择 3.11 或 3.12。
4. 不需要环境变量或外部数据库。

## 数据与限制

- 文件在内存中处理，不写入数据库。
- Bulk 无法完整提供 Portfolio 预算类型、组合预算和起止日期，因此这些字段标记为 `N/A`。
- NicheWord / NicheAsin 需要 ABA 或 Opportunity Explorer 数据，仅凭 Bulk 无法生成，当前保留空模板结构。
- 公式由 Excel/WPS 在首次打开时自动重算。

## 模板维护

仓库中的 `assets/广告诊断表_空白模板.xlsx` 是脱敏模板。若需要基于新的私有模板重建：

```bash
python scripts/build_clean_template.py /path/to/private-template.xlsx
```

脚本会删除动态业务数据、外部链接和不兼容的图表外部数据引用，再输出可安全发布的空白模板。
