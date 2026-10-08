# Standard di Documentazione Javadoc e Proporzionalità Architetturale

Questo documento specifica le linee guida obbligatorie per la documentazione del codice sorgente Java, basate sulla regola della **proporzionalità dell'importanza**.

---

## 1. Regola della Proporzionalità

> **Principio Guida:**  
> *Maggiore è l'importanza e la complessità architetturale della classe o dell'interfaccia nel sistema, più estesa, esaustiva, dettagliata e completa deve essere la sua descrizione principale.*

### Livello 1: Componenti Core Architetturali (Tier 1 - Critico / Fondamentale)
**Tipologia**: Engine di calcolo, Microservizi core, Client di comunicazione di rete, Orchestratori di workflow, Domain Services strategici, Aggregate Roots.

**Requisiti di Documentazione**:
La descrizione Javadoc di classe deve essere un vero e proprio documento architetturale incorporato nel codice, comprendente:
1. **Visione d'Insieme & Ruolo Sistemico**: Spiegazione dettagliata del contesto, perché il componente esiste e quale parte del dominio/infrastruttura governa.
2. **Responsabilità Principali**: Elenco puntato di tutte le macro-responsabilità demandate alla classe.
3. **Modello di Concorrenza & Thread-Safety**: Dichiarazione esplicita sulla sicurezza multithreading (es. *thread-safe*, *stateful*, *immutable*, compatibilità con Virtual Threads Project Loom).
4. **Invarianti di Classe & Pre-condizioni**: Gli stati validi ammessi e le condizioni che devono essere sempre verificate.
5. **Esempio di Utilizzo Concreto (`{@code ...}`)**: Esempio pratico e funzionante di come istanziare, configurare e invocare il componente.
6. **Politica di Tolleranza ai Guasti & Resilienza**: Come gestisce timeout, retry esponenziale, circuit breaker e fallback.
7. **Riferimenti Incrociati (`@see`)**: Puntatori ai contratti di interfaccia, DTO associati ed eventi emessi.

#### Esempio Tier 1:
```java
/*
 * Copyright (c) 2026 Berti AI & Cloud Architecture. All rights reserved.
 */
package com.financial.etoro.service;

import ...;

/**
 * <h1>Motore di Gestione del Rischio e Dimensionamento di Portafoglio</h1>
 *
 * <p>Il {@code PortfolioRiskEngine} rappresenta il componente architetturale cardine per il
 * calcolo quantitativo dell'allocazione del capitale, l'applicazione del modello Equal-Dollar Risk
 * Parity e la generazione automatica delle protezioni asimmetriche di Stop Loss e Take Profit.</p>
 *
 * <h2>1. Ruolo Architetturale & Responsabilità</h2>
 * <ul>
 *   <li><b>Risk Sizing</b>: Dimensiona la quantità di quote azionarie (shares) per ciascun candidato
 *       ammesso dal DAG quantitativo, limitando rigorosamente il rischio massimo all'1.0% del Net Asset Value.</li>
 *   <li><b>Protezioni Asimmetriche ATR</b>: Posiziona lo Stop Loss dinamico basato sull'ATR di Wilder a 14 periodi
 *       (distanza 2.2 * ATR_14) con vincolo di floor al 3.5% e ceiling al 9.0%.</li>
 *   <li><b>Order Splitting Dual-Tranche</b>: Sdoppia ogni operazione in Tranche 1 (50% target Take Profit T1)
 *       e Tranche 2 (50% runner target Take Profit T2 con abilitazione Break-Even Guardian).</li>
 * </ul>
 *
 * <h2>2. Modello di Concorrenza e Thread-Safety</h2>
 * <p>Questa classe è <b>completamente thread-safe</b>. Non mantiene alcuno stato mutabile interno.
 * Tutte le dipendenze iniettate sono immutabili ({@code final}) e l'elaborazione dei candidati
 * sfrutta stream paralleli o Virtual Threads senza sezioni critiche sincronizzate bloccanti.</p>
 *
 * <h2>3. Esempio di Utilizzo</h2>
 * <pre>{@code
 * PortfolioRiskEngine riskEngine = new PortfolioRiskEngine(volatilityService, capitalRepository);
 * RiskSizingResult result = riskEngine.calculatePositionSizing(
 *     new CandidateAsset("NVDA", new BigDecimal("120.50"), new BigDecimal("3.45")),
 *     new AccountCapital(new BigDecimal("100000.00"), Currency.USD)
 * );
 * }</pre>
 *
 * @author Berti AI & Cloud Architecture
 * @version 1.0.0
 * @since 2026-09-21
 * @see CandidateAsset
 * @see RiskSizingResult
 * @see VolatilityService
 */
public final class PortfolioRiskEngine { ... }
```

