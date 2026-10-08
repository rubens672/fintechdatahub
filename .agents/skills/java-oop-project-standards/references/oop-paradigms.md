# Paradigmi Fondamentali della Programmazione a Oggetti (OOP)

Questo documento sintetizza le regole e i principi operativi per implementare classi e moduli in Java seguendo rigorosamente e pedissequamente la programmazione a oggetti.

---

## 1. I 4 Pilastri Fondamentali

### 1.1 Incapsulamento Rigoroso (Encapsulation)
- **Campi Privati**: Tutti i campi di istanza devono essere `private` (e preferibilmente `final`). Nessun campo deve mai essere pubblico o protetto, salvo costanti immutabili `public static final`.
- **Nessuna Fuga di Riferimenti Mutabili (Defensive Copying)**: Se un oggetto riceve o restituisce una collezione, un array o un oggetto mutabile, deve eseguire una copia difensiva:
  ```java
  // Costruttore difensivo
  this.items = List.copyOf(items);
  
  // Getter difensivo
  public List<OrderItem> getItems() {
      return Collections.unmodifiableList(this.items);
  }
  ```
- **Principio "Tell, Don't Ask"**:
  - *Scorretto (Procedurale)*: Il chiamante estrae i dati dell'oggetto per prendere decisioni e poi richiama setter.
    ```java
    // ANTI-PATTERN PROCEDURALE:
    if (account.getBalance().compareTo(amount) >= 0) {
        account.setBalance(account.getBalance().subtract(amount));
    }
    ```
  - *Corretto (OOP Puro)*: Il chiamante dice all'oggetto cosa fare; l'oggetto gestisce il proprio stato e le proprie invarianti internamente.
    ```java
    // OOP CORRETTO:
    account.withdraw(amount);
    ```
- **Legge di Demetra (Principio del Minimo Privilegio tra Oggetti)**:
  - Un metodo di un oggetto può invocare solo:
    1. Metodi dello stesso oggetto.
    2. Metodi degli oggetti passati come parametro.
    3. Metodi di oggetti creati o istanziati all'interno del metodo.
    4. Metodi di attributi diretti dell'oggetto.
  - Vietate le catene di navigazione profonda (es. `order.getCustomer().getAddress().getCountry().getIsoCode()`).

---

### 1.2 Astrazione e Programmazione per Contratti (Abstraction)
- **Programmare per Interfacce, Non per Implementazioni**:
  - Dichiarare i tipi di variabili, parametri e valori di ritorno tramite interfacce astratte (`List<T>`, `Set<T>`, `PaymentGateway`, `RiskModelEngine`), non classi concrete (`ArrayList<T>`, `StripePaymentGateway`).
- **Contratti Stabili & Isolamento delle Infrastrutture**:
  - Il layer di dominio non deve mai importare classi del layer infrastrutturale (database, client HTTP, SDK cloud).
  - Tutte le interazioni con l'esterno avvengono tramite porte e interfacce (Repository, Port, Adapter).

---

### 1.3 Favorire la Composizione rispetto all'Ereditarietà (Composition Over Inheritance)
- **Ereditarietà solo per relazioni autentiche "Is-A"**:
  - L'ereditarietà (`extends`) deve essere utilizzata esclusivamente quando il sottotipo è pienamente compatibile con il principio di sostituzione di Liskov (LSP).
- **Classi Final di Default**:
  - Le classi concrete devono essere marcate `final`, salvo che non siano state specificamente progettate e documentate per l'estensione.
- **Pattern Decorator & Strategy**:
  - Per arricchire il comportamento di una classe, incapsulare l'istanza originale tramite composizione invece di creare sottoclassi annidate.

---

### 1.4 Polimorfismo Dinamico vs Istruzioni Condizionali
- **Eliminazione di `switch` e `instanceof`**:
  - L'utilizzo di `switch (type)` o di blocchi a cascata `if (obj instanceof X)` per differenziare la logica di business è un anti-pattern procedurale che viola l'Open/Closed Principle.
  - Sostituire i condizionali con polimorfismo: definire un metodo astratto sull'interfaccia o applicare lo **Strategy Pattern**.

---

## 2. I Principi SOLID in Azione

1. **S - Single Responsibility Principle (SRP)**:
   - Una classe deve avere una sola ragione per cambiare.
   - Separare nettamente:
     - Calcolo matematico / logica pura di dominio.
     - Persistenza su database / cache.
     - Comunicazione di rete / chiamate REST.
     - Serializzazione JSON e rendering.

2. **O - Open/Closed Principle (OCP)**:
   - Il software deve essere aperto all'estensione ma chiuso alla modifica.
   - L'aggiunta di una nuova funzionalità (es. nuovo tipo di ordine, nuovo calcolo di volatilità) deve avvenire creando una nuova classe che implementa un'interfaccia, senza modificare il codice esistente.

3. **L - Liskov Substitution Principle (LSP)**:
   - Qualsiasi classe che implementa un'interfaccia deve poter essere utilizzata al posto dell'interfaccia senza che il chiamante se ne accorga o riceva comportamenti inattesi (come `UnsupportedOperationException`).

4. **I - Interface Segregation Principle (ISP)**:
   - I client non devono essere costretti a dipendere da metodi che non utilizzano.
   - Creare interfacce snelle e specializzate (`OrderPlacer`, `OrderCanceller`) anziché un'unica interfaccia mastodontica (`OrderManager`).

5. **D - Dependency Inversion Principle (DIP)**:
   - I moduli ad alto livello non devono dipendere dai moduli a basso livello; entrambi devono dipendere da astrazioni.
   - Utilizzare rigorosamente la **Constructor Dependency Injection**. Vietata l'iniezione su campi privati tramite `@Autowired` riflessivo (field injection) per garantire che l'oggetto sia sempre completamente inizializzato e testabile senza container.

---

## 3. Immutabilità e Oggetti di Valore (Value Objects)

1. **Java Records**:
   - Utilizzare i Java Records (`record`) per tutti i Value Object, DTO e proiezioni di dati.
   - I Record garantiscono immutabilità, implementazione coerente di `equals()`, `hashCode()`, `toString()` e costruttori compatti di validazione:
     ```java
     public record Money(BigDecimal amount, Currency currency) {
         public Money {
             Objects.requireNonNull(amount, "amount must not be null");
             Objects.requireNonNull(currency, "currency must not be null");
             if (amount.scale() > currency.getDefaultFractionDigits()) {
                 throw new IllegalArgumentException("Scale exceeds currency decimals");
             }
         }
         
         public Money add(Money other) {
             if (!this.currency.equals(other.currency)) {
                 throw new CurrencyMismatchException(this.currency, other.currency);
             }
             return new Money(this.amount.add(other.amount), this.currency);
         }
     }
     ```

---

## 4. Tolleranza Zero per i Valori Nulli (Null-Safety)

1. **Nessun ritorno di `null`**:
   - Metodi di ricerca o query: restituire sempre `Optional<T>`.
   - Metodi che restituiscono collezioni: restituire sempre una collezione vuota non modificabile (`Collections.emptyList()`, `Set.of()`), **mai `null`**.
2. **Validazione Immediata degli Argomenti**:
   - Nel costruttore e nei metodi pubblici validare immediatamente con `Objects.requireNonNull(param, "param must not be null")`.
   - Fail-fast: l'oggetto deve fallire istantaneamente al momento della creazione se i parametri sono non validi, impedendo la propagazione di stati corrotti.
