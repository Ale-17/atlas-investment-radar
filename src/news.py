from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

API = "https://api.gdeltproject.org/api/v2/doc/doc"
OUT = Path("docs/data/news.json")
HOURS = 24
MAX_ARTICLES = 36

QUERIES = [
    ("macro", '(Federal Reserve OR ECB OR inflation OR "interest rates" OR "jobs report" OR GDP OR tariffs) markets'),
    ("crypto", '(Bitcoin OR BTC OR Ethereum OR crypto OR "spot ETF") markets'),
    ("indices", '(Nasdaq OR "S&P 500" OR "MSCI World" OR stocks OR equities) markets'),
    ("stocks", '(Nvidia OR Microsoft OR Alphabet OR Google OR Amazon OR Meta OR Broadcom) earnings'),
]

TRUSTED_DOMAINS = {
    "reuters.com": 16,
    "bloomberg.com": 15,
    "ft.com": 14,
    "wsj.com": 13,
    "cnbc.com": 12,
    "marketwatch.com": 10,
    "barrons.com": 10,
    "finance.yahoo.com": 8,
    "investing.com": 7,
    "coindesk.com": 7,
    "cointelegraph.com": 4,
    "elpais.com": 5,
    "expansion.com": 8,
    "eleconomista.es": 7,
    "cincodias.elpais.com": 8,
}

ASSET_TERMS = {
    "BTC-USD": ["bitcoin", "btc", "crypto", "spot bitcoin etf"],
    "^NDX": ["nasdaq", "nasdaq 100", "big tech", "technology stocks"],
    "^GSPC": ["s&p 500", "sp 500", "wall street", "us stocks"],
    "URTH": ["msci world", "global stocks", "global equities", "world stocks"],
    "NVDA": ["nvidia", "nvda"],
    "MSFT": ["microsoft", "msft"],
    "GOOGL": ["alphabet", "google", "googl"],
    "AMZN": ["amazon", "amzn"],
    "META": ["meta platforms", "meta", "facebook"],
    "AVGO": ["broadcom", "avgo"],
}

MACRO_TERMS = {
    "Fed": ["federal reserve", "fed ", "powell"],
    "ECB": ["ecb", "european central bank", "lagarde"],
    "Inflación": ["inflation", "cpi", "pce", "inflación", "ipc"],
    "Tipos": ["interest rate", "rates", "rate cut", "rate hike", "tipos de interés"],
    "Empleo": ["jobs report", "payrolls", "unemployment", "empleo", "paro"],
    "PIB": ["gdp", "gross domestic product", "pib"],
    "Aranceles": ["tariff", "tariffs", "trade war", "arancel"],
}

IMPACT_TERMS = [
    "earnings", "guidance", "forecast", "profit", "revenue", "rate cut", "rate hike",
    "inflation", "cpi", "pce", "jobs report", "payrolls", "gdp", "tariff", "sanction",
    "sec", "regulation", "antitrust", "acquisition", "merger", "buyback", "dividend",
    "etf", "bankruptcy", "default", "downgrade", "upgrade",
]


