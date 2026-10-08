---
name: stock-screener
description: >-
  Screen stocks by fundamental and technical criteria using local Firestore cache and custom MCP server —
  filter by market cap, P/E, dividend yield, sector, beta, roe, signals, and enrich with deep balance sheets.
  Use when the user wants to filter stocks matching specific financial criteria.
version: 0.6.0
---

# Skill: stock-screener

## Purpose

Find and rank stocks matching user-defined fundamental and technical criteria using the custom local `stock_screener` tool (backed by Firestore cache and yfinance), then enrich top results with detailed financial statements and pivot levels.

## Trigger

Activate when the user asks for:
- Stock screening or filtering ("find tech stocks with P/E under 25")
- "Best dividend stocks" or "undervalued growth stocks"
- Sector-specific stock rankings (e.g. "Top US healthcare companies by market cap")
- Valuation-based filtering (P/E, P/S, P/B, EV/EBITDA, ROE)
- Signal-based screening (high dividend, low P/E, beta)
- Watchlist generation

## Workflow

1. **Translate user criteria to filters** — Map natural language to JSON filter triples.
2. **Execute stock_screener** — Call custom tool `stock_screener(filters=[...], sort="field.direction", limit=50)`.
3. **Review & Display results** — Present matching companies in a clear structured table.
4. **Enrich top picks** (optional for top 3-5):
   - Call `get_fundamentals_data` for in-depth quarterly/yearly financials and analyst recommendations.
   - Call `get_support_resistance_levels` for technical pivot points.
5. **Compile screener report** with insights and key takeaways.

## Filter Syntax (critical)

`filters` must be passed as an array of `[field, operation, value]` triples:
- **Operations supported**: `=`, `!=`, `>`, `>=`, `<`, `<=`, `match`.
- **Sorting format**: `field.direction` (e.g., `market_capitalization.desc`, `pe.asc`, `dividend_yield.desc`, `roe.desc`).

### Supported Filter Fields

| Field Name | Description | Type | Examples |
|------------|-------------|------|----------|
| `market_capitalization` | Market capitalization in USD | Number | `[">", 100000000000]` (100B+) |
| `pe` | Trailing Price/Earnings ratio | Number | `["<", 25]`, `[">", 0]` |
| `forward_pe` | Forward P/E ratio | Number | `["<", 20]` |
| `dividend_yield` | Dividend yield as fraction or % | Number | `[">", 0.02]` (2%+) |
| `sector` | Business sector | String | `["=", "Technology"]`, `["=", "Healthcare"]` |
| `industry` | Specific industry | String | `["=", "Semiconductors"]` |
| `beta` | Beta coefficient (volatility) | Number | `["<", 1.0]` (low beta) |
| `roe` | Return on Equity (TTM) | Number | `[">", 0.15]` (15%+) |
| `roa` | Return on Assets (TTM) | Number | `[">", 0.05]` |
| `pb` | Price to Book ratio | Number | `["<", 3.0]` |
| `ps` | Price to Sales ratio | Number | `["<", 5.0]` |
| `earnings_share` | Earnings Per Share (EPS) | Number | `[">", 2.0]` |
| `revenue` | Total Revenue (TTM) | Number | `[">", 10000000000]` |
| `ebitda` | EBITDA | Number | `[">", 5000000000]` |
| `exchange` | Exchange code | String | `["=", "US"]`, `["=", "NASDAQ"]` |
| `code` / `name` | Ticker or Company name | String | `["match", "Apple"]` |

## Example Screening Queries

```python
# 1. Mega-cap tech stocks sorted by market cap
stock_screener(
    filters=[["sector", "=", "Technology"], ["market_capitalization", ">", 500000000000]],
    sort="market_capitalization.desc",
    limit=10
)

# 2. Undervalued dividend payers (P/E < 25, Dividend Yield > 2%)
stock_screener(
    filters=[["pe", "<", 25], ["pe", ">", 0], ["dividend_yield", ">", 0.02]],
    sort="dividend_yield.desc",
    limit=15
)

# 3. High profitability leaders (ROE > 20%, low debt/beta)
stock_screener(
    filters=[["roe", ">", 0.20], ["beta", "<", 1.2]],
    sort="roe.desc",
    limit=10
)
```

## Output Structure

### Stock Screener Results — [Criteria Description]

**Filters Applied:**
- Sector: Technology | Market Cap > $100B | P/E < 35

**Results ([N] matches)**
| # | Ticker | Name | Sector | Market Cap | P/E | Div Yield | Beta | ROE |
|---|--------|------|--------|------------|-----|-----------|------|-----|

**Top Picks — Key Highlights**
- **[Ticker 1]**: Valuation summary, key competitive advantage, analyst sentiment.
- **[Ticker 2]**: Financial strength, margin profile, technical pivot level.

**Summary Insights**
- 3-4 bullet points on trends observed across matching companies.

> This is not financial advice. Data is for informational purposes only.

## Tools Used

| Tool | Source | Purpose |
|------|--------|---------|
| `stock_screener` | Custom Server (Firestore / yfinance) | Local multi-criteria filtering, ranking, and sorting |
| `get_bulk_fundamentals` | Custom Server (Firestore / yfinance) | Batch fundamental metrics across exchange |
| `get_fundamentals_data` | Custom Server (Firestore / yfinance) | In-depth balance sheet & cash flow for top picks |
| `get_support_resistance_levels` | Custom Server (Technical Engine) | Technical pivot points & support/resistance |
| `get_live_price_data` | EODHD | Real-time quote validation |
