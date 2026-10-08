Ecco la sequenza rivista, mantenendo la stessa logica progressiva dell'originale ma correggendo i punti deboli. Ho aggiunto due step (0 e 6) perché i correttivi principali — regime di mercato e risk management di portafoglio — non possono essere infilati negli step esistenti senza snaturarli.

**Step 0 — Contesto di regime (nuovo)**

"Prima di costruire qualunque screening, dammi il contesto di mercato attuale: livello e variazione a 5 giorni del VIX, percentuale di titoli S&P 500 sopra la media mobile a 50 e 200 giorni (market breadth), e performance relativa settoriale delle ultime 2 settimane. Dimmi se il regime attuale è risk-on, risk-off o misto, perché questo determinerà quanto peso dare ai segnali di momentum nei passaggi successivi."

*Perché*: uno stesso setup tecnico ha tassi di successo diversi a seconda del regime. Senza questo, ogni step successivo è cieco al contesto.

**Step 1 — Tirare una rete larga, ma su fattori, non sull'effetto**

"Utilizzando i connettori mcp, filtra i titoli azionari quotati negli Stati Uniti con capitalizzazione superiore a 10 miliardi di dollari. Per ciascuno calcola: rendimento a 5 giorni, ATR a 14 giorni (volatilità media), z-score del rendimento a 5 giorni rispetto alla volatilità storica a 90 giorni del titolo stesso, e revisione delle stime EPS degli analisti negli ultimi 30 giorni. Ordina per z-score del rendimento, non per rendimento assoluto. Mostrami i primi 40, suddivisi tra mega-cap (oltre 500 miliardi) e mid/large-cap (10-500 miliardi)."

*Perché*: lo z-score normalizzato per volatilità del singolo titolo evita di confondere un movimento "enorme per quel titolo" con uno "enorme in assoluto" — corregge la soglia fissa del +20% dell'originale, che trattava allo stesso modo un titolo difensivo e uno ad alta beta.

**Step 2 — Separare il segnale dal rumore, con qualità dei fondamentali**

"Da questo elenco, individua quali titoli si muovono in coincidenza con un catalizzatore verificabile (earnings beat, guidance alzata, contratto, upgrade di rating) e quali seguono solo il sentiment di settore. Per ogni titolo con catalizzatore, verifica anche: la qualità dell'earnings beat (crescita di ricavi organica o solo buyback/tagli costi), il livello di leva finanziaria (debito netto/EBITDA), e se ci sono state vendite nette di insider negli ultimi 30 giorni. Segnala come 'movimento statisticamente anomalo' (non 'sopravvalutato') i titoli con z-score del rendimento sopra 2 deviazioni standard rispetto alla propria norma storica."

*Perché*: aggiunge il controllo fondamentale che mancava completamente, e sostituisce il giudizio di valore implicito ("sopravvalutato") con un'osservazione statistica neutra, lasciando il giudizio di merito allo step successivo dove ci sono più dati.

**Step 3 — Punto di ingresso, con la tecnica come overlay tattico dichiarato**

"Per questo elenco, calcola i livelli di supporto e resistenza giornalieri (pivot point) delle ultime 5 sessioni, e la posizione del prezzo rispetto a EMA 20 e 50. Trattalo come overlay tattico di timing, non come criterio di validazione: usalo solo per distinguere titoli vicini a un livello di supporto (ingresso favorevole) da titoli che hanno già rotto la resistenza senza ritracciare (rischio di inseguimento). Indica anche il rapporto rischio/rendimento implicito (distanza dal supporto vs distanza dalla resistenza successiva)."

*Perché*: stesso contenuto dell'originale ma con l'inquadramento esplicito — l'analisi tecnica resta utile per il timing, ma non deve essere scambiata per validazione della tesi.

**Step 4 — Rischi nascosti, valutazione relativa e concentrazione settoriale**

"Per ogni candidato, confronta il prezzo attuale con il massimo delle 52 settimane e la media mobile a 200 giorni. Aggiungi il P/E e l'EV/EBITDA attuali confrontati con la media a 5 anni del titolo stesso e con la mediana del settore, per capire se il prezzo attuale sta già scontando il catalizzatore. Segnala se più di 3 titoli appartengono allo stesso settore o hanno una correlazione storica a 90 giorni superiore a 0.7 tra loro."

*Perché*: aggiunge la valutazione relativa (mancava del tutto) e sposta il controllo di concentrazione da "conteggio per settore" a correlazione reale, più robusta quando titoli di settori diversi si muovono comunque insieme.

**Step 5 — Output pulito con dimensionamento di portafoglio (nuovo)**

"Crea una lista finale delle 10 migliori opportunità con: zona di ingresso basata sui livelli di supporto, stop-loss, target basato sulla resistenza successiva, tesi in una frase, rischio principale, e position size suggerita in modo che il rischio (entry meno stop-loss) di ciascuna posizione non superi l'1% del capitale totale ipotizzato. Dividi la lista in configurazioni nuove e configurazioni già estese. Alla fine, calcola l'esposizione settoriale aggregata del paniere di 10 titoli e segnala se supera il 30% su un singolo settore."

*Perché*: aggiunge il position sizing e il controllo di esposizione aggregata, che nell'originale mancavano del tutto — lo stop loss per singolo titolo non basta se poi 6 titoli su 10 sono tech.

**Step 6 — Verifica storica (nuovo, opzionale ma consigliato)**

"Per la metodologia usata in questi 5 step (movimento anomalo + catalizzatore + pullback su supporto + valutazione non estrema), cerca — se disponibili dati storici — casi simili negli ultimi 12 mesi su titoli comparabili, e indica approssimativamente quante configurazioni di questo tipo si sono mosse a favore vs contro entro 10 giorni di trading."

*Perché*: senza un feedback loop minimo, l'intero processo produce narrative plausibili ma non verificate — è la differenza tra un edge reale e una storia ben raccontata dal modello.

Una nota di fondo che vale per tutta la sequenza, non solo per i correttivi: resta comunque uno strumento di **screening tattico di brevissimo termine**, non un'analisi fondamentale in senso pieno. Anche con questi miglioramenti l'output finale va trattato come punto di partenza per approfondimento, non come raccomandazione operativa.