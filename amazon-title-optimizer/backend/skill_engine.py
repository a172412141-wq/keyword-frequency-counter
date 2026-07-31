from __future__ import annotations

import re
from collections import Counter


BANNED_MARKETING_WORDS = [
    "free shipping",
    "100% quality",
    "best",
    "top",
    "#1",
    "discount",
    "sale",
    "guarantee",
    "perfect",
    "amazing",
]

INVALID_SYMBOL_RE = re.compile(r"[!@#$%\^&*]")
WORD_RE = re.compile(r"[a-z0-9]+(?:'[a-z0-9]+)?", re.IGNORECASE)
CJK_RE = re.compile(r"[\u3400-\u9fff]")

VAGUE_PRODUCT_WORDS = {"product", "item", "thing", "goods", "stuff", "accessory"}
ATTRIBUTE_SIGNAL_WORDS = {
    "adjustable",
    "anti",
    "bpa",
    "compact",
    "cotton",
    "fast",
    "foldable",
    "heavy",
    "leather",
    "lightweight",
    "non",
    "nylon",
    "portable",
    "rechargeable",
    "silicone",
    "slim",
    "steel",
    "wireless",
}
SPEC_SIGNAL_RE = re.compile(r"\b\d+(?:oz|lb|lbs|ml|l|cm|mm|in|inch|gb|tb|mah)?\b", re.IGNORECASE)

KNOWN_PRODUCT_TYPES = [
    "phone case",
    "screen protector",
    "water bottle",
    "coffee mug",
    "laptop stand",
    "storage bag",
    "travel bag",
    "charger",
    "cable",
    "adapter",
    "holder",
    "stand",
    "organizer",
    "bag",
    "backpack",
    "wallet",
    "bottle",
    "mug",
    "cup",
    "mat",
    "rug",
    "blanket",
    "pillow",
    "sheet",
    "towel",
    "shirt",
    "jacket",
    "pants",
    "dress",
    "shoes",
    "socks",
    "watch",
    "camera",
    "speaker",
    "headphones",
    "earbuds",
    "keyboard",
    "mouse",
    "lamp",
    "light",
    "chair",
    "desk",
    "table",
    "shelf",
    "rack",
    "basket",
    "toy",
    "game",
    "kit",
    "set",
    "filter",
    "brush",
    "comb",
    "pan",
    "pot",
    "knife",
    "spatula",
    "thermometer",
    "scale",
    "pump",
    "mount",
    "protector",
]


def normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def analyze_title(title: str, brand: str = "", category: str = "") -> list[str]:
    title = normalize_space(title)
    brand = normalize_space(brand)
    category = normalize_space(category)
    issues: list[str] = []

    if len(title) > 75:
        issues.append("OVER_LENGTH")

    if _contains_banned_marketing(title):
        issues.append("PROMO_LANGUAGE")

    if INVALID_SYMBOL_RE.search(title):
        issues.append("INVALID_SYMBOLS")

    if _has_format_noise(title):
        issues.append("FORMAT_NOISE")

    if _has_keyword_stuffing(title):
        issues.append("KEYWORD_STUFFING")

    if _has_all_caps_noise(title):
        issues.append("ALL_CAPS")

    if _has_mixed_language(title):
        issues.append("MIXED_LANGUAGE")

    if not brand:
        issues.append("MISSING_BRAND")

    product_type = get_product_type(title, brand, category)
    if product_type and _is_vague_product_type(product_type):
        issues.append("VAGUE_PRODUCT_TYPE")

    if not product_type or _is_vague_product_type(product_type) or not _product_type_is_early(title, product_type):
        issues.append("WEAK_STRUCTURE")

    if _has_low_information_density(title):
        issues.append("LOW_INFORMATION_DENSITY")

    if _has_hyperbole_risk(title):
        issues.append("HYPERBOLE_RISK")

    return issues


