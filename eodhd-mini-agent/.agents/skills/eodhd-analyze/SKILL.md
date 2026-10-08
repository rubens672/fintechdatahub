---
name: eodhd-analyze
description: >-
  Comprehensive single-company analysis using Custom Fundamentals (yfinance/Firestore),
  Analyst Consensus & Revisions (get_earnings_trends), DGR Dividend Analytics, local Technical Indicators & Pivot Points, and news sentiment.
  Invoke as /eodhd-analyze <ticker>.
argument-hint: "<ticker or company name>"
---

Perform a comprehensive analysis of the company $ARGUMENTS.

Use the `company-brief` skill workflow:
1. Fetch company fundamentals (profile, valuation, financials) via custom `get_fundamentals_data` or `get_bulk_fundamentals`. (Pass `force_refresh=True` if an immediate live refresh is requested).
2. Fetch analyst consensus estimates and revision trends via custom `get_earnings_trends(symbols="<ticker>")`.
3. Fetch dividend analytics (DGR CAGR 1Y/3Y/5Y/10Y, Aristocrat continuity streak, annualized payout) via custom `get_dividend_analytics(ticker="<ticker>")` or `get_historical_dividends(ticker="<ticker>", include_analytics=True)`.
4. Fetch technical indicators (RSI, SMA 50/200, Bollinger Bands) and Pivot points via custom `get_technical_indicators` and `get_support_resistance_levels`.
5. Fetch price history via custom `get_historical_stock_prices` (Delta-Append cached on Firestore).
6. Fetch recent news with sentiment via `get_company_news` and `get_sentiment_data`.
7. Fetch insider transactions (last 90 days) via `get_insider_transactions` and congressional trades via `get_congressional_trades`.

Present the results as a structured company brief with:
- Company profile and business description
- Valuation snapshot table (P/E, Forward P/E, P/S, P/B, EV/EBITDA, dividend yield)
- Dividend Growth & Payout Continuity (DGR 1Y/3Y/5Y/10Y, Aristocrat streak, frequency)
- Financial highlights (revenue, margins, ROE, growth)
- Analyst consensus expectations (EPS/Revenue forecasts, revisions, price targets)
- Technical analysis summary (moving averages, RSI status, key support/resistance levels)
- Price action summary with 52-week context
- Top news headlines with sentiment
- Insider & Congressional activity summary
- 3-5 key takeaways

If the ticker format is ambiguous, resolve it (e.g., "Apple" → AAPL.US or AAPL).

Include disclaimer: "This is not financial advice. Data is for informational purposes only."
