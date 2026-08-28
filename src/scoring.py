from __future__ import annotations


def score_asset(m: dict, risk_on: bool = True) -> tuple[int, list[str]]:
    score = 50
    reasons: list[str] = []

    price = m.get("price")
    sma50 = m.get("sma50")
    sma200 = m.get("sma200")
    rsi = m.get("rsi14")
    dd = m.get("drawdown_52w")
    r3 = m.get("return_3m")
    r6 = m.get("return_6m")
    r12 = m.get("return_12m")
    vol = m.get("volatility60")

    if price and sma200:
        if price > sma200:
            score += 12
            reasons.append("Precio por encima de SMA200")
        else:
            score -= 15
            reasons.append("Precio por debajo de SMA200")

    if sma50 and sma200:
        if sma50 > sma200:
            score += 8
            reasons.append("Tendencia media positiva")
        else:
            score -= 7
            reasons.append("SMA50 por debajo de SMA200")

    if r6 is not None:
        if r6 > 0.12:
            score += 9
            reasons.append("Momentum 6m fuerte")
        elif r6 > 0:
            score += 5
            reasons.append("Momentum 6m positivo")
        elif r6 < -0.20:
            score -= 8
            reasons.append("Momentum 6m muy débil")

    if r12 is not None:
        if r12 > 0.20:
            score += 6
            reasons.append("Momentum 12m fuerte")
        elif r12 < 0:
            score -= 5
            reasons.append("Momentum 12m negativo")

    if r3 is not None and r3 > 0.20:
        score -= 4
        reasons.append("Subida 3m muy vertical")

    if rsi is not None:
        if 38 <= rsi <= 62:
            score += 7
            reasons.append("RSI en zona saludable")
        elif 30 <= rsi < 38:
            score += 10
            reasons.append("RSI de caída aprovechable")
        elif rsi > 75:
            score -= 9
            reasons.append("RSI muy sobrecomprado")
        elif rsi < 30:
            score -= 2
            reasons.append("RSI extremo: exige confirmación")

    if dd is not None:
        if -0.15 <= dd <= -0.05:
            score += 8
            reasons.append("Corrección moderada desde máximos")
        elif -0.30 <= dd < -0.15 and price and sma200 and price > sma200:
            score += 10
            reasons.append("Corrección profunda con tendencia estructural intacta")
        elif dd < -0.30 and price and sma200 and price < sma200:
            score -= 8
            reasons.append("Drawdown profundo y tendencia rota")

    if vol is not None and vol > 0.70:
        score -= 5
        reasons.append("Volatilidad muy alta")

    if not risk_on:
        score -= 8
        reasons.append("Régimen general risk-off")

    return max(0, min(100, round(score))), reasons


def label(score: int) -> str:
    if score >= 80:
        return "OPORTUNIDAD MUY FUERTE"
    if score >= 65:
        return "OPORTUNIDAD"
    if score >= 50:
        return "DCA / VIGILAR"
    if score >= 35:
        return "ESPERAR"
    return "RIESGO ALTO"
