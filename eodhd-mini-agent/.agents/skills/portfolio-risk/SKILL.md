---
name: portfolio-risk
description: >-
  Analyze portfolio risk — technical indicators, sentiment shifts, insider
  alerts, and volatility metrics using custom analytics and EODHD market data.
  Use when the user asks about portfolio risk, wants to assess holdings, or needs risk/reward analysis.
version: 0.5.0
---

# Skill: portfolio-risk

## Purpose

Perform multi-dimensional risk analysis on a portfolio or individual holdings — combining local technical indicators, sentiment analysis, insider activity signals, and fundamental risk metrics (beta, debt, valuation).

## Trigger

Activate when the user asks for:
- Portfolio risk analysis or assessment
- Risk/reward evaluation of holdings
- Volatility analysis or drawdown risk
- Insider selling alerts for portfolio positions
- Sentiment shifts or deterioration for holdings
- Concentration risk or sector exposure analysis

## Workflow

1. **Get portfolio** — confirm ticker list and optional weights.
2. **Fetch fundamentals & consensus** — Call custom `get_bulk_fundamentals` for beta, market cap, sector, debt/equity metrics (cached on Firestore) and `get_earnings_trends` for analyst downward revision risk.
3. **Fetch technical indicators** — Call custom `get_technical_indicators` (RSI, Bollinger Bands, SMA 50/200) for each holding.
4. **Fetch price history** — Call custom `get_historical_stock_prices` (6-12 months) for returns & volatility calculation.
5. **Fetch sentiment** — Call custom `get_sentiment_data` for recent mood/sentiment shifts.
6. **Fetch insider activity** — Call custom `get_insider_transactions` for executive transactions.
7. **Compile risk report**.

## Output Structure

### Portfolio Risk Analysis — [Date]

**Portfolio Composition**
| Ticker | Weight | Sector | Market Cap | Beta |
|--------|--------|--------|------------|------|

**Risk Metrics**
| Metric | Portfolio | Benchmark (S&P 500) |
|--------|-----------|---------------------|
| Annualized Volatility | — | — |
| Max Drawdown (12M) | — | — |
| Portfolio Beta | — | — |

**Per-Holding Technical & Sentiment Risk Signals**
| Ticker | RSI (14) | Bollinger Bands Status | Sentiment Trend | Insider Net | Analyst Revision Risk |
|--------|----------|------------------------|-----------------|-------------|-----------------------|

**Risk Alerts**
- Overbought/oversold signals (RSI > 70 or < 30)
- Negative sentiment trends or heavy analyst downgrades (downLast30days)
- Significant insider selling
- High concentration in single sector/stock

**Sector Exposure**
| Sector | Weight | Count |
|--------|--------|-------|

**Recommendations**
- Diversification suggestions
- Positions requiring attention

> This is not financial advice. Data is for informational purposes only.

## Tools Used

| Tool | Source | Purpose |
|------|--------|---------|
| `get_bulk_fundamentals` / `get_fundamentals_data` | Custom Server (Firestore / yfinance) | Beta, debt metrics, market cap, sector |
| `get_earnings_trends` | Custom Server (Firestore / yfinance) | Analyst revisions & consensus deterioration risk |
| `get_technical_indicators` | Custom Server (Technical Engine) | RSI, Bollinger Bands, SMA 50/200 |
| `get_historical_stock_prices` | Custom Server (yfinance) | Price history for volatility & drawdowns |
| `get_sentiment_data` | Custom Server (Sentiment Engine / Firestore) | Sentiment scores and trend |
| `get_insider_transactions` | Custom Server (Firestore / yfinance) | Insider selling/buying signals |


