from __future__ import annotations

import re
from collections import Counter
from typing import Any

from optimizer import build_title_components, optimize_title
from skill_engine import (
    BANNED_MARKETING_WORDS,
    INVALID_SYMBOL_RE,
    WORD_RE,
    analyze_title,
    get_product_type,
    normalize_space,
    phrase_pattern,
)


MAX_BULLETS = 5
MAX_BULLET_LENGTH = 220

OLD_LISTING_GUIDANCE = {
    "bullets": [
        "优先覆盖大流量词和头部卖点关键词",
        "五点控制在 5 条内，每条先讲卖点再讲场景或收益",
        "表达要美式、简洁、可读，避免堆砌和硬塞词",
        "用参数、材质、尺寸、兼容性、包装等信息支撑卖点",
        "长尾词可以自然埋入五点，不牺牲语义通顺",
    ],
    "aplus": [
        "A+ 重点服务转化，不承担关键词堆砌任务",
        "结构优先：品牌故事、产品概述、核心卖点、规格参数、包装/FAQ",
        "产品是什么、独特之处、适用场景和优势要清楚",
        "长尾词要自然出现，避免最低价、促销、绝对化承诺",
    ],
}

LOW_VALUE_WORDS = {
    "best",
    "top",
    "perfect",
    "amazing",
    "premium",
    "quality",
    "great",
    "excellent",
    "nice",
    "super",
    "ultra",
}

BENEFIT_LABELS = [
    "Core Benefit",
    "Everyday Use",
    "Key Feature",
    "Fit & Details",
    "What You Get",
]


def build_listing_result(
    title: str,
    brand: str = "",
    category: str = "",
    bullets: list[str] | None = None,
    aplus_content: str = "",
) -> dict[str, Any]:
    clean_title = normalize_space(title)
    clean_brand = normalize_space(brand)
    clean_category = normalize_space(category)
    clean_bullets = [normalize_space(bullet) for bullet in bullets or [] if normalize_space(bullet)]
    clean_aplus = normalize_space(aplus_content)

    title_issues = analyze_title(clean_title, clean_brand, clean_category)
    title_components = build_title_components(clean_title, clean_brand, clean_category)
    optimized_title = optimize_title(clean_title, clean_brand, clean_category)
    title_fields = {"title": optimized_title, **title_components}
    bullet_result = optimize_bullets(clean_title, clean_brand, clean_category, clean_bullets, title_components)
    aplus_result = optimize_aplus_layout(
        clean_title,
        clean_brand,
        clean_category,
        bullet_result["optimized_bullets"],
        clean_aplus,
        title_components,
    )

    return {
        "original_title": clean_title,
        "optimized_title": optimized_title,
        "title_fields": title_fields,
        "title_status": "FAIL" if title_issues else "PASS",
        "title_issues": title_issues,
        "optimized_bullets": bullet_result["optimized_bullets"],
        "bullet_status": "FAIL" if bullet_result["issues"] else "PASS",
        "bullet_issues": bullet_result["issues"],
        "optimized_aplus": aplus_result["optimized_aplus"],
        "aplus_status": "FAIL" if aplus_result["issues"] else "PASS",
        "aplus_issues": aplus_result["issues"],
    }


def optimize_bullets(
    title: str,
    brand: str = "",
    category: str = "",
    bullets: list[str] | None = None,
    title_components: dict[str, Any] | None = None,
) -> dict[str, Any]:
    components = title_components or build_title_components(title, brand, category)
    clean_bullets = [normalize_space(bullet) for bullet in bullets or [] if normalize_space(bullet)]
    issues: list[str] = []

    if not clean_bullets:
        issues.append("EMPTY_BULLETS")

    if len(clean_bullets) > MAX_BULLETS:
        issues.append("TOO_MANY_BULLETS")

    if any(len(bullet) > MAX_BULLET_LENGTH for bullet in clean_bullets):
        issues.append("BULLET_OVER_LENGTH")

    if _has_promotional_language(" ".join(clean_bullets)):
        issues.append("PROMO_LANGUAGE")

    if _has_claim_risk(" ".join(clean_bullets)):
        issues.append("HYPERBOLE_RISK")

    if INVALID_SYMBOL_RE.search(" ".join(clean_bullets)):
        issues.append("INVALID_SYMBOLS")

    if _has_keyword_stuffing(" ".join(clean_bullets)):
        issues.append("KEYWORD_STUFFING")

    if _has_duplicate_bullets(clean_bullets):
        issues.append("DUPLICATE_BULLETS")

    if clean_bullets and not _first_bullet_has_product_context(clean_bullets[0], title, category):
        issues.append("WEAK_BENEFIT_ORDER")

    source_bullets = clean_bullets[:MAX_BULLETS]
    if not source_bullets:
        source_bullets = _fallback_bullet_sources(title, brand, category, components)

    optimized = [
        _format_bullet(index, bullet, title, brand, category, components)
        for index, bullet in enumerate(source_bullets[:MAX_BULLETS])
    ]

    while len(optimized) < MAX_BULLETS:
        optimized.append(_fallback_bullet(len(optimized), title, brand, category, components))

    return {"issues": _dedupe_issue_list(issues), "optimized_bullets": optimized[:MAX_BULLETS]}


