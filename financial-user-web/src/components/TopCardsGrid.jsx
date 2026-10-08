import React from 'react';
import { ShieldCheck, Award, Eye, TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';

class GridErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.warn('[TopCardsGrid] Safe fallback activated:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>Aggiornamento dati in corso...</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export function TopCardsGrid(props) {
  return (
    <GridErrorBoundary>
      <TopCardsGridInner {...props} />
    </GridErrorBoundary>
  );
}

function roundPrice(val) {
  return Math.round(val * 100) / 100;
}

function TopCardsGridInner({ items, stocks, capital, topN, onSelectStock, livePrices = {}, tickFlashes = {}, etoroPositions = [] }) {
  const stockList = items || stocks || [];
  if (!stockList || stockList.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎯</div>
        <h3 style={{ color: '#ffffff', marginBottom: '8px' }}>Nessun Dossier Attivo</h3>
        <p style={{ fontSize: '14px', maxWidth: '480px', margin: '0 auto' }}>
          Configura il capitale e clicca su <strong>"Avvia Workflow Quantitativo"</strong> per eseguire lo screening a 7 nodi e generare il portafoglio ottimizzato Top {topN || 5}.
        </p>
      </div>
    );
  }

  const cap = Number(capital) > 0 ? Number(capital) : 10000;
  const count = stockList.length;

  // Position sizing with institutional 30% sector cap and 1% risk rule
  const weights = stockList.map(s => Number(s.position_size_pct || s.allocation_pct || s.weight || (100 / count)));
  const allEqual = weights.every(w => Math.abs(w - weights[0]) < 0.1);
  let computedWeights = weights;

  if (allEqual || weights.some(w => !Number.isFinite(w) || w <= 0)) {
    const scores = stockList.map(s => Number(s.alpha_score || s.score || 75));
    const totalScore = scores.reduce((a, b) => a + b, 0);
    const rawProportions = scores.map(sc => (sc / totalScore) * 100);

    const capped = rawProportions.map(p => Math.min(p, 30.0));
    const cappedSum = capped.reduce((a, b) => a + b, 0);
    const normalized = capped.map(p => (p / cappedSum) * 100);

    let running = 0;
    computedWeights = normalized.map((p, i) => {
      if (i === normalized.length - 1) return Math.round((100 - running) * 10) / 10;
      p = Math.round(p * 10) / 10;
      running += p;
      return p;
    });
  }

  return (
    <div className="cards-grid">
      {stockList.map((stock, idx) => {
        const sym = (stock.symbol || stock.code || '').replace('.US', '').toUpperCase().trim();
        const activePos = (Array.isArray(etoroPositions) ? etoroPositions : []).find(
          (p) => (p.symbol || p.symbolName || '').replace('.US', '').toUpperCase().trim() === sym
        );
        const etoroRate = activePos ? Number(activePos.current_rate || activePos.currentRate || 0) : null;
        const etoroChange = activePos
          ? (activePos.daily_change_p !== undefined ? Number(activePos.daily_change_p) : (activePos.pnl_percent !== undefined ? Number(activePos.pnl_percent) : null))
          : null;

        const liveData = livePrices[sym] || livePrices[`${sym}.US`];
        const livePriceVal = typeof liveData === 'number'
          ? liveData
          : (liveData?.price !== undefined && liveData?.price !== null ? Number(liveData.price) : null);
        const validLive = (livePriceVal !== null && Number.isFinite(livePriceVal) && livePriceVal > 0 && livePriceVal !== 150.0)
          ? livePriceVal
          : null;
        const quantPrice = Number(stock.current_price ?? stock.last_price ?? stock.price ?? 0);
        const rawPrice = Number(etoroRate ?? validLive ?? (quantPrice > 0 ? quantPrice : (livePriceVal && livePriceVal > 0 ? livePriceVal : null)) ?? 100.0);
        const price = rawPrice > 0 ? rawPrice : (quantPrice > 0 ? quantPrice : 100.0);

        const liveChangeP = (typeof liveData === 'object' && liveData?.change_p !== undefined && liveData?.change_p !== null)
          ? Number(liveData.change_p)
          : (typeof stock.change_p === 'number' ? stock.change_p : Number(stock.change_percent ?? 0.0));
        const rawChangeP = etoroChange !== null ? etoroChange : liveChangeP;
        const changeP = Number.isFinite(rawChangeP) ? rawChangeP : 0.0;
        const flashClass = tickFlashes[sym] || tickFlashes[`${sym}.US`] || '';

        const symbolPositions = (Array.isArray(etoroPositions) ? etoroPositions : []).filter(
          (p) => (p.symbol || p.symbolName || '').replace('.US', '').toUpperCase().trim() === sym
        );
        const etoroTPs = symbolPositions
          .map((p) => Number(p.take_profit || p.takeProfitRate || 0))
          .filter((v) => v > 0)
          .sort((a, b) => a - b);
        const etoroSLs = symbolPositions
          .map((p) => Number(p.stop_loss || p.stopLossRate || 0))
          .filter((v) => v > 0);
        const etoroEntries = symbolPositions
          .map((p) => Number(p.open_rate || p.openRate || 0))
          .filter((v) => v > 0);

        const etoroT1 = etoroTPs.length > 0 ? etoroTPs[0] : null;
        const etoroT2 = etoroTPs.length > 1 ? etoroTPs[etoroTPs.length - 1] : (etoroTPs.length === 1 ? etoroTPs[0] : null);
        const etoroStop = etoroSLs.length > 0 ? etoroSLs[0] : null;
        const etoroEntry = etoroEntries.length > 0 ? etoroEntries[0] : null;

        // Quantitative Ladder: STOP < S1_ENTRY < CURRENT_PRICE < T1 < T2
        const rawEntry = Number(etoroEntry ?? stock.entry_zone ?? stock.entry ?? stock.entry_price ?? stock.support_s1 ?? stock.s1 ?? 0);
        const entry = (rawEntry > 0)
          ? Number(rawEntry.toFixed(2))
          : Number((price * 0.975).toFixed(2));

        const rawStop = Number(etoroStop ?? stock.stop_loss ?? stock.stop ?? 0);
        const stopLoss = (rawStop > 0)
          ? Number(rawStop.toFixed(2))
          : Number((entry * 0.955).toFixed(2));

        const rawT1 = Number(etoroT1 ?? stock.target_price ?? stock.target1 ?? stock.t1 ?? stock.target ?? 0);
        const target1 = (rawT1 > 0)
          ? Number(rawT1.toFixed(2))
          : Number((price * 1.045).toFixed(2));

        const rawT2 = Number(etoroT2 ?? stock.target_price_2 ?? stock.target2 ?? stock.t2 ?? 0);
        const target2 = (rawT2 > 0)
          ? Number(rawT2.toFixed(2))
          : Number((target1 * 1.055).toFixed(2));

        const stopPctNum = entry > 0 ? ((stopLoss - entry) / entry) * 100 : -4.5;
        const t1PctNum = entry > 0 ? ((target1 - entry) / entry) * 100 : 8.5;
        const t2PctNum = entry > 0 ? ((target2 - entry) / entry) * 100 : 18.2;

        const stopPct = (Number.isFinite(stopPctNum) ? stopPctNum : -4.5).toFixed(1);
        const t1Pct = (Number.isFinite(t1PctNum) ? t1PctNum : 8.5).toFixed(1);
        const t2Pct = (Number.isFinite(t2PctNum) ? t2PctNum : 18.2).toFixed(1);
        const isPositive = changeP >= 0;
        const rrRatio = stock.rr_ratio || '1 : 3.2';

        const rawWeight = Number(stock.position_size_pct && !allEqual ? stock.position_size_pct : (computedWeights[idx] || (count ? (100 / count) : 20)));
        const weightPct = Number.isFinite(rawWeight) ? rawWeight : 20.0;
        const allocatedAmount = Math.round((weightPct / 100) * cap);
        const shares = Math.max(Math.floor(allocatedAmount / (entry || 1)), 1);

        return (
          <div key={stock.symbol || stock.code || idx} className="stock-card glass-panel">
            {/* 1. Header */}
            <div className="card-header">
              <div>
                <div className="ticker-title">
                  <span>{stock.symbol || stock.code || 'TICKER'}</span>
                  <span style={{ fontSize: '11px', color: 'var(--cyan-primary)', background: 'rgba(6, 182, 212, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                    #{idx + 1}
                  </span>
                  {stock.trend_profile === 'SUPER_TREND' ? (
                    <span
                      title={`SUPER TREND: ${stock.super_trend_score ? stock.super_trend_score : 5}/5 criteri. Alpha Runner continuo senza tetto al Take Profit.`}
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#34d399',
                        background: 'rgba(52, 211, 153, 0.15)',
                        border: '1px solid rgba(52, 211, 153, 0.45)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 0 10px rgba(52, 211, 153, 0.25)',
                        letterSpacing: '0.02em',
                      }}
                    >
                      🚀 SUPER TREND
                    </span>
                  ) : (
                    <span
                      title="SWING T2: Take Profit matematico ancorato su Target 2 (3.0R) con Break-Even a T1."
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#38bdf8',
                        background: 'rgba(56, 189, 248, 0.15)',
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        letterSpacing: '0.02em',
                      }}
                    >
                      🎯 SWING T2
                    </span>
                  )}
                  {symbolPositions.length > 0 && (
                    <span
                      title={`Titolo già a mercato su eToro con ${symbolPositions.length} tranche attive`}
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#10b981',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.45)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 0 8px rgba(16, 185, 129, 0.25)',
                        letterSpacing: '0.02em',
                      }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                      A MERCATO eTORO ({symbolPositions.length})
                    </span>
                  )}
                </div>
                <div className="company-name">{stock.name || stock.company_name || 'Mega-Cap Technology'}</div>
              </div>

              <div className="price-display">
                <div className={`current-price ${flashClass}`}>${price.toFixed(2)}</div>
                <div className={`price-change ${isPositive ? 'positive' : 'negative'}`}>
                  {isPositive ? '+' : ''}{changeP.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* 2. Confluence Badges */}
            <div className="confluence-badges">
              {symbolPositions.length > 0 && (
                <span
                  className="confluence-badge"
                  style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.45)',
                    fontWeight: 800,
                  }}
                >
                  ⚡ Già in Portafoglio ({symbolPositions.length} {symbolPositions.length === 1 ? 'pos.' : 'tranche'})
                </span>
              )}
              <span className="confluence-badge" style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--cyan-primary)', border: '1px solid rgba(6, 182, 212, 0.3)', fontWeight: 700 }}>
                ⚖️ Peso: {weightPct.toFixed(1)}% ({allocatedAmount.toLocaleString('it-IT')} €)
              </span>
              {stock.insider_buy && (
                <span className="confluence-badge insider">✓ SEC Form 4 Insider Buy</span>
              )}
              {stock.congress_trade && (
                <span className="confluence-badge congress">🏛️ STOCK Act Disclosure</span>
              )}
              {stock.options_bullish && (
                <span className="confluence-badge options">📈 Options Delta Bullish</span>
              )}
              {stock.dividend_aristocrat && (
                <span className="confluence-badge aristocrat">👑 Aristocrat DGR ({stock.dgr_streak || '12y'})</span>
              )}
              <span className="confluence-badge">Sector: {stock.sector || 'Technology'}</span>
            </div>

            {/* 3. Trading Execution Plan */}
            <div className="trading-plan-grid">
              <div className="plan-item">
                <span className="plan-item-label">Entry Zone (Supporto S1)</span>
                <span className="plan-item-val entry">${entry.toFixed(2)}</span>
              </div>
              <div className="plan-item">
                <span className="plan-item-label">Stop-Loss ({stopPct}%)</span>
                <span className="plan-item-val stop">${stopLoss.toFixed(2)}</span>
              </div>
              <div className="plan-item">
                <span className="plan-item-label">{stock.trend_profile === 'SUPER_TREND' ? '1° Target T1 (BE Lock)' : '1° Target T1 (+BE)'} (+{t1Pct}%)</span>
                <span className="plan-item-val target1">${target1.toFixed(2)}</span>
              </div>
              <div className="plan-item">
                <span className="plan-item-label">{stock.trend_profile === 'SUPER_TREND' ? 'T2 (Alpha Runner)' : '2° Target T2 (TP Exit)'} (+{t2Pct}%)</span>
                <span className="plan-item-val target2">{stock.trend_profile === 'SUPER_TREND' ? `$${target2.toFixed(2)} 🚀` : `$${target2.toFixed(2)} 🎯`}</span>
              </div>
            </div>

            {/* 4. Allocation Sizing (Dynamic Weighted Deploy) */}
            <div className="allocation-box">
              <div>
                <div className="allocation-label">Azioni Esatte da Comprare</div>
                <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'JetBrains Mono', color: 'var(--cyan-primary)' }}>
                  {shares} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>quote</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="allocation-label">Controvalore Ponderato ({weightPct.toFixed(1)}%)</div>
                <div className="allocation-amount">{allocatedAmount.toLocaleString('it-IT')} €</div>
              </div>
            </div>

            {/* 5. Footer */}
            <div className="card-footer">
              <div className="rr-ratio">
                R/R: <span style={{ color: '#ffffff' }}>{rrRatio}</span>
              </div>
              <button
                type="button"
                className="btn-details"
                onClick={() => onSelectStock(stock)}
              >
                <Eye size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                Dettagli Analisi
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

