---
name: system-diagnostics
description: >-
  Run deep automated health checks and API diagnostics across all 26 financial tools,
  data subsystems, latencies, and schemas. Use when the user asks to test the system,
  check API status, verify service health, or diagnose data connections.
version: 0.1.0
---

# Skill: system-diagnostics

## Purpose

Execute live automated verification tests across all financial tools, databases, and upstream APIs (yfinance, FRED API, RSS feeds, Black-Scholes Greeks, Firestore persistence, and live prices), producing an actionable traffic-light health report with latency metrics.

## Trigger

Activate when the user asks for:
- System health check or diagnostics (e.g. "Controlla lo stato di salute del sistema", "Verifica le API")
- "Is everything working?" or "Are all data providers online?"
- Latency and uptime monitoring across market subsystems
- Schema integrity check

## Tools Used

1. `system_health_check` (`custom_toolset`):
   - Tests all 22 functional subsystems asynchronously.
   - Measures response latencies in milliseconds.
   - Verifies schema completeness and presence of non-empty data.

## Workflow

1. **Call `system_health_check`**: Execute the diagnostic runner.
2. **Compile Diagnostic Report**:
   - Present the overall status indicator (🟢 `100% HEALTHY`, 🟡 `OPTIMAL`, 🔴 `DEGRADED`).
   - Format a clean markdown table showing Subsystem, Tool, Status (✓ OK, ⚠️ WARN, ❌ FAIL), Latency (ms), and Verification Details.
   - Provide summary metrics: Total Subsystems, Passed, Warnings, Failures, and Timestamp.

## Output Structure

### 🚀 Financial Intelligence Server — Diagnostica & Stato di Salute

- **Stato Complessivo**: 🟢 **`100% HEALTHY`** (Punteggio: `100.0%`)
- **Sottosistemi Verificati**: `22 / 22 Operativi`
- **Data & Ora**: `[Timestamp UTC]`

| Area Funzionale | Servizio / Tool | Status | Latenza | Dettagli & Schema |
|---|---|:---:|:---:|---|
| Database & Persistenza | `GCP Firestore / Emulator` | **✓ OK** | 12.0 ms | Connessione Firestore verificata e cache operativa |
| Prezzi Real-Time | `get_live_price_data` | **✓ OK** | 85.0 ms | Quotazione AAPL.US e variazioni valide |
| Fondamentali & Bilanci | `get_fundamentals_data` | **✓ OK** | 6.0 ms | Stato Patrimoniale, Conto Economico e Multipli estratti |
| Macroeconomia | `get_macro_indicator` | **✓ OK** | 3.0 ms | FRED API Federal Reserve connessa (VIX: 21.0) |
| Opzioni & Greci | `get_us_options_eod` | **✓ OK** | 430.0 ms | Black-Scholes Delta/Gamma/Theta/Vega calcolati |
| ... | ... | ... | ... | ... |
