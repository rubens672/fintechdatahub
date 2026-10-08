def render_regime_badge(regime: str) -> str:
    """Returns a visual badge for macroeconomic market regime."""
    r = regime.upper()
    if "EXPANSION" in r or "BULL" in r or "RISK_ON" in r:
        return f"🟢 **REGIME: {regime}** *(Risk-On / Espansione)*"
    elif "SLOWDOWN" in r or "INFLATION" in r or "TIGHTENING" in r:
        return f"🟡 **REGIME: {regime}** *(Rallentamento / Pressione Inflazionistica)*"
    elif "CONTRACTION" in r or "BEAR" in r or "RECESSION" in r or "DEFENSIVE" in r:
        return f"🔴 **REGIME: {regime}** *(Risk-Off / Contrazione Difensiva)*"
    return f"🔵 **REGIME: {regime}**"


def render_sentiment_badge(score: float) -> str:
    """Returns a visual badge for market sentiment polarity score (-1.0 to +1.0)."""
    if score >= 0.35:
        return f"🟢 **BULLISH** ({score:+.2f}) — *Forte ottimismo media & catalizzatori positivi*"
    elif score <= -0.35:
        return f"🔴 **BEARISH** ({score:+.2f}) — *Pressione mediatica negativa & catalizzatori avversi*"
    return f"🟡 **NEUTRALE** ({score:+.2f}) — *Flusso notizie bilanciato*"


def render_rating_badge(rating: str) -> str:
    """Returns an analyst consensus badge."""
    r = rating.upper()
    if "STRONG_BUY" in r or "STRONG BUY" in r:
        return "⭐ **STRONG BUY** (Consensus Analisti)"
    elif "BUY" in r or "OVERWEIGHT" in r or "OUTPERFORM" in r:
        return "🟢 **BUY / OUTPERFORM** (Consensus Analisti)"
    elif "HOLD" in r or "NEUTRAL" in r:
        return "🟡 **HOLD / NEUTRAL** (Consensus Analisti)"
    elif "SELL" in r or "UNDERPERFORM" in r:
        return "🔴 **SELL / UNDERPERFORM** (Consensus Analisti)"
    return f"⚪ **{rating}**"
