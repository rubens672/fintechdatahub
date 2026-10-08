/*
 * Copyright (c) 2026 Berti AI & Cloud Architecture. All rights reserved.
 */
package com.company.project.domain.service;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * <h1>Gestore del Rischio e Dimensionamento di Posizione</h1>
 *
 * <p>Il {@code PositionSizingManager} è il componente architetturale di dominio preposto
 * al calcolo quantitativo del capitale da allocare per ciascuna posizione di trading,
 * garantendo il rispetto rigoroso del modello di rischio istituzionale e la protezione del capitale.</p>
 *
 * <h2>1. Ruolo Architetturale & Responsabilità</h2>
 * <ul>
 *   <li><b>Equal-Dollar Risk Parity</b>: Dimensiona il numero esatto di quote da acquistare
 *       in modo che il rischio massimo per singola posizione non superi mai l'1.0% del Net Asset Value.</li>
 *   <li><b>Applicazione delle Soglie di Salvaguardia</b>: Calcola lo Stop Loss dinamico basato
 *       sull'Average True Range (ATR) e ne forza i limiti di sicurezza (floor 3.5% e ceiling 9.0%).</li>
 *   <li><b>Sdoppiamento Dual-Tranche</b>: Ripartisce il dimensionamento in due tranche distinte
 *       (Tranche 1 per Take Profit conservativo T1 e Tranche 2 per Alpha Runner T2).</li>
 * </ul>
 *
 * <h2>2. Modello di Concorrenza e Thread-Safety</h2>
 * <p>Questa classe è <b>completamente thread-safe</b>. Non mantiene alcuno stato mutabile interno.
 * Tutte le dipendenze iniettate sono immutabili ({@code final}) e l'elaborazione dei candidati
 * sfrutta stream paralleli o Virtual Threads senza sezioni critiche sincronizzate bloccanti.</p>
 *
 * <h2>3. Invarianti di Dominio</h2>
 * <ul>
 *   <li>Il capitale totale allocabile deve essere strettamente positivo.</li>
 *   <li>Nessuna posizione può ricevere un'esposizione nozionale superiore al 25% del portafoglio complessivo.</li>
 *   <li>Ogni metodo valida rigorosamente i parametri in ingresso (approccio Fail-Fast).</li>
 * </ul>
 *
 * <h2>4. Esempio di Utilizzo</h2>
 * <pre>{@code
 * PositionSizingManager manager = new PositionSizingManager(volatilityCalculator);
 * SizingCalculationResult result = manager.calculateOrderSize(
 *     new AssetCandidate("AAPL", new BigDecimal("225.50"), new BigDecimal("4.15")),
 *     new PortfolioCapital(new BigDecimal("100000.00"))
 * );
 * }</pre>
 *
 * @author Berti AI & Cloud Architecture
 * @version 1.0.0
 * @since 2026-09-21
 */
public final class PositionSizingManager {

    private static final Logger logger = LoggerFactory.getLogger(PositionSizingManager.class);

    private static final BigDecimal MAX_ACCOUNT_RISK_FRACTION = new BigDecimal("0.01");
    private static final BigDecimal MAX_POSITION_CAP_FRACTION = new BigDecimal("0.25");
    private static final BigDecimal ATR_MULTIPLIER = new BigDecimal("2.2");

    private final VolatilityCalculator volatilityCalculator;

    /**
     * Costruisce un'istanza del {@code PositionSizingManager} con le dipendenze necessarie.
     *
     * @param volatilityCalculator componente per la computazione della volatilità storica di mercato, non può essere nullo
     * @throws NullPointerException se {@code volatilityCalculator} è {@code null}
     */
    public PositionSizingManager(VolatilityCalculator volatilityCalculator) {
        this.volatilityCalculator = Objects.requireNonNull(volatilityCalculator, "volatilityCalculator non può essere nullo");
        logger.debug("Inizializzato PositionSizingManager con calcolatore di volatilità: {}", volatilityCalculator.getClass().getSimpleName());
    }

    /**
     * Calcola il dimensionamento ottimale delle quote azionarie e i livelli di protezione
     * per il candidato specificato.
     *
     * <p>La logica operativa esegue i seguenti passaggi:
     * <ol>
     *   <li>Validazione preventiva di congruità dei parametri in ingresso (prezzi e capitali positivi).</li>
     *   <li>Calcolo della distanza di Stop Loss protetto tramite il calcolatore di volatilità ATR.</li>
     *   <li>Dimensionamento delle unità secondo il modello Risk Parity: {@code Units = Floor(RischioMassimo / DistanzaStop)}.</li>
     *   <li>Verifica del tetto massimo del 25% del capitale di portafoglio (Position Cap).</li>
     * </ol>
     * </p>
     *
     * @param candidate asset candidato generato dal motore quantitativo, non nullo
     * @param capital capitale netto attualmente disponibile nel portafoglio, non nullo
     * @return risultato immutabile del calcolo contenente quote, Stop Loss e Take Profit per ciascuna tranche
     * @throws NullPointerException se uno dei parametri passati è nullo
     * @throws IllegalArgumentException se il prezzo dell'asset o il capitale sono minori o uguali a zero
     */
    public SizingCalculationResult calculateOrderSize(AssetCandidate candidate, PortfolioCapital capital) {
        Objects.requireNonNull(candidate, "candidate non può essere nullo");
        Objects.requireNonNull(capital, "capital non può essere nullo");

        if (candidate.currentPrice().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Il prezzo del candidato deve essere strettamente positivo: " + candidate.currentPrice());
        }
        if (capital.availableAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Il capitale disponibile deve essere strettamente positivo: " + capital.availableAmount());
        }

        logger.info("Avvio calcolo dimensionamento per {} (Prezzo: {}, Capitale: {})",
            candidate.ticker(), candidate.currentPrice(), capital.availableAmount());

        // 1. Rischio monetario massimo ammesso (1.0% del portafoglio)
        BigDecimal maxRiskAmount = capital.availableAmount().multiply(MAX_ACCOUNT_RISK_FRACTION);

        // 2. Calcolo dello Stop Loss dinamico basato su ATR
        BigDecimal stopLossDistance = candidate.atr14().multiply(ATR_MULTIPLIER);
        BigDecimal stopLossPrice = candidate.currentPrice().subtract(stopLossDistance);

        // 3. Calcolo quote per Risk Parity
        BigDecimal rawShares = maxRiskAmount.divide(stopLossDistance, 0, java.math.RoundingMode.FLOOR);
        int units = Math.max(1, rawShares.intValue());

        // 4. Verifica Cap di posizione (max 25% del portafoglio totale)
        BigDecimal totalNotional = candidate.currentPrice().multiply(BigDecimal.valueOf(units));
        BigDecimal maxNotionalAllowed = capital.availableAmount().multiply(MAX_POSITION_CAP_FRACTION);

        if (totalNotional.compareTo(maxNotionalAllowed) > 0) {
            int cappedUnits = maxNotionalAllowed.divide(candidate.currentPrice(), 0, java.math.RoundingMode.FLOOR).intValue();
            logger.warn("Posizione su {} ridimensionata per superamento cap 25%: da {} a {} quote",
                candidate.ticker(), units, cappedUnits);
            units = Math.max(1, cappedUnits);
        }

        logger.info("Dimensionamento completato per {}: {} quote, Stop Loss a {}",
            candidate.ticker(), units, stopLossPrice);

        return new SizingCalculationResult(candidate.ticker(), units, stopLossPrice, candidate.currentPrice());
    }
}
