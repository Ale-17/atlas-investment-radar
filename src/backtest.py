from __future__ import annotations

import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import yfinance as yf

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from indicators import snapshot
from scoring import score_asset


def load_assets() -> list[dict]:
    return json.loads((ROOT / "config/assets.json").read_text(encoding="utf-8"))["assets"]


def fetch_close(symbol: str, period: str = "7y") -> pd.Series:
    df = yf.download(symbol, period=period, interval="1d", auto_adjust=True, progress=False, threads=False)
    if df.empty:
        raise RuntimeError(f"No historical data for {symbol}")
    close = df["Close"]
    if isinstance(close, pd.DataFrame):
        close = close.iloc[:, 0]
    close = close.dropna()
    close.index = pd.to_datetime(close.index).tz_localize(None)
    return close


def max_drawdown(equity: pd.Series) -> float:
    if equity.empty:
        return 0.0
    peak = equity.cummax()
    dd = equity / peak - 1
    return float(dd.min())


def cagr(equity: pd.Series) -> float:
    if len(equity) < 2:
        return 0.0
    days = max(1, (equity.index[-1] - equity.index[0]).days)
    years = days / 365.25
    if years <= 0 or equity.iloc[0] <= 0:
        return 0.0
    return float((equity.iloc[-1] / equity.iloc[0]) ** (1 / years) - 1)


def regime_at(date: pd.Timestamp, regimes: dict[str, pd.Series]) -> bool:
    checks = []
    for symbol in ("^GSPC", "^NDX"):
        s = regimes[symbol].loc[:date].dropna()
        if len(s) < 200:
            continue
        sma200 = s.rolling(200).mean().iloc[-1]
        checks.append(bool(pd.notna(sma200) and s.iloc[-1] > sma200))
    return sum(checks) >= 1 if checks else True


def run_asset(asset: dict, close: pd.Series, regimes: dict[str, pd.Series]) -> dict:
    if len(close) < 280:
        raise RuntimeError("Insufficient history")
    close = close.sort_index()
    rebalance_positions = pd.Series(index=close.index, dtype=float)
    scores = {}
    for i in range(252, len(close), 5):
        date = close.index[i]
        hist = close.iloc[: i + 1]
        metrics = snapshot(hist)
        risk_on = regime_at(date, regimes)
        score, _ = score_asset(metrics, risk_on=risk_on)
        scores[str(date.date())] = int(score)
        rebalance_positions.iloc[i] = 1.0 if score >= 60 else 0.0
    position = rebalance_positions.ffill().fillna(0.0)
    start_idx = position.ne(0).idxmax() if position.ne(0).any() else close.index[252]
    close_bt = close.loc[start_idx:]
    position_bt = position.loc[start_idx:]
    daily_ret = close_bt.pct_change().fillna(0.0)
    strategy_ret = daily_ret * position_bt.shift(1).fillna(0.0)
    strategy_eq = (1 + strategy_ret).cumprod()
    buyhold_eq = (1 + daily_ret).cumprod()
    switches = int(position_bt.diff().abs().fillna(0).sum())
    latest_score = list(scores.values())[-1] if scores else None
    return {
        "symbol": asset["symbol"], "name": asset["name"], "type": asset["type"],
        "start_date": str(close_bt.index[0].date()), "end_date": str(close_bt.index[-1].date()),
        "atlas_return": float(strategy_eq.iloc[-1] - 1), "buyhold_return": float(buyhold_eq.iloc[-1] - 1),
        "atlas_cagr": cagr(strategy_eq), "buyhold_cagr": cagr(buyhold_eq),
        "atlas_max_drawdown": max_drawdown(strategy_eq), "buyhold_max_drawdown": max_drawdown(buyhold_eq),
        "time_in_market": float(position_bt.mean()), "switches": switches,
        "latest_historical_score": latest_score,
    }


def main():
    assets = load_assets()
    cache: dict[str, pd.Series] = {}
    errors = []
    for symbol in ("^GSPC", "^NDX"):
        cache[symbol] = fetch_close(symbol)
    results = []
    for asset in assets:
        try:
            symbol = asset["symbol"]
            close = cache.get(symbol)
            if close is None:
                close = fetch_close(symbol)
                cache[symbol] = close
            results.append(run_asset(asset, close, cache))
        except Exception as exc:
            errors.append({"symbol": asset["symbol"], "error": str(exc)})
    for r in results:
        r["return_edge"] = r["atlas_return"] - r["buyhold_return"]
        r["drawdown_improvement"] = r["atlas_max_drawdown"] - r["buyhold_max_drawdown"]
        r["validation_score"] = r["return_edge"] * 0.6 + r["drawdown_improvement"] * 0.4
    results.sort(key=lambda x: x["validation_score"], reverse=True)
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "method": {"name": "weekly-score-v1", "threshold": 60, "rebalance_sessions": 5, "history_period": "7y", "notes": "Signal applied from next trading session. No taxes, spreads or cash yield."},
        "assets": results, "errors": errors,
    }
    out = ROOT / "docs/data/backtest.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Generated {out} with {len(results)} assets and {len(errors)} errors")


if __name__ == "__main__":
    main()
