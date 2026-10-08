# Financial User Web Portal

**Autore:** Antigravity AI Engineering Team  
**Stack Tecnologico:** React 18 (Vite) + FastAPI (Python 3.12) + Google Cloud Firestore SDK  
**Ruolo Architetturale:** Master Web Portal pubblico & interfaccia utente read-only ad alte prestazioni per la piattaforma FintechDataHub.

---

## 1. Panoramica del Modulo

`financial-user-web` costituisce la vetrina pubblica e il portale di consultazione in tempo reale della piattaforma quantitativa. È progettato per garantire visualizzazioni reattive, aggiornamenti quote a bassa latenza e completa segregazione architetturale dai microservizi di esecuzione ordini:

- **Zero-Client Coupling con Broker Esterni:** L'interfaccia utente non effettua MAI chiamate verso l'API pubblica di eToro o verso provider a pagamento. Tutte le quote di mercato e le posizioni aperte sono servite dalla cache in memoria RAM del backend FastAPI o trasmesse via WebSocket interno.
- **Accesso Read-Only Diretto a Google Cloud Firestore:** Interroga in sola lettura le collezioni di persistenza (`runs`, `positions_shield`, `etoro_state/live_positions`, `audit_runs`) bloccando qualsiasi mutazione o injection.
- **Design System Vanilla CSS & Glassmorphism:** Interfaccia istituzionale dark mode, priva di dipendenze pesanti come TailwindCSS, ottimizzata per caricamenti istantanei e fluidità su ogni viewport.

---

## 2. Funzionalità Chiave

1. **Live Market Screener:**  
   Tabella interattiva dei titoli monitorati e delle posizioni attive a mercato con calcolo P&L real-time, data e ora di acquisto (`DD/MM/YYYY HH:mm`), regime macro (`RISK_ON`, `RISK_OFF`, `NEUTRAL_CHOPPY`) e stato operativo (`OPEN`, `BREAK_EVEN`, `TRAILING`, `STOPPED_OUT`, `TARGET_HIT`).
2. **Interactive Candlestick Explorer:**  
   Grafico a candele giapponesi interattivo con tracciamento esatto dei livelli operativi quantitativi dello Step 5:
   - **Prezzo di Entry (S1 / Pullback EMA20)**
   - **Stop Loss Dinamico Wilder ATR** (con floor al 3.5% e cap al 9.0%)
   - **Take Profit 1 (1.5R)** & **Take Profit 2 (3.0R - Alpha Runner)**
   - **Supporti / Resistenze Pivot Point Classici e Fibonacci**
3. **Quant Audit Lab & Trade Post-Mortem Explorer:**  
   Pannello retrospettivo avanzato per l'analisi clinica di Win Rate, Profit Factor, Sharpe Ratio, Shadow Audit sui titoli scartati dai filtri forensi/tecnici e matrice di attribuzione alpha per nodo DAG.
4. **Financial Copilot Conversazionale:**  
   Integrazione nativa dell'assistente quantitativo basato su Google ADK per query analitiche in linguaggio naturale.

---

## 3. Struttura del Progetto

```
financial-user-web/
├── backend/                  # Backend FastAPI Read-Only
│   ├── main.py               # Router REST (/api/runs, /api/market/ticks, /api/audit, ecc.)
│   └── ...                   # Client Firestore e data mapper
├── src/                      # Frontend React 18 + Vite
│   ├── components/           # Componenti UI (Screener, CandlestickChart, AuditLab, Modali)
│   ├── styles/               # Design tokens CSS, dark theme & animations
│   ├── App.jsx               # Root Application Component
│   └── main.jsx              # Entrypoint Vite
├── public/                   # Asset statici (loghi, favicon)
├── Dockerfile                # Multi-stage production build (Vite + Uvicorn)
├── package.json              # Dipendenze Node.js
└── vite.config.js            # Configurazione Vite
```

---

## 4. Installazione & Esecuzione Locale

### Prerequisiti:
- Node.js 18+ e npm
- Python 3.12+ con `uv` o `venv`
- Credenziali Google Cloud (Application Default Credentials con accesso a Firestore)

### Avvio Frontend (Development Server):
```bash
npm install
npm run dev
# L'applicazione risponderà su http://localhost:5173
```

### Avvio Backend FastAPI:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt  # oppure uv pip install fastapi uvicorn google-cloud-firestore
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 5. Build di Produzione & Containerizzazione

Il container Docker è basato su un multi-stage build ottimizzato:
1. **Stage 1 (Node.js Build):** Compila gli asset React in bundle statici ottimizzati (`/dist`).
2. **Stage 2 (Python 3.12-slim Runtime):** Copia i file statici compilati e serve sia le API REST FastAPI che il frontend statico su un'unica porta (8000), garantendo latenza minima su Google Kubernetes Engine (GKE Autopilot) e Cloudflare Tunnel.

```bash
docker build -t financial-user-web:latest .
docker run -p 8000:8000 -e PORT=8000 financial-user-web:latest
```
