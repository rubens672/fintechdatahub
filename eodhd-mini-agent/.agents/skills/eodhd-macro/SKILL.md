---
name: eodhd-macro
description: >-
  Macro-economic dashboard using Custom FRED API & Firestore data — GDP, CPI, unemployment, interest
  rates, Treasury yield curve, and the economic events calendar.
  Invoke as /eodhd-macro [country or region].
argument-hint: "[country or region, e.g. USA, EU, G7]"
---

Generate a macro-economic dashboard using FRED macro data.

Use the `macro-dashboard` skill workflow:

1. Fetch key macro indicators for USA (and other countries if specified in $ARGUMENTS) via custom tool `get_macro_indicator`:
   - GDP growth (gdp / real_gdp)
   - Inflation / CPI (cpi / inflation)
   - Unemployment (unemployment)
   - Federal funds rate / policy rate (interest_rate / fed_funds)
   - Money supply (m2)
   - Industrial production (industrial_production)

2. Fetch US Treasury yield curve:
   - Bill rates (`get_ust_bill_rates`)
   - Yield curve rates (`get_ust_yield_rates`)

3. Fetch upcoming economic events via custom tool `get_economic_events`:
   e.g. `--from-date <today> --to-date <today+14d> --country US` — otherwise the API returns arbitrary
   far-future events with empty fields. Field mapping (the API does NOT use `event`/`forecast` keys):
   - event name → `type`
   - forecast/consensus → `estimate`
   - previous → `previous`, actual → `actual` (null for not-yet-released)

Present:
- **Key Indicators Table** with latest value, previous, YoY change, trend arrow
- **Yield Curve Table** with all standard maturities + 2Y-10Y spread + curve shape assessment
- **Real Yields** — inflation-adjusted yields for 5Y, 10Y, 30Y
- **Upcoming Economic Events** — next 10 events with date, country, forecast, previous
- **Economic Narrative** — 3-5 bullet point summary of current economic state

If $ARGUMENTS specifies countries (e.g., "USA vs EU" or "G7"), include multi-country comparison.

Include disclaimer: "This is not financial advice. Data is for informational purposes only."
