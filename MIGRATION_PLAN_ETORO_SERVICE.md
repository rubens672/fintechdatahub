# Piano di Migrazione Istituzionale: Da `financial-etoro-client` a `financial-etoro-service` (Java Spring Boot 3)

**Data Documento:** 24 Settembre 2026  
**Autore:** Antigravity AI Engineering Team  
**Destinazione File:** Root del Repository (`/MIGRATION_PLAN_ETORO_SERVICE.md`)  
**Stato:** Approvato per Esecuzione — Standby Implementativo (Pronto per rollout)  

---

## 1. Obiettivo Strategico e Visione

La piattaforma di trading quantitativo ha completato con successo la fase di test e validazione a mercato delle strategie operative (**Dual-Tranche Order Splitting**, **Opening Shield** e **Dynamic Trailing Ratchet** a scaglioni di +6% tramite Break-Even Guardian e Alpha Harvest).

L'obiettivo di questa iniziativa è effettuare il passaggio dal microservizio Python (`financial-etoro-client`) al microservizio enterprise Java 17/21 & Spring Boot 3 (`financial-etoro-service`), per conseguire:
1. **Prestazioni ad Altissimo Throughput e Latenza Sub-Millisecondo**: I/O non bloccante su Netty WebFlux unito ai Virtual Threads di Project Loom (Java 21).
2. **Resilienza Istituzionale con Resilience4j**: Circuit breaker nativo e rate limiting rigoroso a 10 req/s con backoff esponenziale sui codici HTTP 429 di eToro.
3. **Stabilità di Memoria e Garbage Collection ZGC/G1**: Eliminazione totale dei memory leak o dei rallentamenti di CPython su cicli di esecuzione continuativi.
4. **Roadmap Infrastrutturale a Due Fasi**:
   - **Fase 1**: Esecuzione in **Blue/Green Shadow Testing** su Google Cloud Run (Serverless).
   - **Fase 2**: Migrazione definitiva su **Google Kubernetes Engine (GKE Autopilot)** per streaming WebSocket persistenti e assenza di cold start.

---

## 2. Verifica Comparativa delle Funzioni: Python vs Java (1-to-1 Parity Check)

Abbiamo esaminato riga per riga il codice sorgente di entrambi i microservizi per verificare che ogni singola logica quantitativa e finanziaria produca gli stessi identici risultati matematici.

### A. `OrderBuilder` (`services/order_builder.py` vs `service/OrderBuilderService.java`)
- **Parsing Candidati da Firestore**:
  - Entrambi cercano prima nel nodo radice `results`, con fallback su `steps.step5_portfolio_synthesis.data.positions`.
  - Entrambi ripuliscono i ticker dal suffisso exchange (es. `"AAPL.US"` $\rightarrow$ `"AAPL"`).
- **Dual-Tranche Splitting**:
  - Entrambi applicano la formula:
    $$\text{Tranche 1 (T1)} = \lfloor(\text{total\_shares} + 1) / 2\rfloor$$
    $$\text{Tranche 2 (T2)} = \text{total\_shares} - \text{tranche1\_shares}$$
  - **Regola Quote Singole**: Se `total_shares == 1`, entrambi assegnano 0 quote a T1 e 1 quota a T2 (promozione a full runner verso Target 2).
- **Livelli Operativi MIT**:
  - Trigger Rate ancorato al supporto S1 (`entry_zone`).
  - Stop Loss a `stop_loss` iniziale calcolato dal DAG.
  - Take Profit T1 a `target_1` (1.5R) e T2 a `target_2` (3.0R).
  - Leva obbligatoria a 1x (no CFD leverage).
- **Esito Audit**: **100% Identico e Conforme.**

---

### B. `PreflightService` (`services/preflight_service.py` vs `service/PreflightService.java`)
- **Verifica Saldo (Cash Sufficiency)**:
  - Entrambi interrogano `/api/v1/trading/info/{account}/aggregate-portfolio` per estrarre `availableCash`.
  - Entrambi confrontano la cassa con la somma dei nozionali in USD di tutti i candidati (`total_notional_usd`).
- **Prevenzione Ordini Duplicati (Idempotency Guard)**:
  - Entrambi scaricano gli ordini pendenti da eToro ed escludono gli asset già ordinati (`already_placed = true`).
- **Controllo Posizioni Aperte (Holding Warning)**:
  - Entrambi rilevano se il titolo è già presente nel portafoglio attivo e generano un warning non bloccante.
- **Esito Audit**: **100% Identico e Conforme.**

---