def optimize_aplus_layout(
    title: str,
    brand: str = "",
    category: str = "",
    bullets: list[str] | None = None,
    aplus_content: str = "",
    title_components: dict[str, Any] | None = None,
) -> dict[str, Any]:
    components = title_components or build_title_components(title, brand, category)
    clean_aplus = normalize_space(aplus_content)
    clean_bullets = [normalize_space(bullet) for bullet in bullets or [] if normalize_space(bullet)]
    issues: list[str] = []

    lower_aplus = clean_aplus.lower()
    if clean_aplus and _has_promotional_language(clean_aplus):
        issues.append("PROMO_LANGUAGE")
    if clean_aplus and _has_claim_risk(clean_aplus):
        issues.append("HYPERBOLE_RISK")
    if clean_aplus and not any(token in lower_aplus for token in ("brand", "story", "about", "why")):
        issues.append("APLUS_MISSING_BRAND_STORY")
    if clean_aplus and not any(token in lower_aplus for token in ("feature", "benefit", "design", "use")):
        issues.append("APLUS_MISSING_BENEFITS")
    if clean_aplus and not any(token in lower_aplus for token in ("size", "spec", "dimension", "package", "compatible")):
        issues.append("APLUS_MISSING_SPECS")
    if not clean_aplus:
        issues.append("APLUS_FORMAT_WEAK")

    product_type = components.get("core_keyword") or get_product_type(title, brand, category) or normalize_space(category) or "Product"
    brand_name = normalize_space(brand) or "Your Brand"
    title_seed = optimize_title(title, brand, category)
    attributes = components.get("attributes", [])
    specifications = components.get("specifications", [])
    use_cases = components.get("use_case", [])
    benefit_lines = clean_bullets[:3] or optimize_bullets(title, brand, category, [], components)["optimized_bullets"][:3]
    spec_copy = ", ".join(specifications) if specifications else "material, dimensions, capacity, model compatibility, color, and package details"
    use_case_copy = ", ".join(use_cases) if use_cases else "the main buying scenario"
    attribute_copy = ", ".join(attributes[:3]) if attributes else "the clearest conversion-driving features"

    optimized_aplus = [
        {
            "section": "Brand Story",
            "format": "短品牌段落",
            "content": f"{brand_name} presents {product_type} with a clear, trust-led message focused on practical buyer needs.",
        },
        {
            "section": "Product Overview",
            "format": "主图旁短文案",
            "content": f"Introduce {title_seed} in one readable sentence, then connect {attribute_copy} to {use_case_copy}.",
        },
        {
            "section": "Key Benefits",
            "format": "3-column benefit blocks",
            "content": " | ".join(_compact_sentence(line) for line in benefit_lines[:3]),
        },
        {
            "section": "Specs & Compatibility",
            "format": "参数/尺寸/兼容性表格",
            "content": f"List {spec_copy}. Keep each row factual and easy to compare.",
        },
        {
            "section": "Package & FAQ",
            "format": "包装清单 + 常见问题",
            "content": "Clarify what is included, care notes, installation/use tips, and buyer questions that reduce hesitation.",
        },
    ]

    return {"issues": _dedupe_issue_list(issues), "optimized_aplus": optimized_aplus}


def _format_bullet(
    index: int,
    bullet: str,
    title: str,
    brand: str,
    category: str,
    title_components: dict[str, Any] | None = None,
) -> str:
    cleaned = _clean_copy_text(bullet)
    tokens = _dedupe_words(cleaned.split())
    sentence = " ".join(tokens)
    sentence = _remove_low_value_lead_words(sentence)
    if len(sentence.split()) < 2:
        sentence = _fallback_bullet(index, title, brand, category, title_components)

    label = BENEFIT_LABELS[index] if index < len(BENEFIT_LABELS) else "Benefit"
    if not re.match(r"^[A-Z][A-Za-z &]+:", sentence):
        sentence = f"{label}: {sentence}"

    return _truncate_sentence(sentence, MAX_BULLET_LENGTH)


def _fallback_bullet(
    index: int,
    title: str,
    brand: str,
    category: str,
    title_components: dict[str, Any] | None = None,
) -> str:
    components = title_components or build_title_components(title, brand, category)
    product_type = components.get("core_keyword") or get_product_type(title, brand, category) or normalize_space(category) or "Product"
    brand_name = normalize_space(brand)
    attributes = components.get("attributes", [])
    specifications = components.get("specifications", [])
    use_cases = components.get("use_case", [])
    attribute_copy = ", ".join(attributes[:3]) if attributes else "practical feature details"
    spec_copy = ", ".join(specifications[:3]) if specifications else "size, capacity, model, or color details"
    use_case_copy = ", ".join(use_cases[:2]) if use_cases else "everyday use"
    fallback = [
        f"Core Benefit: {product_type} with {attribute_copy} for clear buyer comparison",
        f"Everyday Use: Built around {use_case_copy} with readable, benefit-first copy",
        f"Key Feature: Highlights {attribute_copy} without promotional language or unsupported claims",
        f"Fit & Details: Add {spec_copy} so buyers can confirm fit before purchase",
        f"What You Get: Summarize package contents and buyer-facing support information",
    ]
    line = fallback[index] if index < len(fallback) else fallback[-1]
    return f"{brand_name} {line}" if brand_name and index == 0 else line


