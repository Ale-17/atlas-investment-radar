from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
import sys

import pandas as pd
import yfinance as yf

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from indicators import snapshot
from scoring import score_asset, label


def load_assets() -> list[dict]:
    return json.loads((ROOT / "config/assets.json").read_text(encoding="utf-8"))["assets"]


def fetch_close(symbol: str) -> pd.Series:
    df = yf.download(
        symbol,
        period="2y",
        interval="1d",
        auto_adjust=True,
        progress=False,
        threads=False,
    )
    if df.empty:
        raise RuntimeError(f"No market data for {symbol}")

    close = df["Close"]
    if isinstance(close, pd.DataFrame):
        close = close.iloc[:, 0]
    return close.dropna()


def market_regime(cache: dict[str, pd.Series]) -> tuple[bool, dict]:
    checks = []
    details = {}
    for symbol in ("^GSPC", "^NDX"):
        close = cache.get(symbol)
        if close is None:
            close = fetch_close(symbol)
            cache[symbol] = close
        snap = snapshot(close)
        above = bool(snap["sma200"] and snap["price"] > snap["sma200"])
        checks.append(above)
        details[symbol] = {
            "price": snap["price"],
            "sma200": snap["sma200"],
            "above_sma200": above,
        }
    risk_on = sum(checks) >= 1
    return risk_on, details


def main():
    assets = load_assets()
    cache: dict[str, pd.Series] = {}

    risk_on, regime_details = market_regime(cache)

    rows = []
    errors = []
    for asset in assets:
        symbol = asset["symbol"]
        try:
            close = cache.get(symbol)
            if close is None:
                close = fetch_close(symbol)
                cache[symbol] = close

            metrics = snapshot(close)
            score, reasons = score_asset(metrics, risk_on=risk_on)

            rows.append({
                **asset,
                "score": score,
                "label": label(score),
                "metrics": metrics,
                "reasons": reasons[:6],
            })
        except Exception as exc:
            errors.append({"symbol": symbol, "error": str(exc)})

    rows.sort(key=lambda x: x["score"], reverse=True)

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "strategy": "aggressive-v1",
        "risk_on": risk_on,
        "regime": regime_details,
        "assets": rows,
        "errors": errors,
    }

    latest = ROOT / "docs/data/latest.json"
    latest.parent.mkdir(parents=True, exist_ok=True)
    latest.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    history_dir = ROOT / "data/history"
    history_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H%M%S")
    (history_dir / f"{stamp}.json").write_text(
        json.dumps(payload, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print(f"Generated {latest}")
    print(f"Risk-on: {risk_on}")
    print(f"Assets: {len(rows)} | Errors: {len(errors)}")


if __name__ == "__main__":
    main()