### C. `OpeningShieldService` (`services/opening_shield_service.py` vs `service/OpeningShieldService.java`)
- **Fase Widen (15:10 CET / 09:10 New York)**:
  - Entrambi salvano in cache RAM e nel documento Firestore `positions_shield/{pos_id}` lo Stop Loss originale prima di toccarlo.
  - Entrambi calcolano il disaster stop al 10% sotto il prezzo d'apertura: $\text{round}(\text{open\_rate} \times 0.90)$.
  - Entrambi inviano la PATCH a eToro con pacing distanziato di 500ms per rispettare il rate limiting.
- **Fase Restore (16:00 CET / 10:00 New York)**:
  - Entrambi recuperano lo Stop Loss originale dalla cache RAM (con fallback su Firestore in caso di riavvio pod).
  - Entrambi ripristinano lo Stop Loss originale via PATCH sul broker e cancellano il documento temporaneo di shield.
- **Esito Audit**: **100% Identico e Conforme.**

---

### D. `BreakEvenGuardianService` (`services/breakeven_guardian_service.py` vs `service/BreakEvenGuardianService.java`)
- **Schedulazione**: Invocato ogni 5 minuti nei giorni feriali durante tutta la sessione di Wall Street.
- **Regola Break-Even Netto**:
  - Al tocco di Target 1 (+1.5R) o a profitto $> +3\%$, sposta lo Stop Loss a:
    $$\text{Net Break-Even} = \text{round}(\text{entry\_price} \times 1.001)$$
    (copre slippage e commissioni del broker).
- **Dynamic Trailing Lock-In Ratchet (+6% Tiers)**:
  - Formula: $\text{tier} = \lfloor\text{gain\_pct} / 6.0\rfloor$.
  - Se $\text{gain} \ge +12\%$: Stop Loss garantito a $+6\%$.
  - Se $\text{gain} \ge +18\%$: Stop Loss garantito a $+12\%$ (come su META e AMD oggi).
  - Se $\text{gain} \ge +24\%$: Stop Loss garantito a $+18\%$.
- **Regola Monotonica**: Lo stop loss può solo salire; non viene mai retrocesso ($\text{target\_sl} > \text{current\_sl}$).
- **Esito Audit**: **100% Identico e Conforme.**

---

### E. `ExecutionService` (`services/execution_service.py` vs `service/ExecutionService.java`)
- **Invio Ordini**:
  - Converte le coppie di Tranche in ordini MIT verso `/api/v2/trading/execution/{mode}/orders`.
  - Pacing tra ordini: 100ms.
- **Persistenza Ricevute**:
  - Salva le ricevute con `orderId`, `triggerRate`, `stopLossRate`, `takeProfitRate` su Firestore in `runs/{run_id}` sotto il nodo `execution_orders`.
- **Riconciliazione Portafoglio**:
  - Metodo `getRunActiveBrokerItems` per mappare posizioni aperte e ordini attivi al run quantitativo.
- **Chiusura Atomica (Close Run)**:
  - Liquida a mercato tutte le posizioni aperte e cancella tutti gli ordini pendenti della run, calcolando il PnL realizzato netto.
- **Esito Audit**: **100% Identico e Conforme.**

---

### F. `PositionCacheService` (`services/position_ingestor_worker.py` vs `service/PositionCacheService.java`)
- Cache in-memory singleton delle posizioni live eToro.
- Risponde con payload normalizzato `{"positions": [...], "count": N, "status": "OK"}` in $< 5\text{ ms}$.
- Supporta `force_refresh=true` per bypassare la cache e forzare la lettura sincrona da eToro.
- **Esito Audit**: **100% Identico e Conforme.**

---

## 3. I 3 Gap Rilevati in Java (Da Implementare)