def _fallback_bullet_sources(
    title: str,
    brand: str,
    category: str,
    title_components: dict[str, Any] | None = None,
) -> list[str]:
    components = title_components or build_title_components(title, brand, category)
    product_type = components.get("core_keyword") or get_product_type(title, brand, category) or normalize_space(category) or "Product"
    attributes = components.get("attributes", [])
    specifications = components.get("specifications", [])
    use_cases = components.get("use_case", [])
    attribute_source = " ".join(attributes[:3]) or "Practical feature"
    spec_source = " ".join(specifications[:3]) or "Size material compatibility"
    return [
        f"{product_type} with {attribute_source}",
        f"{' '.join(use_cases[:2]) or 'Everyday use'} scenario and buyer benefit",
        f"{attribute_source} feature details for product comparison",
        f"{spec_source} fit and specification details",
        "Package contents and care notes",
    ]


def _clean_copy_text(value: str) -> str:
    cleaned = normalize_space(value)
    for phrase in sorted(BANNED_MARKETING_WORDS, key=len, reverse=True):
        cleaned = phrase_pattern(phrase).sub(" ", cleaned)
    cleaned = _remove_unsupported_claims(cleaned)
    cleaned = INVALID_SYMBOL_RE.sub(" ", cleaned)
    cleaned = re.sub(r"[|/]+", " ", cleaned)
    cleaned = re.sub(r"\s+-\s+|[-]{2,}", " ", cleaned)
    return normalize_space(cleaned)


def _remove_unsupported_claims(value: str) -> str:
    cleaned = re.sub(r"\bmilitary\s+grade\b", " ", value, flags=re.IGNORECASE)
    cleaned = re.sub(r"\bultra\s+durable\b", " ", cleaned, flags=re.IGNORECASE)

    if "waterproof" in cleaned.lower() and not re.search(
        r"\b(ipx\d+|ip\d{2}|certified|verified|tested)\b", cleaned, flags=re.IGNORECASE
    ):
        cleaned = re.sub(r"\bwaterproof\b", " ", cleaned, flags=re.IGNORECASE)

    if "premium quality" in cleaned.lower() and not re.search(
        r"\b(certified|verified|tested)\b", cleaned, flags=re.IGNORECASE
    ):
        cleaned = re.sub(r"\bpremium\s+quality\b", " ", cleaned, flags=re.IGNORECASE)

    return normalize_space(cleaned)


def _dedupe_words(words: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for word in words:
        key = re.sub(r"[^a-z0-9]+", "", word.lower())
        if not key:
            continue
        if key in seen:
            continue
        seen.add(key)
        result.append(word)
    return result


def _remove_low_value_lead_words(sentence: str) -> str:
    words = sentence.split()
    while words and re.sub(r"[^a-z0-9]+", "", words[0].lower()) in LOW_VALUE_WORDS:
        words.pop(0)
    return " ".join(words)


def _truncate_sentence(sentence: str, limit: int) -> str:
    if len(sentence) <= limit:
        return sentence
    return sentence[:limit].rsplit(" ", 1)[0].rstrip(" ,;:") or sentence[:limit]


def _compact_sentence(sentence: str) -> str:
    return _truncate_sentence(re.sub(r"^[A-Z][A-Za-z &]+:\s*", "", sentence), 110)


def _has_promotional_language(value: str) -> bool:
    return any(phrase_pattern(word).search(value) for word in BANNED_MARKETING_WORDS)


def _has_claim_risk(value: str) -> bool:
    lower_value = value.lower()
    unsupported_waterproof = "waterproof" in lower_value and not re.search(
        r"\b(ipx\d+|ip\d{2}|certified|verified|tested)\b", lower_value
    )
    unsupported_premium = "premium quality" in lower_value and not re.search(
        r"\b(certified|verified|tested)\b", lower_value
    )
    return any(
        [
            "military grade" in lower_value,
            "ultra durable" in lower_value,
            unsupported_premium,
            unsupported_waterproof,
        ]
    )


def _has_keyword_stuffing(value: str) -> bool:
    words = [word.lower() for word in WORD_RE.findall(value)]
    return any(count > 2 for count in Counter(words).values())


def _has_duplicate_bullets(bullets: list[str]) -> bool:
    normalized = [re.sub(r"[^a-z0-9]+", "", bullet.lower()) for bullet in bullets]
    return len(set(normalized)) != len(normalized)


def _first_bullet_has_product_context(first_bullet: str, title: str, category: str) -> bool:
    product_type = get_product_type(title, "", category) or normalize_space(category)
    if not product_type:
        return True
    first = first_bullet.lower()
    return any(token in first for token in product_type.lower().split() if len(token) > 2)


def _dedupe_issue_list(issues: list[str]) -> list[str]:
    result: list[str] = []
    for issue in issues:
        if issue not in result:
            result.append(issue)
    return result
