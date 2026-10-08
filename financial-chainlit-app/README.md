# Financial Chainlit AI Assistant (`financial-chainlit-app`)

Assistente conversazionale quantitativo e di analisi finanziaria basato su **Chainlit**, **Google ADK** e collegato al **Custom Financial MCP Server** (32 tool nativi di mercato con persistenza Firestore).

---

## 🌟 Funzionalità Chiave

1. **Analisi Fondamentale e Bilanci**:
   - Rendiconti, Conti Economici e Stati Patrimoniali per ticker USA.
   - Consensus analisti, target price e revisioni delle stime EPS/Ricavi.
2. **Analisi Tecnica Interattiva**:
   - Candlestick interattivo con **Plotly** (SMA 20/50, Bande di Bollinger, Volume, RSI).
   - Pivot points classici e di Fibonacci.
3. **Macroeconomia & Federal Reserve FRED**:
   - Curva Par Yield dei Treasury USA (1M → 30Y) con rilevamento inversioni e calcolo spread 2Y-10Y.
   - Indicatori macroeconomici (PIL, CPI, Disoccupazione, Fed Funds Rate).
4. **Trasparenza Istituzionale**:
   - Transazioni SEC Form 4 degli insider societari.
   - Trade azionari dei membri del Congresso e Senato USA (STOCK Act).
5. **Workflow Quantitativo a 7 Nodi (Superprompt)**:
   - DAG orchestrato: Regime Macro → Factor Screening → Catalysts/Technicals/Valuation → Rischio ≤ 1% → Backtest.

---

## 🚀 Avvio Locale

```bash
# Entra nella cartella
cd financial-chainlit-app

# Installa le dipendenze
uv pip install -e .

# Avvia l'interfaccia Chainlit con hot-reload
chainlit run app.py -w --port 8000
```

Accedi alla chat da browser su `http://localhost:8000`.

---

## 🧪 Esecuzione dei Test

```bash
cd financial-chainlit-app
pytest tests/
```
