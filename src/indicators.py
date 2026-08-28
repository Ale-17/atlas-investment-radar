from __future__ import annotations

import math
import pandas as pd
import numpy as np


def rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1 / period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / period, min_periods=period, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    out = 100 - (100 / (1 + rs))
    return out.fillna(50)


def annualized_volatility(series: pd.Series, window: int = 60) -> pd.Series:
    return series.pct_change().rolling(window).std() * math.sqrt(252)


def trailing_return(series: pd.Series, sessions: int) -> float | None:
    if len(series) <= sessions:
        return None
    first = float(series.iloc[-sessions - 1])
    last = float(series.iloc[-1])
    if first == 0:
        return None
    return last / first - 1


def snapshot(close: pd.Series) -> dict:
    close = close.dropna()
    if len(close) < 50:
        raise ValueError("Not enough price history")

    sma50 = close.rolling(50).mean()
    sma200 = close.rolling(200).mean()
    rs = rsi(close)
    vol = annualized_volatility(close)

    max_52w = float(close.tail(252).max())
    price = float(close.iloc[-1])
    drawdown = price / max_52w - 1 if max_52w else 0

    return {
        "price": price,
        "sma50": float(sma50.iloc[-1]) if pd.notna(sma50.iloc[-1]) else None,
        "sma200": float(sma200.iloc[-1]) if pd.notna(sma200.iloc[-1]) else None,
        "rsi14": float(rs.iloc[-1]),
        "volatility60": float(vol.iloc[-1]) if pd.notna(vol.iloc[-1]) else None,
        "drawdown_52w": drawdown,
        "return_3m": trailing_return(close, 63),
        "return_6m": trailing_return(close, 126),
        "return_12m": trailing_return(close, 252),
    }
