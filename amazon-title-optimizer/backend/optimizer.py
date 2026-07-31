from __future__ import annotations

import re
from collections import Counter
from typing import Any

from skill_engine import (
    BANNED_MARKETING_WORDS,
    INVALID_SYMBOL_RE,
    WORD_RE,
    get_product_type,
    normalize_space,
    phrase_pattern,
)


MAX_TITLE_LENGTH = 75
MIN_KEY_ATTRIBUTES = 2
MAX_KEY_ATTRIBUTES = 5

LOW_VALUE_ADJECTIVES = {
    "best",
    "top",
    "perfect",
    "amazing",
    "premium",
    "quality",
    "great",
    "excellent",
    "nice",
    "new",
    "stylish",
    "beautiful",
    "luxury",
    "super",
    "ultra",
    "high",
    "hot",
    "cheap",
}

STOP_WORDS = {
    "a",
    "an",
    "and",
    "by",
    "for",
    "from",
    "in",
    "into",
    "of",
    "on",
    "or",
    "the",
    "to",
    "with",
    "your",
}

VAGUE_PRODUCT_WORDS = {
    "product",
    "item",
    "thing",
    "goods",
    "stuff",
    "accessory",
}

COLOR_WORDS = {
    "black",
    "white",
    "red",
    "blue",
    "green",
    "yellow",
    "orange",
    "purple",
    "pink",
    "gray",
    "grey",
    "brown",
    "silver",
    "gold",
    "clear",
    "transparent",
    "beige",
}

MATERIAL_WORDS = {
    "abs",
    "aluminum",
    "bamboo",
    "canvas",
    "ceramic",
    "cotton",
    "fabric",
    "glass",
    "leather",
    "metal",
    "nylon",
    "plastic",
    "polyester",
    "rubber",
    "silicone",
    "steel",
    "stainless",
    "wood",
}

FUNCTION_ATTRIBUTE_WORDS = {
    "adjustable",
    "anti",
    "compact",
    "detachable",
    "ergonomic",
    "fast",
    "foldable",
    "heavy",
    "insulated",
    "leak",
    "lightweight",
    "magnetic",
    "non",
    "nonstick",
    "portable",
    "protective",
    "rechargeable",
    "slim",
    "slip",
    "soft",
    "stackable",
    "thermal",
    "wireless",
}

SPEC_WORDS = {
    "capacity",
    "inch",
    "inches",
    "large",
    "medium",
    "mini",
    "model",
    "oz",
    "pack",
    "plus",
    "pro",
    "size",
    "small",
    "xl",
    "xxl",
}

USE_CASE_WORDS = {
    "business",
    "camping",
    "carry",
    "commute",
    "daily",
    "desk",
    "everyday",
    "gym",
    "home",
    "kitchen",
    "office",
    "outdoor",
    "school",
    "travel",
    "trip",
    "work",
}

COMPATIBILITY_WORDS = {
    "android",
    "galaxy",
    "ipad",
    "iphone",
    "kindle",
    "macbook",
    "pixel",
    "samsung",
    "tablet",
    "tesla",
}

ACRONYM_KEYS = {
    "abs",
    "bpa",
    "gps",
    "hd",
    "ip",
    "led",
    "rfid",
    "tsa",
    "uhd",
    "usb",
    "xl",
    "xxl",
}

SPECIAL_TOKEN_CASE = {
    "galaxy": "Galaxy",
    "ipad": "iPad",
    "iphone": "iPhone",
    "kindle": "Kindle",
    "macbook": "MacBook",
    "pixel": "Pixel",
    "samsung": "Samsung",
}

ATTRIBUTE_PHRASES = {
    "anti slip",
    "anti theft",
    "bpa free",
    "fast charging",
    "heavy duty",
    "leak proof",
    "non slip",
    "shock resistant",
    "slim fit",
    "stainless steel",
    "tempered glass",
}

SPEC_PHRASES = {
    "2 pack",
    "3 pack",
    "4 pack",
    "extra large",
    "iphone 15",
    "iphone 16",
    "set of 2",
    "set of 4",
}

USE_CASE_PHRASES = {
    "air travel",
    "business travel",
    "carry on",
    "daily commute",
    "everyday use",
    "home office",
    "outdoor camping",
}

SEMANTIC_ROOTS = {
    "baggage": "luggage",
    "bag": "luggage",
    "suitcase": "luggage",
    "luggage": "luggage",
    "cellphone": "phone",
    "mobile": "phone",
    "smartphone": "phone",
    "anti": "anti",
    "non": "non",
}

RISKY_CLAIM_PATTERNS = [
    re.compile(r"\bmilitary\s+grade\b", re.IGNORECASE),
    re.compile(r"\bultra\s+durable\b", re.IGNORECASE),
    re.compile(r"\bpremium\s+quality\b", re.IGNORECASE),
    re.compile(r"\bwaterproof\b(?![^,;]*\b(?:ipx\d+|ip\d{2}|certified|verified|tested)\b)", re.IGNORECASE),
]


