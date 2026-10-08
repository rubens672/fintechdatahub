# Financial eToro Execution Service

**Autore:** Antigravity AI Engineering Team  
**Stack Tecnologico:** Java 21 LTS + Spring Boot 3.3.4 + Project Loom (Virtual Threads) + Spring WebFlux (Netty HTTP/2) + Resilience4j + Google Cloud Firestore SDK  
**Stato Repository:** Modulo Segregato (Enterprise Intellectual Property Protection)

---

## 1. Visione & Ruolo Architetturale

`financial-etoro-service` è il microservizio enterprise autonomo preposto all'esecuzione transazionale ad alta affidabilità degli ordini di borsa sul broker eToro (in modalità Demo e predisposto per Real) per conto delle raccomandazioni generate dallo Step 5 del DAG quantitativo:

- **Strategia Adattiva al Regime a Ordine Unico 100% (Zero Dual-Tranche Splitting):**  
  In `RISK_ON` e `NEUTRAL_CHOPPY` per titoli con setup `SUPER_TREND`, emette un unico ordine al 100% delle quote senza Take Profit (`clearTakeProfit: true`) per consentire un Alpha Runner continuo, gestito dal Break-Even Netto a T1 (+0.1% buffer) e Trailing Stop Ratchet a scaglioni continui di +3% (con cuscinetto di sicurezza del 6%); per i titoli `NO_SUPER_TREND` emette un ordine unico al 100% con Take Profit fisso ancorato su Target 2 (3.0R) e Stop Loss mobile protettivo.
- **Opening Shield Esteso (15:10 - 16:00 IT / 09:10 - 10:00 NY):**  
  Meccanismo proprietario di protezione dalle oscillazioni anomale e spike di apertura di Wall Street. Neutralizza momentaneamente le chiusure premature di Stop Loss persistendo lo stato su Firestore (`positions_shield/{pos_id}`) e ripristinando la piena protezione attiva terminata la fase di volatilità iniziale.
- **Disaccoppiamento Totale del Broker (Zero-Client Coupling):**  
  Attraverso il servizio `PositionCacheService`, il microservizio mantiene un `AtomicReference` in memoria RAM aggiornato tramite un unico poller a frequenza costante (1 richiesta ogni 4-5 secondi). L'intero cluster e gli utenti web interrogano la RAM: l'API del broker non riceve mai chiamate dirette esterne (<15 req/min complessive).
- **Order TTL & Stale Order Purge Guardian:**  
  Monitoraggio e revoca automatica degli ordini pendenti non eseguiti dopo 2 sessioni di borsa (48 ore feriali) per liberare capitale congelato (`frozenCash`).

---

## 2. Diagramma Architetturale delle Responsabilità

```mermaid
flowchart TD
    subgraph Triggers ["Trigger & Consumatori Interni (CoreDNS)"]
        DAG["🧠 ADK DAG Engine (Step 5 Output)"]
        K8sCron["⏱️ Kubernetes CronJob batch/v1<br/>(Shield Start/Stop, BE Check, Purge TTL)"]
        WebLayers["🌐 FastAPI Web Layers (User & Cockpit)"]
    end

    subgraph ServiceCore ["financial-etoro-service (Java 21 / Spring Boot 3.3.4)"]
        Controllers["REST Controllers (/api/etoro/*, /api/scheduler/*)"]
        OrderBuilder["OrderBuilder (Ordine Unico 100% & Regime Aware)"]
        ShieldMgr["OpeningShieldManager (Persistenza Shield Firestore)"]
        BEGuardian["BreakEvenDynamicTrailingGuardian (+3% Ratchet)"]
        TTLPurge["OrderTTLPurgeGuardian (48h Stale Revocation)"]
        RAMCache["PositionCacheService (AtomicReference Singleton RAM)"]
        WebClientNetty["Netty HTTP/2 WebClient (Resilience4j RateLimiter & Retry)"]
    end

    subgraph ExternalBroker ["Infrastruttura Esterna & Persistenza"]
        EToroAPI[("🏦 Broker eToro Public API")]
        Firestore[("🗄️ GCP Firestore Live Layer")]
    end

    DAG -->|POST /api/etoro/order| Controllers
    K8sCron -->|Trigger Schedulati| Controllers
    WebLayers <-->|GET /api/etoro/positions (0.05ms da RAM)| Controllers

    Controllers --> OrderBuilder
    Controllers --> ShieldMgr
    Controllers --> BEGuardian
    Controllers --> TTLPurge
    Controllers --> RAMCache

    OrderBuilder --> WebClientNetty
    ShieldMgr <--> Firestore
    BEGuardian --> WebClientNetty
    TTLPurge --> WebClientNetty
    RAMCache <--> WebClientNetty

    WebClientNetty <-->|Chiamate Cifrate con Rate Limiter| EToroAPI
```

---

## 3. Contratti API REST Esposti

- **`POST /api/etoro/order`**: Ingestion del piano ordini generato dallo Step 5 (`CandidateOrderPlan`) ed emissione atomica dell'ordine unico 100%.
- **`GET /api/etoro/positions`**: Snapshot istantaneo ultra-rapido (<0.05ms) di tutte le posizioni aperte, servito direttamente dalla cache in memoria RAM.
- **`GET /api/etoro/orders/active`**: Elenco degli ordini pendenti attualmente aperti sul broker.
- **`POST /api/scheduler/opening-shield-start`**: Trigger CronJob delle 15:10 IT per l'armamento dell'Opening Shield sui titoli azionari USA.
- **`POST /api/scheduler/opening-shield-release`**: Trigger CronJob delle 16:00 IT per il disarmo dello shield e il consolidamento degli Stop Loss.
- **`POST /api/scheduler/be-check`**: Esecuzione del controllo Break-Even Dynamic Trailing a intervalli di 5 minuti.
- **`POST /api/scheduler/purge-stale-orders`**: Scansione ed eliminazione degli ordini obsoleti pendenti oltre la soglia TTL di 48h.

---

## 4. Motivazione della Segregazione della Codebase (Enterprise IP Protection)

`financial-etoro-service` racchiude le chiavi di sicurezza applicative, la logica transazionale monetaria, i protocolli anti-slippage e gli algoritmi di gestione rischio del broker.  
Per tutelare la proprietà intellettuale e rispettare i criteri di conformità bancaria e finanziaria, il codice sorgente completo è mantenuto rigorosamente privato.
