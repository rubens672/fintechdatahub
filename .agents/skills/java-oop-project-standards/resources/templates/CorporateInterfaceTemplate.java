/*
 * Copyright (c) 2026 Berti AI & Cloud Architecture. All rights reserved.
 */
package com.company.project.domain.port;

import java.math.BigDecimal;
import java.util.Optional;

/**
 * <h1>Contratto di Interfaccia per il Calcolo della Volatilità di Mercato</h1>
 *
 * <p>Definisce il contratto astratto ad alto livello per il recupero e la computazione
 * degli indicatori di volatilità statistica e di dispersione dei prezzi (ATR, Deviazione Standard,
 * Bande di Bollinger) necessari per i modelli quantitativi di gestione del rischio.</p>
 *
 * <h2>Principi di Design</h2>
 * <ul>
 *   <li><b>Interface Segregation Principle (ISP)</b>: Espone unicamente le funzionalità
 *       strettamente richieste dai moduli decisionali di dimensionamento.</li>
 *   <li><b>Dependency Inversion Principle (DIP)</b>: Permette ai moduli di dominio di non
 *       dipendere da specifici fornitori di dati di mercato o librerie matematiche esterne.</li>
 * </ul>
 *
 * @author Berti AI & Cloud Architecture
 * @version 1.0.0
 * @since 2026-09-21
 */
public interface VolatilityCalculator {

    /**
     * Calcola il valore dell'Average True Range (ATR) a 14 periodi per il simbolo indicato.
     *
     * @param ticker simbolo azionario (es. "AAPL", "MSFT"), non può essere nullo né vuoto
     * @return un {@link Optional} contenente il valore dell'ATR se calcolabile con dati storici sufficienti,
     *         oppure un {@code Optional.empty()} se le serie storiche risultano incomplete o non disponibili
     * @throws IllegalArgumentException se il ticker specificato è nullo, vuoto o con formato non conforme
     */
    Optional<BigDecimal> calculateAtr14(String ticker);

    /**
     * Verifica se il livello di volatilità corrente supera la soglia di allerta per mercati turbolenti.
     *
     * @param ticker simbolo azionario da analizzare, non nullo
     * @return {@code true} se la volatilità implicita o realizzata supera il 95° percentile storico,
     *         {@code false} altrimenti
     */
    boolean isHighVolatilityRegime(String ticker);
}
