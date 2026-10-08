# Promemoria Architetturale: Processi e Job Schedulati di Sistema

Questo documento descrive in modo chiaro e sintetico **cosa fanno i singoli processi e cron job automatici** del sistema, con quali orari operano, come interagiscono tra loro e quali problemi quantitativi risolvono.

---

## 1. Tabella Sinottica dei 6 Cron Job (Cloud Scheduler)

Tutti i job sono configurati su fuso orario **America/New_York (Wall Street)** per rimanere perfettamente allineati al mercato anche durante i periodi di discrepanza per l'ora legale (DST Gap).

| # | Nome Job Google Cloud Scheduler | Orario Italia (CET/CEST) | Orario New York (EST/EDT) | Frequenza | Servizio di Destinazione | Scopo Principale in Breve |
|---|---|---|---|---|---|---|
| **1** | `etoro-opening-shield-widen` | **15:10** | **09:10** | Lun-Ven (20 min prima dell'apertura) | `financial-etoro-client` | Allarga lo Stop Loss a -10% per evitare la "caccia agli stop" all'apertura. |
| **2** | `etoro-opening-shield-restore` | **16:00** | **10:00** | Lun-Ven (30 min dopo l'apertura) | `financial-etoro-client` | Ripristina lo Stop Loss quantitativo esatto salvato su Firestore a book disteso. |
| **3** | `etoro-breakeven-guardian` | **16:00 - 22:00** | **10:00 - 16:00** | **Ogni 5 minuti** a mercati aperti | `financial-etoro-client` | Sposta lo Stop Loss a Break-Even Netto (+0.1%) e applica il Trailing Ratchet (+6%). |
| **4** | `alpha-harvest-portfolio-scan` | **16:30** | **10:30** | Lun-Ven (Finestra Goldilocks) | `alpha-harvest-agent` | Diagnosi clinica AI (Gemini + ADK) a 6 pilastri: esaurimento, de-risking e reinvestimento. |
| **5** | `sec-edgar-sync-watcher` | **15:00 - 00:00** | **09:00 - 18:00** | **Ogni 2 ore** nei giorni feriali | `financial-edgar-app` | Rileva nuovi bilanci 10-K/10-Q/8-K, calcola punteggi forensi e vettorizza su Vertex AI. |
| **6** | `news-hub-continuous-ingestion` | **24h / 7 giorni** | **24h / 7 giorni** | **Ogni 15 minuti** continuativo | `financial-user-web` | Scarica e analizza news finanziarie, calcola sentiment e scalda la cache (<15ms). |

---

## 2. Dettaglio Approfondito dei Singoli Job

### 🛡️ Job 1: `etoro-opening-shield-widen`
- **Quando gira**: Ore **15:10 italiane** (09:10 New York), esattamente 20 minuti prima del suono della campana di Wall Street.
- **Cosa fa**:
  1. Legge tutte le posizioni aperte su eToro.
  2. Salva lo Stop Loss quantitativo reale su Firestore nel path `positions_shield/{position_id}`.
  3. Sposta provvisoriamente lo Stop Loss sul broker al **-10%** (*Emergency Disaster Stop*).
- **Perché esiste**: All'apertura (15:30 IT), la volatilità istituzionale e gli spread bid-ask si allargano violentemente. Molti broker e market maker "vanno a caccia degli stop" ravvicinati. Questo job protegge le posizioni aperte dal rischio di essere liquidate ingiustamente nei primi minuti caotici.

---

### 🛡️ Job 2: `etoro-opening-shield-restore`
- **Quando gira**: Ore **16:00 italiane** (10:00 New York), 30 minuti dopo l'apertura.
- **Cosa fa**:
  1. Recupera da Firestore (`positions_shield/{position_id}`) lo Stop Loss quantitativo originale.
  2. Invia la richiesta ad eToro per ripristinare il livello di stop dinamico (o Break-Even/Trailing stop) calcolato dal sistema.
  3. Pulisce lo stato dello scudo.
- **Perché esiste**: Alle 16:00 IT gli spread bid-ask si sono normalizzati e il book è stabile; è il momento sicuro per riattivare la protezione stretta del capitale.

---

### ⚖️ Job 3: `etoro-breakeven-guardian` (Il Vigile Meccanico)
- **Quando gira**: **Ogni 5 minuti**, dalle 16:00 alle 22:00 IT (dopo la fine dell'Opening Shield fino alla chiusura).
- **Cosa fa**:
  1. **Regola del Break-Even Netto**: Se una posizione aperta tocca Target 1 (1.5R o +8.5%), sposta istantaneamente lo Stop Loss a `entry_price × 1.001` (**Break-Even Netto con +0.1% buffer** per coprire spread e commissioni). Il trade diventa a **Rischio Zero Assoluto** ($\overline{L} \le 0$).
  2. **Uncap del Take Profit**: Se un titolo è in regime `RISK_ON` o tocca Target 2, elimina il Take Profit (`clearTakeProfit: true`) per consentire alla posizione di trasformarsi in **Uncapped Alpha Runner**.
  3. **Dynamic Trailing Ratchet (+6% a scaglioni)**: Oltre il Break-Even, man mano che il titolo continua a salire, alza lo Stop Loss in modo unidirezionale:
     - Gain $\ge +12\% \longrightarrow$ Stop Loss alzato a **$+6\%$**
     - Gain $\ge +18\% \longrightarrow$ Stop Loss alzato a **$+12\%$**
     - Gain $\ge +24\% \longrightarrow$ Stop Loss alzato a **$+18\%$** *(es. AMD a $604.96)*
     - Gain $\ge +30\% \longrightarrow$ Stop Loss alzato a **$+24\%$** *(prossimo scaglione di AMD a $635.72)*
- **Caratteristica chiave**: È un processo **deterministico, veloce e matematico**. Non usa l'AI; applica rigorosamente le formule numeriche ogni 5 minuti.

---

### 🧠 Job 4: `alpha-harvest-portfolio-scan` (Il Medico Chirurgo con AI)
- **Quando gira**: Ore **16:30 italiane** (10:30 New York), la cosiddetta "Finestra Goldilocks" (1 ora dopo l'apertura, quando i volumi istituzionali confermano il trend della giornata).
- **Cosa fa**:
  - Esegue un'analisi clinica profonda via **Google ADK e Gemini Flash** basata su **6 Pilastri Quantitativi**:
    1. **Surriscaldamento / Ipercomprato**: Verifica RSI > 75-80 o estensione anomala sopra la banda superiore di Bollinger.
    2. **Volatilità Esplosiva (ATR)**: Rileva se la volatilità intraday è anomala.
    3. **Rischio Evento Imminente**: Controlla il calendario utili (*Earnings Announcement*) entro le successive 48 ore per evitare gap down notturni.
    4. **Segnali Forensi / Form 4 Insider**: Verifica se gli executive dell'azienda stanno vendendo massicciamente azioni sul mercato.
    5. **Estensione ad Alpha Runner**: Conferma la rimozione del Take Profit per i titoli che stanno mostrando forza relativa eccezionale.
    6. **Opportunità di Reinvestimento ad Alpha Superiore**: Se il capitale è fermo su un titolo stagnante, confronta le metriche con i nuovi candidati Top Rank dello Step 1.
- **🛡️ Guardrail Fondamentale (Nessun Acquisto Autonomo)**:
  - Alpha Harvest **NON compra mai in automatico**. 
  - Quando individua un'opportunità di reinvestimento, scrive una proposta su Firestore (`reinvestment_proposals`) nello stato `PENDING_USER_APPROVAL`. Sei sempre e solo **TU** a confermare con un click se eseguire il reinvestimento.

---

### 🔍 Job 5: `sec-edgar-sync-watcher` (L'Ufficio Forense)
- **Quando gira**: Ogni 2 ore durante la giornata di contrattazioni.
- **Cosa fa**:
  1. Si collega ai server ufficiali della SEC EDGAR di Washington.
  2. Scarica gli ultimi bilanci annuali (10-K), trimestrali (10-Q) e documenti straordinari (8-K) depositati dalle società quotate.
  3. Calcola i modelli contabili forensi: **Altman Z-Score** (rischio bancarotta), **Beneish M-Score** (manipolazione bilanci), **Piotroski F-Score** (salute finanziaria) e **Sloan Accruals**.
  4. Vettorizza il testo delle sezioni critiche (*Item 1A Fattori di Rischio, Item 7 MD&A*) tramite Google Vertex AI (`text-embedding-005` a 768 dimensioni) su Firestore Vector Search, per consentire al DAG dello Step 2 di applicare l'Hard Veto su bilanci fraudolenti.

---

### 📰 Job 6: `news-hub-continuous-ingestion` (Il Radar delle Notizie)
- **Quando gira**: Ogni 15 minuti, 24 ore su 24, 7 giorni su 7.
- **Cosa fa**:
  1. Interroga feed ibridi Google News RSS e yfinance con filtro di freschezza stretta.
  2. Esegue l'analisi del sentiment pure-Python basata sui dizionari economico-finanziari (*Loughran-McDonald* e *VADER*).
  3. Mantiene costantemente calda la cache Firestore per fare in modo che quando apri il Financial Cockpit Web la risposta arrivi in meno di 15 millisecondi senza attendere chiamate esterne lente.

---

## 3. Differenza Chiave: Break-Even Guardian vs Alpha Harvest

Spesso ci si confonde tra questi due processi. Ecco la distinzione netta:

| Aspetto | `etoro-breakeven-guardian` (Job 3) | `alpha-harvest-portfolio-scan` (Job 4) |
|---|---|---|
| **Frequenza** | Molto frequente: **Ogni 5 minuti** | Una volta al giorno: **Ore 16:30 IT** |
| **Natura** | **Meccanico / Deterministico** (Algoritmo matematico puro) | **Clinico / Euristico** (AI Gemini Flash + ADK Multi-Tool) |
| **Focus** | **Prezzo e Sicurezza Immediata**: Sposta lo Stop Loss a Break-Even e applica il Trailing Ratchet a gradini del +6%. | **Contesto e Strategia Globale**: Valuta utili imminenti, insider selling SEC Form 4, ipercomprato RSI e rotazione del capitale. |
| **Interferenze?** | **Zero interferenze**: Entrambi condividono la regola aurea (*Ratchet Rule*): lo Stop Loss può solo **salire**, mai scendere. | Se Guardian ha già alzato lo stop a 604$, Alpha Harvest non lo abbasserà mai; potrà solo confermarlo o suggerire un de-risking se ci sono utili domani. |

---

## 4. La Giornata Tipica di un Titolo in Portafoglio (Es. Fuso Italiano)

```
 15:10 IT (09:10 NY) ──► Job 1: Opening Shield allarga SL a -10% (Anti Stop-Hunting)
                          │
 15:30 IT (09:30 NY) ──► CAMPANA DI WALL STREET: Apertura mercato (Oscillazioni assorbite)
                          │
 16:00 IT (10:00 NY) ──► Job 2: Opening Shield ripristina lo Stop Loss quantitativo su book stabile
                          │
 16:00 - 22:00 IT    ──► Job 3: Break-Even Guardian vigila ogni 5 minuti:
                          │        • Prezzo tocca T1 ──► Sposta SL a Break-Even Netto (+0.1%)
                          │        • Prezzo sale oltre ──► Trailing Stop a scaglioni di +6%
                          │
 16:30 IT (10:30 NY) ──► Job 4: Alpha Harvest effettua la visita clinica AI (Earnings, RSI, SEC Form 4)
                          │        • Se tutto ok ──► Conferma Uncapped Runner
                          │        • Se trova nuovo leader ──► Prepara proposta di reinvestimento per te
                          │
 22:00 IT (16:00 NY) ──► CHIUSURA DI WALL STREET: Stop Loss congelato al massimo livello raggiunto
```

---

## 5. Regola Aurea di Sicurezza Operativa: Asimmetria Esecutiva

Il sistema applica un principio ferreo di **Asimmetria Esecutiva tra Uscite ed Entrate**:

### 🔴 TUTTE LE VENDITE SONO 100% AUTOMATICHE (Protezione Immediata del Capitale)
Quando si presenta un pericolo o un segnale di esaurimento, **la velocità di disinvestimento batte qualsiasi esitazione umana**. Il sistema vende in totale autonomia senza attendere conferme:
1. **Hit dello Stop Loss / Trailing Ratchet**: Il broker liquida all'istante la posizione (es. uscita a +18% su AMD o a pareggio).
2. **Hit del Take Profit (in regimi laterali `NEUTRAL_CHOPPY`)**: Il broker liquida il 100% delle quote a Target 1 per incassare il rimbalzo.
3. **Exhaustion Score Critico ($\ge 65/100$)**: Quando Alpha Harvest rileva che il trend è parossistico o esausto (RSI a 80, divergenza ribassista, vendite insider), emette automaticamente il comando `CLOSE_IMMEDIATE` chiudendo la posizione a mercato.
4. **Allerta Earnings Imminenti ($< 72\text{h}$)**: Se la società sta per comunicare i conti trimestrali, Alpha Harvest liquida automaticamente la posizione (`EARNINGS_DE_RISK`) per evitare gap down distruttivi overnight.

### 🟢 TUTTI GLI ACQUISTI SONO 100% SUBORDINATI ALL'APPROVAZIONE DELL'UTENTE
Il sistema **NON compra MAI alcuna azione in autonomia**, garantendo che la cassa non venga mai impegnata all'insaputa del trader:
1. **Nuovi Trade del DAG Quantitativo**: I candidati elaborati dallo Step 5 rimangono in attesa nel Financial Cockpit; gli ordini vengono inoltrati a eToro **solo se l'utente clicca su "Invia Ordini"**.
2. **Proposte di Reinvestimento di Alpha Harvest**: Quando una posizione viene chiusa in profitto liberando cassa, Alpha Harvest genera una proposta strutturata su Firestore (`reinvestment_proposals`) nello stato **`PENDING_USER_APPROVAL`**.
   - Se l'utente clicca su **APPROVA**: l'ordine viene preparato ed eseguito sul candidato ad alpha superiore.
   - Se l'utente clicca su **RIFIUTA** (o non fa nulla): la proposta viene scartata e la liquidità generata rimane **al 100% cassa libera in dollari sul conto**.