---

### Livello 2: Componenti di Dominio, Value Objects, DTO, Configurazioni (Tier 2 - Medio)
**Tipologia**: Entità di dominio, Value Objects (Java Records), Request/Response DTO, Componenti di Configurazione Spring, Mapper.

**Requisiti di Documentazione**:
- Spiegazione del significato di business o tecnico del dato rappresentato.
- Descrizione esplicita delle regole di immutabilità e validazione.
- Spiegazione dei vincoli sui singoli campi.

#### Esempio Tier 2:
```java
/*
 * Copyright (c) 2026 Berti AI & Cloud Architecture. All rights reserved.
 */
package com.financial.etoro.model;

import java.math.BigDecimal;
import java.util.Objects;

/**
 * Rappresenta una tranche esecutiva per la strategia di trading quantitativo Dual-Tranche.
 *
 * <p>Oggetto di valore immutabile che incapsula la frazione di capitale, la quantità di quote,
 * il livello di Stop Loss e il Target Price prefissato (T1 o T2). Qualsiasi istanza creata
 * è garantita essere valida e non modificabile.</p>
 *
 * @param trancheType tipologia di tranche (T1 per primo take profit, T2 per alpha runner)
 * @param units quantitativo di quote azionarie, deve essere strettamente positivo
 * @param entryPrice prezzo stimato d'ingresso sul supporto
 * @param stopLossPrice prezzo di stop loss dinamico quantitativo
 * @param takeProfitPrice prezzo di take profit prefissato per la specifica tranche
 */
public record ExecutionTranche(
    TrancheType trancheType,
    BigDecimal units,
    BigDecimal entryPrice,
    BigDecimal stopLossPrice,
    BigDecimal takeProfitPrice
) {
    public ExecutionTranche {
        Objects.requireNonNull(trancheType, "trancheType must not be null");
        Objects.requireNonNull(units, "units must not be null");
        if (units.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("units must be strictly positive: " + units);
        }
        Objects.requireNonNull(entryPrice, "entryPrice must not be null");
        Objects.requireNonNull(stopLossPrice, "stopLossPrice must not be null");
        Objects.requireNonNull(takeProfitPrice, "takeProfitPrice must not be null");
    }
}
```

---

### Livello 3: Utility, Eccezioni Specifiche, Componenti Ausiliari (Tier 3 - Sintetico)
**Tipologia**: Eccezioni custom, costanti, validatori specializzati, helper.

**Requisiti di Documentazione**:
- Scopo conciso e preciso.
- Indicazione chiara delle condizioni in cui l'eccezione viene sollevata o l'utility invocata.

---

## 2. Documentazione Esaustiva di OGNI Funzionalità e Metodo nelle Classi Principali

Nelle classi principali (Tier 1 & Tier 2), i metodi non possono limitarsi a descrizioni telegrafiche di una riga. Devono presentare un contratto Javadoc completo strutturato come segue:

### 2.1 Struttura Obbligatoria del Javadoc di Metodo

1. **Titolo & Scopo Operativo**: Cosa fa il metodo e qual è il suo scopo nel ciclo di vita o nella pipeline di business.
2. **Descrizione Passo-Passo dell'Algoritmo (`<ol><li>...</li></ol>`)**:
   - Spiegazione delle fasi di esecuzione interna: validazione difensiva, calcolo matematico, interazione di rete, persistenza o caching.
   - Indicazione esplicita delle formule matematiche o finanziarie applicate (es. formule ATR, Risk Parity, Break-Even ratio).
3. **Effetti Collaterali (Side Effects)**:
   - Dettaglio di ogni mutazione esterna: chiamate HTTP al broker (eToro Public API), scritture o aggiornamenti atomici su Firestore (`runs/{run_id}`, `positions_shield`), invalidazione o ricaricamento di cache in-memory.
4. **Modello di Concorrenza & Thread-Safety**:
   - Idempotenza dell'operazione.
   - Sicurezza nell'esecuzione concorrente da molteplici thread, thread pool o Virtual Threads.
   - Gestione di blocchi atomici o assenza di sezioni critiche.
