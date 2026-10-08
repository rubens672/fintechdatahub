---
name: congressional-tracker
description: >-
  Track and analyze US Congressional and Senate stock trades (Capitol Hill trading activity).
  Use when the user asks about congressional trading, politician stock purchases,
  Nancy Pelosi trades, or Senate/House financial disclosures.
version: 0.1.0
---

# Skill: congressional-tracker

## Purpose

Track stock transactions filed by members of the United States Congress (House of Representatives and Senate) to detect institutional policy-driven sentiment, sector betting, and potential conflicts of interest.

## Trigger

Activate when the user asks for:
- Congressional stock trades (e.g. "What stocks are politicians buying?")
- Nancy Pelosi or Senate member stock transactions
- Capitol Hill trading activity
- Political insider tracking on specific stocks (e.g. "Did politicians buy NVDA or LMT?")

## Tools Used

1. `get_congressional_trades` (`eodhd_toolset`):
   - Retrieves recent stock transactions reported under the STOCK Act by US Representatives and Senators.
2. `get_fundamentals_data` (`custom_toolset`):
   - Verifies the financial health of the purchased companies.
3. `get_company_news` (`custom_toolset`):
   - Correlates political trades with recent legislative news or government contracts.

## Workflow

1. **Query Political Disclosures**: Call `get_congressional_trades` (filtering by ticker if requested, or fetching the latest market-wide disclosures).
2. **Filter & Classify Trades**:
   - Transaction Type: Purchase vs Sale vs Exchange.
   - Volume / Amount Range: (e.g. $1,000 - $15,000, $50,000 - $100,000, $1M+).
   - Political Role / Committee: (e.g. Armed Services Committee buying defense stocks, Energy & Commerce buying chips).
3. **Cross-Check with Market Catalysts**:
   - Compare transaction filing dates with major legislative bills, defense spending announcements, or CHIPS Act allocations.
4. **Compile Structured Report**:
   - Present a clear markdown table with Politician Name, Chamber (House/Senate), Party, Ticker, Transaction Date, Filing Date, Type, Amount Range, and Strategic Takeaway.

## Output Structure

### 🏛️ Capitol Hill Trading Activity — [Date / Ticker]

| Membro del Congresso | Camera / Partito | Simbolo | Tipo Operazione | Data Scambio | Importo Stimato |
|---|---|---|---|---|---|
| Nancy Pelosi | House (D-CA) | NVDA | Purchase (Call Options) | 2026-07-15 | $1,000,000 – $5,000,000 |
| Dan Crenshaw | House (R-TX) | LMT | Purchase | 2026-07-22 | $50,000 – $100,000 |

### 💡 Analisi Strategica & Catalizzatori Istituzionali
- **Settori Più Acquistati**: Semiconduttori, Difesa, Energia Rinnovabile.
- **Correlazione con Politiche e Contratti**: Commento sui disegni di legge o sussidi governativi rilevanti.
