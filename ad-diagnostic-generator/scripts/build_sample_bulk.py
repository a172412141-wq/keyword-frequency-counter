from __future__ import annotations

from pathlib import Path

from openpyxl import Workbook


OUTPUT = Path(__file__).parents[1] / "frontend" / "sample-bulk.xlsx"


def build_sample(output: Path = OUTPUT) -> Path:
    headers = [
        "Product", "Entity", "Campaign ID", "Campaign Name (Informational only)",
        "Ad Group Name (Informational only)", "Portfolio Name (Informational only)",
        "SKU", "ASIN (Informational only)", "Match Type", "Placement",
        "Product Targeting Expression", "Keyword Text", "Customer Search Term",
        "Impressions", "Clicks", "Spend", "Sales", "Orders",
    ]
    rows = [
        [
            "Sponsored Products", "Keyword", "DEMO-1001", "Demo Carry-on Phrase", "Demo Group A",
            "Demo Portfolio", "DEMO-SKU-A", "B0DEMO0001", "Phrase", None, None,
            "carry on luggage", "carry on luggage", 12500, 315, 264.4, 1189.5, 17,
        ],
        [
            "Sponsored Products", "Keyword", "DEMO-1001", "Demo Carry-on Phrase", "Demo Group A",
            "Demo Portfolio", "DEMO-SKU-A", "B0DEMO0001", "Phrase", None, None,
            "lightweight suitcase", "lightweight suitcase", 6800, 142, 113.7, 424.0, 6,
        ],
        [
            "Sponsored Products", "Keyword", "DEMO-1001", "Demo Carry-on Phrase", "Demo Group A",
            "Demo Portfolio", "DEMO-SKU-A", "B0DEMO0001", "Exact", None, None,
            "luggage with wheels", "luggage with wheels", 3100, 61, 58.2, 0, 0,
        ],
        [
            "Sponsored Products", "Bidding Adjustment", "DEMO-1001", "Demo Carry-on Phrase", None,
            "Demo Portfolio", None, None, None, "Placement Top", None, None, None,
            8900, 228, 205.6, 1012.0, 15,
        ],
        [
            "Sponsored Products", "Bidding Adjustment", "DEMO-1001", "Demo Carry-on Phrase", None,
            "Demo Portfolio", None, None, None, "Placement Product Page", None, None, None,
            5200, 96, 81.3, 302.0, 4,
        ],
    ]
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Bulk"
    sheet.append(headers)
    for row in rows:
        sheet.append(row)
    sheet.freeze_panes = "A2"
    sheet.auto_filter.ref = f"A1:R{len(rows) + 1}"
    output.parent.mkdir(parents=True, exist_ok=True)
    workbook.save(output)
    return output


if __name__ == "__main__":
    print(build_sample())