5. **Tag Parametrici Esaustivi**:
   - `@param`: Non solo il tipo, ma il significato di business, i vincoli di range (es. `> 0`, `[15:10, 16:00]`), l'unità di misura (es. USD, percentuali, millisecondi) e la nullabilità esplicita.
   - `@return`: Dettaglio del valore o DTO restituito, inclusa la gestione di casi limite (es. lista vuota immutabile, `Optional.empty()` in caso di assenza dati, codici di esito).
   - `@throws`: Documentazione di **ogni** eccezione potenzialmente propagata (`NullPointerException`, `IllegalArgumentException`, `IllegalStateException`, eccezioni di rete o di dominio), con il trigger esatto e la strategia di recupero per il chiamante.
6. **Commenti Interni di Implementazione**:
   - Commenti in-line nel corpo del metodo per evidenziare il rationale delle scelte contabili, i workaround a limitazioni di API terze o le ragioni di una soglia numerica specifica.

### 2.2 Modello di Riferimento per Metodi di Business Logic

```java
/**
 * Esegue il calcolo dello Stop Loss dinamico e dei Target T1 e T2 asimmetrici
 * basandosi sulla volatilità storica calcolata con l'Average True Range (ATR).
 *
 * <p>Questo metodo costituisce il cuore matematico del dimensionamento difensivo.
 * Applica la formula di protezione di Wilder per determinare la distanza ottimale
 * dallo Stop Loss e posiziona i take profit asimmetrici per la strategia Dual-Tranche.</p>
 *
 * <h2>Logica Algoritmica Passo-Passo</h2>
 * <ol>
 *   <li><b>Validazione preventiva Fail-Fast</b>: Verifica che prezzo d'ingresso e ATR siano strettamente positivi.</li>
 *   <li><b>Computazione Stop Loss Volatility-Adjusted</b>: Calcola la distanza grezza {@code ATR * riskMultiplier}.</li>
 *   <li><b>Applicazione delle Bande di Salvaguardia</b>: Limita la percentuale di perdita entro il range istituzionale
 *       del 3.5% (floor prudenziale) e 9.0% (ceiling di sicurezza anti-disastro).</li>
 *   <li><b>Assegnazione Asimmetrica Target R</b>: Posiziona il Target 1 a 1.5R (per scale-out al 50%) e il
 *       Target 2 a 3.0R (per l'alpha runner guidato dal Break-Even Guardian).</li>
 * </ol>
 *
 * <h2>Effetti Collaterali & Concorrenza</h2>
 * <p>Il metodo è <b>puro e privo di effetti collaterali</b> (non modifica alcuno stato condiviso né esegue I/O).
 * È pienamente rientrante e thread-safe, ideale per l'esecuzione parallela su Virtual Threads.</p>
 *
 * @param entryPrice prezzo base d'ingresso previsto sul supporto quantitativo, espresso in valuta di conto; deve essere strettamente positivo
 * @param atr14 valore dell'Average True Range calcolato a 14 periodi su barre daily; deve essere strettamente positivo
 * @param riskMultiplier moltiplicatore di dispersione della volatilità (valore tipico 2.2)
 * @return istanza immutabile di {@link DynamicBracketLevels} contenente i livelli di Stop Loss, Target 1 e Target 2
 * @throws NullPointerException se {@code entryPrice}, {@code atr14} o {@code riskMultiplier} risultano {@code null}
 * @throws IllegalArgumentException se uno qualsiasi dei parametri numerici è minore o uguale a zero
 */
public DynamicBracketLevels calculateBracketLevels(
    BigDecimal entryPrice,
    BigDecimal atr14,
    BigDecimal riskMultiplier
) {
    // 1. Validazione difensiva all'ingresso (Fail-Fast)
    Objects.requireNonNull(entryPrice, "entryPrice non può essere nullo");
    Objects.requireNonNull(atr14, "atr14 non può essere nullo");
    Objects.requireNonNull(riskMultiplier, "riskMultiplier non può essere nullo");

    if (entryPrice.compareTo(BigDecimal.ZERO) <= 0) {
        throw new IllegalArgumentException("Il prezzo d'ingresso deve essere strettamente positivo: " + entryPrice);
    }
    if (atr14.compareTo(BigDecimal.ZERO) <= 0) {
        throw new IllegalArgumentException("L'ATR a 14 periodi deve essere strettamente positivo: " + atr14);
    }

    // 2. Calcolo della distanza grezza in base alla deviazione ATR
    BigDecimal rawDistance = atr14.multiply(riskMultiplier);

    // 3. Forzatura entro le soglie di salvaguardia istituzionale (3.5% - 9.0%)
    ...
}
```
