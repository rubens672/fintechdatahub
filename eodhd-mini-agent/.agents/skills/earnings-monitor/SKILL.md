---
name: earnings-monitor
description: >-
  Monitor upcoming and recent earnings — calendar, consensus trends, analyst revisions, news context, and
  price reactions. Powered by Custom MCP Server (yfinance/Firestore).
  Use when the user asks about earnings season, upcoming reports, earnings surprises, or pre/post-earnings analysis.
version: 1.0.0
---

# Skill: earnings-monitor

## Purpose

Track and analyze earnings events using Custom MCP Server — upcoming earnings calendar (`get_upcoming_earnings`), analyst consensus estimates and EPS revision trends (`get_earnings_trends`), historical prices (`get_historical_stock_prices`), and related news sentiment with zero external API costs.

## Trigger

Activate when the user asks for:
- Upcoming earnings calendar or "who reports this week"
- Earnings consensus expectations, EPS/Revenue estimates, and growth projections
- Earnings trends and analyst revisions (upgrades/downgrades over 7d/30d)
- Pre-earnings or post-earnings price movement and reaction
- Event-driven analysis around earnings dates

## Workflow

1. **Determine scope** — specific ticker(s) or date range for calendar view.
2. **Fetch earnings calendar** — Call custom tool `get_upcoming_earnings` (from_date, to_date, or symbols). Support `force_refresh=True` if desired.
3. **Fetch consensus trends & revisions** — Call custom tool `get_earnings_trends(symbols="<ticker1>,<ticker2>")` for quarterly/annual EPS & revenue estimates, analyst count, and 7d/30d/60d/90d revisions (zero API cost, Firestore cached).
4. **Fetch price reaction & technicals** — Call custom `get_historical_stock_prices` (and `get_technical_indicators` / `get_support_resistance_levels`).
5. **Fetch related news** — Call custom `get_company_news` filtered around earnings dates.
6. **Compile structured earnings report**.

## Output Structure

### Earnings Monitor — [Ticker or Date Range]

**Upcoming Earnings Calendar**
| Date | Company | Ticker | EPS Estimate | Revenue Estimate | Time |
|------|---------|--------|-------------|-----------------|------|

**Consensus Estimates & Analyst Revisions** (for specific tickers)
- **EPS Consensus**: Current Quarter (`0q`), Next Quarter (`+1q`), Full Year (`0y`), Next Year (`+1y`) (Avg, Low, High, Number of Analysts, Expected YoY Growth)
- **Revenue Consensus**: Current Quarter, Next Quarter, Full Year (Avg, Low, High, Expected YoY Growth)
- **EPS Trend History**: Current vs 7d ago vs 30d ago vs 60d ago vs 90d ago
- **Analyst Revisions**: Up/Down revisions in the last 7 days and 30 days

**Price Reaction & Technical Levels**
- Pre-earnings price action & 52-week context
- Key Support and Resistance levels (Classic and Fibonacci pivots)
- Volatility / RSI status

**Related News & Catalysts**
- Top headlines with dates and sentiment

**Key Takeaways**
- Consensus expectations & revision momentum
- Implied growth trajectories
- Risk/reward setup into earnings release

> This is not financial advice. Data is for informational purposes only.

## Tools Used

| Tool | Source | Purpose |
|------|--------|---------|
| `get_upcoming_earnings` | Custom Server (Corporate Actions) | Upcoming earnings calendar & dates |
| `get_earnings_trends` | Custom Server (Firestore / yfinance) | Consensus EPS/Revenue estimates & analyst revisions |
| `get_historical_stock_prices` | Custom Server (Delta-Append / Firestore) | Price reaction & historical movement |
| `get_company_news` | Custom Server (Hybrid / Firestore) | Pre/post-earnings news headlines |
| `get_sentiment_data` | Custom Server (Sentiment Engine / Firestore) | Daily sentiment scores |
