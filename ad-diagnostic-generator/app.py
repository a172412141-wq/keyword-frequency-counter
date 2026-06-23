from __future__ import annotations

import streamlit as st

from generator import (
    InputValidationError,
    generate_diagnostic_workbook,
    parent_options,
    read_bulk_input,
    safe_filename,
)


st.set_page_config(
    page_title="Amazon 广告诊断表生成器",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown(
    """
    <style>
    .block-container {max-width: 1120px; padding-top: 2.5rem; padding-bottom: 4rem;}
    [data-testid="stMetric"] {background: #f8fafc; border: 1px solid #e2e8f0; padding: 1rem; border-radius: 14px;}
    .hero {padding: 1.5rem 0 .75rem;}
    .hero-kicker {color:#0f766e; font-size:.82rem; font-weight:700; letter-spacing:.12em;}
    .hero h1 {font-size:2.35rem; line-height:1.15; margin:.55rem 0 .7rem; color:#0f172a;}
    .hero p {font-size:1.05rem; line-height:1.75; color:#475569; max-width:780px;}
    .privacy {background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0; padding:.85rem 1rem; border-radius:12px;}
    </style>
    <section class="hero">
      <div class="hero-kicker">AMAZON ADS · BULK DIAGNOSTICS</div>
      <h1>广告诊断表生成器</h1>
      <p>上传 Amazon Ads Bulk，多选 ASIN、SKU 或广告活动，即可生成保留模板样式、公式、筛选和图表的 8-Sheet 诊断工作簿。</p>
    </section>
    <div class="privacy">🔒 文件只在当前应用会话中处理，不会写入数据库。建议部署在你自己的 Streamlit Cloud 或本机。</div>
    """,
    unsafe_allow_html=True,
)

st.write("")
uploaded = st.file_uploader("1. 上传 Amazon Ads Bulk", type=["xlsx"], help="支持 Amazon 控制台导出的标准多工作表 Bulk，也兼容旧单表文件。")

if not uploaded:
    st.info("上传文件后，工具会先校验字段，再显示可选父体。")
    with st.expander("需要哪些字段？"):
        st.markdown(
            "- 必需：`Entity`、`Impressions`、`Clicks`、`Spend`、`Sales`、`Orders`\n"
            "- 父体识别：ASIN、SKU、Campaign Name、Ad Group Name 至少一个\n"
            "- 搜索词来源：优先读取 SP Search Term Report；旧单表可使用 Customer Search Term、Keyword Text 或 Product Targeting Expression"
        )
    st.stop()

try:
    raw_bytes = uploaded.getvalue()
    bulk = read_bulk_input(raw_bytes)
    options = parent_options(bulk)
except InputValidationError as exc:
    st.error(str(exc))
    st.stop()
except Exception as exc:  # pragma: no cover - UI safety net
    st.error(f"文件读取失败：{exc}")
    st.stop()

left, middle, right, fourth = st.columns(4)
left.metric("主数据表", bulk.sheet_name)
middle.metric("Campaign 行", f"{len(bulk.rows):,}")
right.metric("搜索词行", f"{len(bulk.search_term_rows):,}")
fourth.metric("Portfolio 行", f"{len(bulk.portfolio_rows):,}")

field_labels = {
    "ASIN (Informational only)": "ASIN（优先）",
    "SKU": "SKU",
    "Campaign Name": "Campaign Name",
    "Campaign Name (Informational only)": "Campaign Name（信息列）",
    "Ad Group Name": "Ad Group Name",
    "Ad Group Name (Informational only)": "Ad Group Name（信息列）",
}
available_fields = list(options)
selected_field = st.selectbox(
    "2. 选择父体识别字段",
    available_fields,
    format_func=lambda value: f"{field_labels.get(value, value)} · {len(options[value])} 个值",
)
selected_values = st.multiselect(
    "3. 选择要合并生成诊断表的父体 / 产品组",
    options[selected_field],
    default=options[selected_field][:1],
)

st.caption("支持多选；Campaign / Ad Group 使用包含匹配，ASIN / SKU 使用精确匹配。")

if st.button("生成广告诊断表", type="primary", use_container_width=True):
    try:
        with st.spinner("正在筛选数据、重建公式并打包 Excel…"):
            output, stats = generate_diagnostic_workbook(bulk, selected_field, selected_values)
        st.success("诊断表已生成。")
        cols = st.columns(4)
        cols[0].metric("筛选行", f"{stats.filtered_rows:,}")
        cols[1].metric("广告位行", f"{stats.bidding_rows:,}")
        cols[2].metric("搜索词", f"{stats.search_terms:,}")
        cols[3].metric("广告组合", f"{stats.portfolios:,}")
        st.download_button(
            "下载生成的 Excel",
            data=output,
            file_name=safe_filename(
                selected_values[0] if len(selected_values) == 1 else f"{selected_values[0]}_等{len(selected_values)}项"
            ),
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            type="primary",
            use_container_width=True,
        )
    except InputValidationError as exc:
        st.error(str(exc))
    except Exception as exc:  # pragma: no cover - UI safety net
        st.error(f"生成失败：{exc}")

with st.expander("生成内容与限制"):
    st.markdown(
        """
        - 自动生成：广告组合预算、Bulk、BidingAdjustment、广告位可视化、搜索词模板、两张词频分析、否词库。
        - 标准 Bulk 包含 Portfolios 时，会自动填入预算类型、组合预算和起止日期；旧单表缺失时标记为 `N/A`。
        - Excel 公式设置为打开文件时自动重算；首次打开后请等待 Excel/WPS 完成计算。
        """
    )
