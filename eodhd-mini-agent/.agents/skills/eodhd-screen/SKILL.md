---
name: eodhd-screen
description: >-
  Screen stocks by fundamental and technical criteria using local custom screener
  (Firestore cache / yfinance) — market cap, P/E, dividend yield, sector, beta, roe, and signals.
  Invoke as /eodhd-screen <criteria>.
argument-hint: "<criteria, e.g. high dividend large cap US>"
---

Screen stocks based on these criteria: $ARGUMENTS

Translate the user's criteria into `stock_screener` filters.

**Filter format:** `filters` is an array of `[field, operation, value]` triples (e.g. `[["sector", "=", "Technology"], ["pe", "<", 30]]`).
- Supported operations: `=`, `!=`, `>`, `>=`, `<`, `<=`, `match`.
- Sorting format: `field.direction` (e.g. `market_capitalization.desc`, `pe.asc`, `dividend_yield.desc`).

Workflow:
1. Run local screening with translated filters via custom tool `stock_screener(filters=[...], sort="...", limit=20)`.
2. For top results, fetch in-depth fundamentals and valuation via custom `get_fundamentals_data` if needed.
3. Fetch price pivot levels via `get_support_resistance_levels`.

Present:
- **Filters Applied** — show criteria applied
- **Results Table** — ticker, name, sector, market cap, P/E, dividend yield, beta, ROE
- **Top Deep Dive** — valuation and financial highlights from Firestore cache
- **Summary** — key themes and patterns in results

Include disclaimer: "This is not financial advice. Data is for informational purposes only."