def get_product_type(title: str, brand: str = "", category: str = "") -> str:
    category = normalize_space(category)
    if category:
        return category

    lower_title = f" {normalize_space(title).lower()} "
    for product_type in sorted(KNOWN_PRODUCT_TYPES, key=len, reverse=True):
        pattern = rf"(?<!\w){re.escape(product_type)}(?!\w)"
        if re.search(pattern, lower_title):
            return product_type

    return ""


def phrase_pattern(phrase: str) -> re.Pattern[str]:
    if phrase == "#1":
        return re.compile(r"#\s*1", re.IGNORECASE)

    escaped_words = [re.escape(part) for part in phrase.split()]
    body = r"\s+".join(escaped_words)
    return re.compile(rf"(?<!\w){body}(?!\w)", re.IGNORECASE)


def _contains_banned_marketing(title: str) -> bool:
    return any(phrase_pattern(word).search(title) for word in BANNED_MARKETING_WORDS)


def _has_format_noise(title: str) -> bool:
    separator_count = sum(title.count(symbol) for symbol in ("-", "|", "/"))
    repeated_separator_run = re.search(r"[\-|/]{2,}", title) is not None
    return separator_count > 2 or repeated_separator_run


def _has_keyword_stuffing(title: str) -> bool:
    words = [word.lower() for word in WORD_RE.findall(title)]
    return any(count > 2 for count in Counter(words).values())


def _has_all_caps_noise(title: str) -> bool:
    words = WORD_RE.findall(title)
    if len(words) < 5:
        return False
    caps_words = [word for word in words if word.isupper() and len(word) > 2]
    return len(caps_words) / len(words) > 0.6


def _has_mixed_language(title: str) -> bool:
    return bool(CJK_RE.search(title)) and bool(WORD_RE.search(title))


def _is_vague_product_type(product_type: str) -> bool:
    words = [word.lower() for word in WORD_RE.findall(product_type)]
    return bool(words) and all(word in VAGUE_PRODUCT_WORDS for word in words)


def _has_low_information_density(title: str) -> bool:
    lower_title = title.lower()
    attribute_hits = sum(
        1
        for word in ATTRIBUTE_SIGNAL_WORDS
        if re.search(rf"(?<!\w){re.escape(word)}(?!\w)", lower_title)
    )
    has_spec = SPEC_SIGNAL_RE.search(title) is not None
    return attribute_hits < 2 and not has_spec


def _product_type_is_early(title: str, product_type: str) -> bool:
    title = normalize_space(title)
    product_type = normalize_space(product_type)
    if not title or not product_type:
        return False

    lower_title = title.lower()
    lower_product_type = product_type.lower()
    first_allowed_index = max(1, int(len(title) * 0.3))

    exact_index = lower_title.find(lower_product_type)
    if exact_index != -1:
        return exact_index <= first_allowed_index

    product_tokens = [
        token
        for token in WORD_RE.findall(lower_product_type)
        if len(token) > 2 and token not in {"and", "for", "with", "the"}
    ]
    token_indexes = [
        match.start()
        for token in product_tokens
        for match in re.finditer(rf"(?<!\w){re.escape(token)}(?!\w)", lower_title)
    ]
    return bool(token_indexes) and min(token_indexes) <= first_allowed_index


def _has_hyperbole_risk(title: str) -> bool:
    lower_title = title.lower()
    unsupported_waterproof = "waterproof" in lower_title and not re.search(
        r"\b(ipx\d+|ip\d{2}|certified|verified|tested)\b", lower_title
    )
    unsupported_premium = "premium quality" in lower_title and not re.search(
        r"\b(certified|verified|tested)\b", lower_title
    )

    return any(
        [
            unsupported_waterproof,
            unsupported_premium,
            re.search(r"\bmilitary\s+grade\b", lower_title) is not None,
            re.search(r"\bultra\s+durable\b", lower_title) is not None,
        ]
    )
