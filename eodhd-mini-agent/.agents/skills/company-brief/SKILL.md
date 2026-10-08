---
name: company-brief
description: >-
  Generate a comprehensive company snapshot combining custom fundamentals (yfinance/Firestore),
  technical levels, DGR dividend growth metrics, market news, sentiment, and insider data.
  Use when the user asks about a specific company, wants a stock overview,
  or needs a quick investment brief.
version: 1.0.0
---

# Skill: company-brief

## Purpose

Build a comprehensive company brief combining custom fundamental data (yfinance + Firestore cache), local technical analysis levels, DGR dividend growth analytics, and local market intelligence into a single actionable snapshot with zero external API credit costs.

## Trigger

Activate when the user asks for:
- Company overview, profile, or "tell me about [ticker]"
- Stock summary or investment brief
- Company fundamentals with financial statements
- "What does [company] do?" with valuation context
- Dividend sustainability, Dividend Aristocrats streak, or DGR analysis
- Quick due diligence on a ticker

## Workflow

1. **Identify the ticker** — resolve symbol (e.g., `AAPL.US` or `AAPL`).
2. **Fetch fundamentals** — Call custom tool `get_fundamentals_data` (or `get_bulk_fundamentals`) for profile, valuation metrics, and financial highlights (cached on Firestore / yfinance). Support `force_refresh=True` if fresh data is requested.
3. **Fetch analyst consensus & earnings trends** — Call custom tool `get_earnings_trends(symbols="<ticker>")` for quarterly/yearly EPS & revenue estimates, growth forecasts, and revision momentum.
4. **Fetch dividend growth & continuity** — Call custom tool `get_dividend_analytics(ticker="<ticker>")` or `get_historical_dividends(ticker="<ticker>", include_analytics=True)` for DGR (1Y, 3Y, 5Y, 10Y), payout streaks, and frequency.
5. **Fetch technical levels** — Call custom tool `get_support_resistance_levels` (Classic and Fibonacci pivot points, 52w range) and/or `get_technical_indicators`.
6. **Fetch recent prices** — Call custom tool `get_historical_stock_prices` (Delta-Append cached) or `get_live_price_data` (fast-path market hours cached).
7. **Fetch news & sentiment** — Call custom tool `get_company_news` (limit 10) and custom tool `get_sentiment_data`.
8. **Fetch insider & political activity** — Call custom tool `get_insider_transactions` (SEC Form 4) and `get_congressional_trades` to check executive and Congressional buying/selling.
9. **Compile brief** using the structure below.

## Output Structure

### [Company Name] (`TICKER.EXCHANGE`) — Company Brief

**Profile**
- Sector, Industry, Country, Exchange
- Market Cap, Enterprise Value
- Employees, IPO Date
- Business description (2-3 sentences)

**Valuation Snapshot**
| Metric | Value |
|--------|-------|
| P/E (TTM) | — |
| Forward P/E | — |
| P/S | — |
| P/B | — |
| EV/EBITDA | — |
| Dividend Yield | — |

**Dividend Growth & Payout Continuity**
- Annualized Payout Rate & Payment Frequency (e.g., Quarterly)
- DGR 1Y, 3Y, 5Y, 10Y (CAGR Growth Rates)
- Consecutive Payout Years & Consecutive Growth Streak (Aristocrat Status)
- Total Cumulative Payout per Share

**Financial Highlights (TTM)**
- Revenue, Net Income, EPS
- Revenue Growth YoY
- Gross Margin, Operating Margin, Net Margin
- ROE, ROA

**Analyst Consensus & Earnings Expectations**
- Consensus EPS Estimates (Current Q, Next Q, Full Year)
- Consensus Revenue Estimates & YoY Growth
- Analyst Revision Trend (Up/Down in last 7d & 30d)
- Wall Street Target Price / Analyst Ratings (from fundamentals)

**Technical Price Levels & Pivots**
- Current Price, 52-week High/Low
- Classic Pivot Points (PP, R1, S1)
- Fibonacci Pivot Points (PP, R1, S1)

**Recent News & Sentiment**
- Top headlines with dates and sentiment
- Average sentiment trend

**Insider & Congressional Activity**
- Recent insider buys/sells (last 90 days)
- Congressional disclosures (STOCK Act)

**Key Takeaways**
- 3-5 bullet points summarizing the investment picture

> This is not financial advice. Data is for informational purposes only.

## Tools Used

| Tool | Source | Purpose |
|------|--------|---------|
| `get_fundamentals_data` | Custom Server (Firestore / yfinance) | Profile, valuation, full financials |
| `get_earnings_trends` | Custom Server (Firestore / yfinance) | EPS & Revenue consensus estimates, analyst revisions |
| `get_dividend_analytics` | Custom Server (Corporate Actions Engine) | DGR CAGR (1Y/3Y/5Y/10Y), Aristocrat streaks, payout rate |
| `get_support_resistance_levels` | Custom Server (Technical Engine) | Key pivot points & support/resistance |
| `get_technical_indicators` | Custom Server (Technical Engine) | SMA, EMA, RSI, MACD |
| `get_historical_stock_prices` | Custom Server (Delta-Append / Firestore) | Historical daily price action |
| `get_live_price_data` | Custom Server (Fast-Path Dynamic TTL) | Real-time quote & intraday prices |
| `get_company_news` | Custom Server (Hybrid / Firestore) | Recent headlines + news |
| `get_sentiment_data` | Custom Server (Sentiment Engine / Firestore) | Daily sentiment scores |
| `get_insider_transactions` | Custom Server (Firestore / yfinance) | SEC Form 4 insider trading activity |
| `get_congressional_trades` | Custom Server (Congressional Engine) | US Congress & Senate STOCK Act disclosures |