def optimize_title(title: str, brand: str = "", category: str = "") -> str:
    components = build_title_components(title, brand, category)
    return compose_title_from_components(components) or normalize_space(title)[:MAX_TITLE_LENGTH].strip()


def build_title_components(title: str, brand: str = "", category: str = "") -> dict[str, Any]:
    clean_title = _clean_source_title(title)
    clean_brand = normalize_space(brand)
    product_type = _resolve_product_type(clean_title, clean_brand, category)

    brand_phrase = _format_phrase(clean_brand)
    product_phrase = _format_phrase(product_type)
    product_keys = {_key(token) for token in _tokenize_preserving_case(product_phrase)}
    product_semantic_roots = {SEMANTIC_ROOTS.get(key, key) for key in product_keys}
    brand_keys = {_key(token) for token in _tokenize_preserving_case(brand_phrase)}

    attributes = _extract_phrases(clean_title, ATTRIBUTE_PHRASES)
    specifications = _extract_phrases(clean_title, SPEC_PHRASES)
    use_cases = _extract_phrases(clean_title, USE_CASE_PHRASES)

    excluded_keys = set().union(
        brand_keys,
        product_keys,
        _phrase_token_keys(attributes),
        _phrase_token_keys(specifications),
        _phrase_token_keys(use_cases),
    )

    feature_candidates: list[str] = []
    for token in _tokenize_preserving_case(clean_title):
        key = _key(token)
        semantic_root = SEMANTIC_ROOTS.get(key, key)
        if (
            not key
            or key in excluded_keys
            or semantic_root in product_semantic_roots
            or key in STOP_WORDS
            or key in LOW_VALUE_ADJECTIVES
        ):
            continue
        if key in VAGUE_PRODUCT_WORDS:
            continue
        formatted = _format_token(token)
        if key in COLOR_WORDS or key in MATERIAL_WORDS or key in FUNCTION_ATTRIBUTE_WORDS:
            attributes.append(formatted)
        elif _is_spec_token(token):
            specifications.append(formatted)
        elif key in USE_CASE_WORDS:
            use_cases.append(formatted)
        elif key in COMPATIBILITY_WORDS:
            use_cases.append(formatted)
        else:
            feature_candidates.append(formatted)

    attributes = _dedupe_phrases(attributes)
    specifications = _dedupe_phrases(specifications)
    use_cases = _dedupe_phrases(use_cases)

    if len(attributes) < MIN_KEY_ATTRIBUTES:
        attributes = _dedupe_phrases([*attributes, *feature_candidates])

    return {
        "brand": brand_phrase,
        "core_keyword": product_phrase,
        "attributes": attributes[:MAX_KEY_ATTRIBUTES],
        "specifications": specifications[:3],
        "use_case": use_cases[:2],
        "compliance_check": build_title_compliance_check(title, brand_phrase, product_phrase, attributes, specifications),
    }


def compose_title_from_components(components: dict[str, Any]) -> str:
    phrases = _dedupe_phrases(
        [
            components.get("brand", ""),
            components.get("core_keyword", ""),
            *components.get("attributes", []),
            *components.get("specifications", []),
            *components.get("use_case", []),
        ]
    )

    protected_count = int(bool(components.get("brand"))) + int(bool(components.get("core_keyword")))
    return _fit_phrases_to_length(phrases, protected_count)


def build_title_compliance_check(
    title: str,
    brand: str,
    core_keyword: str,
    attributes: list[str],
    specifications: list[str],
) -> dict[str, Any]:
    missing_core_fields: list[str] = []
    if not brand:
        missing_core_fields.append("brand")
    if not core_keyword or _is_vague_phrase(core_keyword):
        missing_core_fields.append("core_keyword")
    if len(attributes) < MIN_KEY_ATTRIBUTES:
        missing_core_fields.append("key_attributes")
    if not specifications:
        missing_core_fields.append("specifications")

    return {
        "has_keyword_stuffing": _has_keyword_stuffing(title),
        "has_promotional_words": _has_promotional_language(title),
        "is_readable": _is_readable_title(title),
        "missing_core_fields": missing_core_fields,
    }


def _clean_source_title(title: str) -> str:
    cleaned = normalize_space(title)
    for phrase in sorted(BANNED_MARKETING_WORDS, key=len, reverse=True):
        cleaned = phrase_pattern(phrase).sub(" ", cleaned)

    for pattern in RISKY_CLAIM_PATTERNS:
        cleaned = pattern.sub(" ", cleaned)

    cleaned = INVALID_SYMBOL_RE.sub(" ", cleaned)
    cleaned = re.sub(r"[|/]+", " ", cleaned)
    cleaned = re.sub(r"\s+-\s+|[-]{2,}", " ", cleaned)
    cleaned = re.sub(r"\b100\s+quality\b", " ", cleaned, flags=re.IGNORECASE)
    return normalize_space(cleaned)


