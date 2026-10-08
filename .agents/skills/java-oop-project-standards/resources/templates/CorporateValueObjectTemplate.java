/*
 * Copyright (c) 2026 Berti AI & Cloud Architecture. All rights reserved.
 */
package com.company.project.domain.model;

import java.math.BigDecimal;
import java.util.Objects;

/**
 * <h1>Oggetto di Valore Immutabile per la Rappresentazione di un Asset Candidato</h1>
 *
 * <p>Il {@code AssetCandidate} è un Value Object puro che incapsula le metriche di mercato
 * essenziali per la valutazione del rischio e il dimensionamento degli ordini.
 * Una volta istanziato, lo stato dell'oggetto è strettamente immutabile e garantito valido.</p>
 *
 * @param ticker codice identificativo di borsa dell'asset (es. "NVDA"), mai nullo o vuoto
 * @param currentPrice prezzo di mercato attuale rilevato, strettamente maggiore di zero
 * @param atr14 volatilità statistica Average True Range a 14 periodi, strettamente maggiore di zero
 *
 * @author Berti AI & Cloud Architecture
 * @version 1.0.0
 * @since 2026-09-21
 */
public record AssetCandidate(
    String ticker,
    BigDecimal currentPrice,
    BigDecimal atr14
) {

    /**
     * Costruttore compatto per la validazione difensiva delle invarianti di dominio.
     *
     * @throws NullPointerException se uno qualsiasi degli argomenti è nullo
     * @throws IllegalArgumentException se il ticker è vuoto, oppure se il prezzo o l'ATR sono minori o uguali a zero
     */
    public AssetCandidate {
        Objects.requireNonNull(ticker, "Il ticker non può essere nullo");
        if (ticker.isBlank()) {
            throw new IllegalArgumentException("Il ticker non può essere una stringa vuota");
        }
        Objects.requireNonNull(currentPrice, "currentPrice non può essere nullo");
        if (currentPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("currentPrice deve essere strettamente positivo: " + currentPrice);
        }
        Objects.requireNonNull(atr14, "atr14 non può essere nullo");
        if (atr14.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("atr14 deve essere strettamente positivo: " + atr14);
        }
    }

    /**
     * Calcola la volatilità relativa percentuale rispetto al prezzo corrente dell'asset.
     *
     * @return percentuale di volatilità normalizzata su base 100
     */
    public BigDecimal relativeVolatilityPercent() {
        return atr14.divide(currentPrice, 4, java.math.RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
    }
}