def canonical_title(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", title.lower()).strip()


def parse_seen(raw: str) -> datetime | None:
    if not raw:
        return None
    for fmt in ("%Y%m%dT%H%M%SZ", "%Y-%m-%dT%H:%M:%SZ"):
        try:
            return datetime.strptime(raw, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    return None


def domain_boost(domain: str) -> int:
    domain = (domain or "").lower().removeprefix("www.")
    for trusted, boost in TRUSTED_DOMAINS.items():
        if domain == trusted or domain.endswith("." + trusted):
            return boost
    return 0


def classify(title: str, query_category: str) -> tuple[list[str], list[str], str, int]:
    low = f" {title.lower()} "
    assets = [
        symbol for symbol, terms in ASSET_TERMS.items()
        if any(term in low for term in terms)
    ]
    macro = [
        label for label, terms in MACRO_TERMS.items()
        if any(term in low for term in terms)
    ]

    if assets and any(a in {"NVDA", "MSFT", "GOOGL", "AMZN", "META", "AVGO"} for a in assets):
        category = "stocks"
    elif "BTC-USD" in assets or query_category == "crypto":
        category = "crypto"
    elif macro or query_category == "macro":
        category = "macro"
    else:
        category = "markets"

    impact = sum(1 for term in IMPACT_TERMS if term in low)
    return assets[:5], macro[:4], category, impact


def fetch_query(category: str, query: str) -> list[dict]:
    params = {
        "query": query,
        "mode": "ArtList",
        "format": "json",
        "maxrecords": 60,
        "timespan": f"{HOURS}h",
    }
    req = Request(
        f"{API}?{urlencode(params)}",
        headers={"User-Agent": "AtlasInvestmentRadar/1.0 (GitHub Actions)"},
    )
    with urlopen(req, timeout=25) as response:
        payload = json.load(response)
    articles = payload.get("articles", [])
    return [{**a, "_query_category": category} for a in articles]


def build_item(raw: dict, now: datetime) -> dict | None:
    title = str(raw.get("title") or "").strip()
    url = str(raw.get("url") or "").strip()
    domain = str(raw.get("domain") or "").strip().lower()
    if not title or not url.startswith(("http://", "https://")):
        return None

    published = parse_seen(str(raw.get("seendate") or ""))
    age_hours = ((now - published).total_seconds() / 3600) if published else HOURS
    assets, macro, category, impact = classify(title, raw.get("_query_category", "markets"))

    score = 42
    score += domain_boost(domain)
    score += min(18, len(assets) * 6)
    score += min(12, len(macro) * 4)
    score += min(18, impact * 4)
    score += max(0, int(10 - age_hours / 2))
    score = max(0, min(100, score))

    reason_bits = []
    if assets:
        reason_bits.append("activos: " + ", ".join(assets))
    if macro:
        reason_bits.append("macro: " + ", ".join(macro))
    if impact:
        reason_bits.append("incluye un catalizador relevante")
    reason = " · ".join(reason_bits) if reason_bits else "contexto de mercado"

    return {
        "title": title,
        "url": url,
        "domain": domain,
        "source_country": raw.get("sourcecountry"),
        "language": raw.get("language"),
        "published_at": published.isoformat().replace("+00:00", "Z") if published else None,
        "category": category,
        "assets": assets,
        "macro": macro,
        "relevance": score,
        "reason": reason,
    }


def main() -> int:
    now = datetime.now(timezone.utc)
    raw_articles: list[dict] = []
    errors: list[str] = []

    for category, query in QUERIES:
        try:
            raw_articles.extend(fetch_query(category, query))
        except Exception as exc:
            errors.append(f"{category}: {type(exc).__name__}: {exc}")

    items: list[dict] = []
    seen_titles: set[str] = set()
    seen_urls: set[str] = set()

    for raw in raw_articles:
        item = build_item(raw, now)
        if not item:
            continue
        key = canonical_title(item["title"])
        if not key or key in seen_titles or item["url"] in seen_urls:
            continue
        seen_titles.add(key)
        seen_urls.add(item["url"])
        items.append(item)

    items.sort(
        key=lambda x: (
            x["relevance"],
            x["published_at"] or "",
        ),
        reverse=True,
    )
    items = items[:MAX_ARTICLES]

    if not items:
        print("No news articles returned; keeping the previous feed.", file=sys.stderr)
        for err in errors:
            print(err, file=sys.stderr)
        return 0 if OUT.exists() else 1

    payload = {
        "generated_at": now.isoformat().replace("+00:00", "Z"),
        "source": "GDELT DOC 2.0",
        "horizon_hours": HOURS,
        "article_count": len(items),
        "articles": items,
        "errors": errors,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote {len(items)} investment-news articles ({len(errors)} query errors).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