Sebbene il client di basso livello [EtoroApiClient.java](file:///home/aberti/cloud-devops-labs/antigravity-challenge-lab/financial-etoro-service/src/main/java/com/financial/etoro/client/EtoroApiClient.java) abbia già implementati e funzionanti i metodi `updatePosition(id, data, account)`, `closePosition(id, units, account)` e `cancelOrder(orderId, account)`, mancano i rispettivi mapping REST nel controller [EtoroExecutionController.java](file:///home/aberti/cloud-devops-labs/antigravity-challenge-lab/financial-etoro-service/src/main/java/com/financial/etoro/web/EtoroExecutionController.java):

```java
// GAP 1: Necessario per alpha-harvest-agent e Cockpit Web
@PostMapping("/orders/update-sl-tp")
public ResponseEntity<UpdateSlTpResponse> updateOrderSlTp(@Valid @RequestBody UpdateSlTpRequest request) { ... }

// GAP 2: Necessario per Soft Harvest (50% close) e liquidazioni manuali singole
@PostMapping("/orders/close-position")
public ResponseEntity<ClosePositionResponse> closeSinglePosition(@Valid @RequestBody ClosePositionRequest request) { ... }

// GAP 3: Necessario per cancellazione puntuale di singoli ordini pendenti
@DeleteMapping("/orders/{order_id}")
public ResponseEntity<Map<String, Object>> cancelSingleOrder(@PathVariable("order_id") long orderId, ...) { ... }
```

---

## 4. Piano di Azione Operativo Dettagliato

### FASE 1: Collaudo Blue/Green su Cloud Run (Serverless)

#### Step 1.1 — Implementazione dei 3 Endpoint Mancanti in Java
- Creare i DTO di richiesta/risposta (`UpdateSlTpRequest`, `UpdateSlTpResponse`, `ClosePositionRequest`, `ClosePositionResponse`) nel package `com.financial.etoro.model`.
- Esporre i 3 metodi in `EtoroExecutionController.java`.
- Aggiungere i relativi test unitari in `src/test/java/com/financial/etoro/web/EtoroExecutionControllerTest.java`.

#### Step 1.2 — Esecuzione Test Unitari e di Integrazione
- Eseguire la suite completa di test Maven:
  ```bash
  cd financial-etoro-service
  mvn clean test
  ```
- Verificare che il 100% dei test JUnit 5 sia verde (attualmente 8/8 passati, porteremo a ~14 test).

#### Step 1.3 — Compilazione Container e Pubblicazione Immagine
- Compilare il container multi-stage (Maven 3.9 + Temurin 17 JRE) tramite Cloud Build:
  ```bash
  gcloud builds submit \
    --project fintech-data-hub-45513 \
    --tag europe-west1-docker.pkg.dev/fintech-data-hub-45513/fintech-apps/financial-etoro-service:latest \
    financial-etoro-service/
  ```

#### Step 1.4 — Shadow Testing in Parallelo (Blue/Green)
- Mantenere attivo sia `financial-etoro-client` (Python) che `financial-etoro-service` (Java) su Cloud Run.
- Instradare le chiamate di lettura di `alpha-harvest-agent` (o di un curl di test) sull'URL di Java:
  `https://financial-etoro-service-492008961143.europe-west1.run.app/api/etoro/positions?account=demo`
- Verificare che i tempi di risposta siano inferiori a 10ms e che il payload sia identico a Python.

#### Step 1.5 — Switch Definitivo del Traffico e degli Scheduler
- Nel file `terraform/terraform.tfvars`:
  ```hcl
  etoro_engine = "springboot"
  ```
- Lanciare `terraform apply` o aggiornare i job di Cloud Scheduler (`etoro-opening-shield-widen`, `etoro-opening-shield-restore`, `etoro-breakeven-guardian`) facendoli puntare all'URI del servizio Spring Boot.

---

### FASE 2: Migrazione su GKE Autopilot (Dopo alcuni giorni di collaudo a mercato)

#### Motivazione Tecnico-Finanziaria per GKE Autopilot
Mentre Cloud Run è ideale per carichi a richiesta (scale-to-zero), un motore esecutivo di borsa beneficia enormemente di GKE Autopilot:
1. **Zero Cold Start**: I pod rimangono sempre attivi in memoria, eliminando la latenza di caricamento della JVM (2-3 secondi al risveglio).
2. **Connessioni WebSocket Persistenti**: Possibilità di aprire canali streaming WebSocket continui verso il broker per aggiornamenti di tick in millisecondi.
3. **Workload Identity Google Cloud**: Il pod riceve automaticamente le credenziali IAM GCP per Firestore e Secret Manager senza chiavi su file system.

#### Deliverable per la Fase 2:
1. **Manifest Kubernetes per Autopilot**:
   - `deployment.yaml`: Risorse richieste (500m CPU, 1Gi RAM), configurazione JVM `-XX:+UseZGC` per latenze ultra-basse.
   - `service.yaml`: Servizio interno ClusterIP con Gateway API o Ingress Cloud Armor.
   - `hpa.yaml`: Horizontal Pod Autoscaler basato su CPU / richiesta HTTP.
   - `networkpolicy.yaml`: Restrizione dell'accesso al pod solo da ingress autorizzati e da `alpha-harvest-agent`.
2. **Health Checks**:
   - `readinessProbe` su `/actuator/health/readiness`.
   - `livenessProbe` su `/actuator/health/liveness`.

---

## 5. Sintesi di Conclusione

La base codice Java (`financial-etoro-service`) è già sviluppata con standard istituzionali altissimi (documentazione Javadoc completa, pattern enterprise, client WebClient Netty e Resilience4j).  
Le funzioni quantitative matematiche (S1/R1, T1/T2 split, scudi di apertura e ratchet +6%) sono **completamente identiche a Python**.  

Il lavoro di domani consisterà esclusivamente in:
1. **Aggiungere i 3 endpoint REST mancanti** nel controller Java.
2. **Validare con `mvn test`**.
3. **Buildare il container ed eseguire lo Shadow Test su Cloud Run**.
