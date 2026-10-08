---
name: eodhd-compare
description: >-
  Side-by-side comparison of two or more companies using Custom Fundamentals (Firestore/yfinance),
  Analyst Consensus Trends (get_earnings_trends), and technical performance. Compares valuation, growth, financials, profitability, and dividends.
  Invoke as /eodhd-compare <ticker1> <ticker2> ...
argument-hint: "<ticker1> <ticker2> [ticker3 ...]"
---

Compare the following companies side-by-side: $ARGUMENTS

Parse the arguments as ticker symbols separated by spaces or commas (e.g., "AAPL MSFT" or "AAPL.US, MSFT.US").

For the companies, fetch:
1. **Bulk Fundamentals** — Use custom tool `get_bulk_fundamentals(exchange="US", symbols="<ticker1>,<ticker2>,...")` to retrieve all fundamental and valuation metrics in a single batch (cached in Firestore).
2. **Analyst Consensus & Earnings Trends** — Use custom tool `get_earnings_trends(symbols="<ticker1>,<ticker2>,...")` to compare EPS/revenue estimates, expected growth, and revision trends.
3. **Price Action & Technicals** — Use custom `get_historical_stock_prices` and `get_technical_indicators` / `get_support_resistance_levels`.

Present a side-by-side comparison table covering:

**Valuation**
| Metric | [Ticker 1] | [Ticker 2] | ... |
- P/E (TTM), Forward P/E, P/S, P/B, EV/EBITDA

**Financials & Growth**
| Metric | [Ticker 1] | [Ticker 2] | ... |
- Revenue, Net Income, EPS, Revenue Growth YoY, Forward EPS Growth

**Analyst Consensus (from get_earnings_trends)**
| Metric | [Ticker 1] | [Ticker 2] | ... |
- Next Year EPS Estimate (`+1y`), Expected Revenue Growth, Revision Momentum (Up/Down last 30d)

**Profitability**
| Metric | [Ticker 1] | [Ticker 2] | ... |
- Gross Margin, Operating Margin, Net Margin, ROE, ROA

**Performance & Technicals**
| Metric | [Ticker 1] | [Ticker 2] | ... |
- 30d return, 52-week range, RSI (14), SMA50/SMA200 status

**Dividends**
| Metric | [Ticker 1] | [Ticker 2] | ... |
- Dividend Yield, Payout Ratio, Ex-Date

**Summary**: 3-5 bullet points highlighting key differences and which company looks stronger on each dimension.

Include disclaimer: "This is not financial advice. Data is for informational purposes only."