def _resolve_product_type(cleaned_title: str, brand: str, category: str) -> str:
    product_type = get_product_type(cleaned_title, brand, category)
    if product_type and not _is_vague_phrase(product_type):
        return product_type
    return _fallback_product_type(cleaned_title, _prepare_phrase_tokens(brand))


def _extract_phrases(value: str, phrases: set[str]) -> list[str]:
    lower_value = f" {normalize_space(value).lower()} "
    result: list[str] = []
    for phrase in sorted(phrases, key=len, reverse=True):
        if re.search(rf"(?<!\w){re.escape(phrase)}(?!\w)", lower_value):
            result.append(_format_phrase(phrase))
    return _dedupe_phrases(result)


def _phrase_token_keys(phrases: list[str]) -> set[str]:
    return {_key(token) for phrase in phrases for token in _tokenize_preserving_case(phrase)}


def _prepare_phrase_tokens(value: str) -> list[str]:
    return [_format_token(token) for token in _tokenize_preserving_case(value)]


def _tokenize_preserving_case(value: str) -> list[str]:
    return WORD_RE.findall(value or "")


def _fallback_product_type(cleaned_title: str, brand_tokens: list[str]) -> str:
    brand_keys = {_key(token) for token in brand_tokens}
    candidates = [
        token
        for token in _tokenize_preserving_case(cleaned_title)
        if _key(token) not in brand_keys
        and _key(token) not in LOW_VALUE_ADJECTIVES
        and _key(token) not in STOP_WORDS
        and _key(token) not in VAGUE_PRODUCT_WORDS
    ]
    return " ".join(candidates[:2])


def _dedupe_phrases(phrases: list[str]) -> list[str]:
    seen: set[str] = set()
    deduped: list[str] = []
    for phrase in phrases:
        formatted = _format_phrase(phrase)
        key = _semantic_key(formatted)
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(formatted)
    return deduped


def _fit_phrases_to_length(phrases: list[str], protected_count: int) -> str:
    candidates = [phrase for phrase in phrases if phrase]
    title = " ".join(candidates)

    while len(title) > MAX_TITLE_LENGTH and len(candidates) > protected_count:
        candidates.pop()
        title = " ".join(candidates)

    if len(title) <= MAX_TITLE_LENGTH:
        return title

    return title[:MAX_TITLE_LENGTH].rsplit(" ", 1)[0].strip() or title[:MAX_TITLE_LENGTH].strip()


def _is_spec_token(token: str) -> bool:
    key = _key(token)
    return bool(re.search(r"\d", token)) or key in SPEC_WORDS or bool(
        re.fullmatch(r"(?:\d+)(?:oz|lb|lbs|ml|l|cm|mm|in|inch|gb|tb|mah)?", key)
    )


def _format_phrase(value: str) -> str:
    return " ".join(_format_token(token) for token in _tokenize_preserving_case(value))


def _format_token(token: str) -> str:
    key = _key(token)
    if not key:
        return ""
    if key in SPECIAL_TOKEN_CASE:
        return SPECIAL_TOKEN_CASE[key]
    if key in ACRONYM_KEYS or re.fullmatch(r"(?:ipx?\d+|\d+k)", key):
        return token.upper()
    if any(char.isdigit() for char in token):
        return token.upper()
    return token[:1].upper() + token[1:].lower()


def _key(token: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (token or "").lower())


def _semantic_key(value: str) -> str:
    keys = [_key(token) for token in _tokenize_preserving_case(value)]
    normalized = [SEMANTIC_ROOTS.get(key, key) for key in keys if key]
    return "".join(normalized)


def _is_vague_phrase(value: str) -> bool:
    keys = [_key(token) for token in _tokenize_preserving_case(value)]
    return bool(keys) and all(key in VAGUE_PRODUCT_WORDS for key in keys)


def _has_keyword_stuffing(value: str) -> bool:
    words = [word.lower() for word in WORD_RE.findall(value)]
    return any(count > 2 for count in Counter(words).values())


def _has_promotional_language(value: str) -> bool:
    return any(phrase_pattern(word).search(value) for word in BANNED_MARKETING_WORDS)


def _is_readable_title(value: str) -> bool:
    words = WORD_RE.findall(value)
    if len(words) < 3:
        return False
    if len(words) >= 5 and sum(1 for word in words if word.isupper() and len(word) > 2) / len(words) > 0.6:
        return False
    separator_count = sum(value.count(symbol) for symbol in ("-", "|", "/"))
    if separator_count > 2:
        return False
    unique_ratio = len({word.lower() for word in words}) / len(words)
    return unique_ratio >= 0.65
