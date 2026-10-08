import React, { useState, useMemo } from 'react';
import { Zap, ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp } from 'lucide-react';

function LiveEToroBrokerBannerInner({
  positions = [],
  livePrices = {},
  tickFlashes = {},
  runsList = [],
  currentRunId,
  onSelectRun,
  isCockpit = false,
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  const safePositions = Array.isArray(positions) ? positions : [];
  const safeLivePrices = (livePrices && typeof livePrices === 'object') ? livePrices : {};

  // Compute dynamic live positions with real-time mark-to-market PnL unconditionally
  const enrichedPositions = useMemo(() => {
    if (!safePositions.length) return [];
    return safePositions.map((p) => {
      const sym = (p?.symbol || '').replace('.US', '').trim().toUpperCase();
      const liveData = safeLivePrices[sym] || safeLivePrices[`${sym}.US`];
      const livePriceVal = typeof liveData === 'number'
        ? liveData
        : (liveData?.price !== undefined ? Number(liveData.price) : null);
      const openRate = Number(p?.open_rate) || 0;
      const currentRate = Number(p?.current_rate ?? livePriceVal ?? openRate);
      const units = Number(p?.units) || 0;
      const invested = Number(p?.invested) || (openRate * units);
      
      let pnl = Number(p?.pnl) || 0;
      let pnlPct = Number(p?.pnl_percent) || 0;
      if (currentRate > 0 && openRate > 0 && units > 0) {
        pnl = (currentRate - openRate) * units;
        pnlPct = ((currentRate - openRate) / openRate) * 100;
      }

      return {
        ...p,
        symbol: sym,
        open_rate: openRate,
        current_rate: currentRate,
        invested,
        pnl,
        pnl_percent: pnlPct,
      };
    });
  }, [safePositions, safeLivePrices]);

  // Aggregate stats from dynamically enriched positions
  const totalInvested = enrichedPositions.reduce((acc, p) => acc + (Number(p?.invested) || 0), 0);
  const totalPnl = enrichedPositions.reduce((acc, p) => acc + (Number(p?.pnl) || 0), 0);
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
  const isProfit = totalPnl >= 0;

  // Group positions by symbol unconditionally
  const groupedBySymbol = useMemo(() => {
    const map = {};
    enrichedPositions.forEach((p) => {
      const sym = p.symbol;
      if (!sym) return;
      if (!map[sym]) {
        map[sym] = [];
      }
      map[sym].push(p);
    });
    return map;
  }, [enrichedPositions]);

  // Find the run that matches these symbols unconditionally
  const matchingRun = useMemo(() => {
    try {
      const etoroSyms = Object.keys(groupedBySymbol);
      if (etoroSyms.length === 0 || !runsList || !Array.isArray(runsList) || runsList.length === 0) return null;
      
      return runsList.find((r) => {
        const runSyms = (r?.results || []).map((s) => (s?.symbol || '').toUpperCase());
        const common = etoroSyms.filter((s) => runSyms.includes(s));
        return common.length >= 3;
      });
    } catch {
      return null;
    }
  }, [groupedBySymbol, runsList]);

  // Safe early exit AFTER all hooks have executed
  if (enrichedPositions.length === 0) {
    return null;
  }


  return (
    <div
      className="glass-panel"
      style={{
        margin: '16px 0 24px 0',
        padding: '20px 24px',
        border: '1px solid rgba(6, 182, 212, 0.4)',
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(15, 23, 42, 0.9) 100%)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        borderRadius: '16px',
      }}
    >
      {/* Header Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(6, 182, 212, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--cyan-primary)',
            }}
          >
            <Zap size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
                Broker eToro (Demo): Portafoglio Live Desk
              </h3>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#10b981',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                STREAMING REALE
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Conto Demo #33932108 • Protezione Opening Shield & Break-Even Guardian
            </div>
          </div>
        </div>

        {/* Global Position Summary Cards */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nozionale Investito</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
              ${Number(totalInvested || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>PnL Non Realizzato</div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 800,
                color: isProfit ? '#10b981' : '#f43f5e',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                justifyContent: 'flex-end',
              }}
            >
              {isProfit ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
              {isProfit ? '+' : ''}${Number(totalPnl || 0).toFixed(2)} ({isProfit ? '+' : ''}{Number(totalPnlPct || 0).toFixed(2)}%)
            </div>
          </div>

          {/* Align Run Button if not matching */}
          {matchingRun && matchingRun.run_id && matchingRun.run_id !== currentRunId && onSelectRun && (
            <button
              onClick={() => onSelectRun(matchingRun.run_id)}
              style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)',
              }}
              title="Allinea la vista del Live Screener e delle Card alla Run associata a queste posizioni eToro"
            >
              <span>🔄</span>
              Allinea Screener ({String(matchingRun.run_id || '').slice(-8)})
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '6px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* Expanded Position Cards */}
      {isExpanded && (
        <div
          style={{
            marginTop: '20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '12px',
          }}
        >
          {Object.entries(groupedBySymbol).map(([sym, trancheList]) => {
            const currentPrice = Number(trancheList[0]?.current_rate ?? 0);
            const flashClass = tickFlashes[sym] || tickFlashes[`${sym}.US`] || '';
            const symInvested = trancheList.reduce((acc, t) => acc + (Number(t?.invested) || 0), 0);
            const symPnl = trancheList.reduce((acc, t) => acc + (Number(t?.pnl) || 0), 0);
            const symPnlPct = symInvested > 0 ? (symPnl / symInvested) * 100 : 0;
            const isSymProfit = symPnl >= 0;

            return (
              <div
                key={sym}
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Header: Ticker & Current Live Price */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', letterSpacing: '0.5px' }}>
                      {sym}
                    </span>
                    <span
                      style={{
                        marginLeft: '8px',
                        fontSize: '10px',
                        color: 'var(--cyan-primary)',
                        background: 'rgba(6, 182, 212, 0.15)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontWeight: 600,
                      }}
                    >
                      {trancheList.length > 1 ? `${trancheList.length} Tranche` : 'Posizione Attiva'}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div className={`current-price ${flashClass}`} style={{ fontSize: '15px', fontWeight: 800 }}>
                      ${Number(currentPrice || 0).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: isSymProfit ? '#10b981' : '#f43f5e' }}>
                      {isSymProfit ? '+' : ''}${Number(symPnl || 0).toFixed(2)} ({isSymProfit ? '+' : ''}{Number(symPnlPct || 0).toFixed(2)}%)
                    </div>
                  </div>
                </div>

                {/* Tranches Detail */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                  {trancheList.map((t, idx) => {
                    const tPnl = Number(t?.pnl) || 0;
                    const isTPnlProfit = tPnl >= 0;
                    const openRate = Number(t?.open_rate) || 0;
                    const stopLoss = Number(t?.stop_loss) || 0;
                    const takeProfit = Number(t?.take_profit) || 0;
                    const units = Number(t?.units) || 0;

                    return (
                      <div
                        key={t?.position_id || idx}
                        style={{
                          fontSize: '11px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.03)',
                        }}
                      >
                        <span style={{ color: 'var(--text-muted)' }}>
                          <strong style={{ color: '#ffffff' }}>{idx === 0 ? 'T1' : 'T2'}:</strong> {units} quote @ ${openRate.toFixed(2)}
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                            SL: ${stopLoss.toFixed(2)}
                          </span>
                          <span style={{ color: 'var(--cyan-primary)', fontSize: '10px' }}>
                            TP: ${takeProfit.toFixed(2)}
                          </span>
                          <span style={{ fontWeight: 700, color: isTPnlProfit ? '#10b981' : '#f43f5e' }}>
                            {isTPnlProfit ? '+' : ''}${tPnl.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

class BannerErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.warn('[LiveEToroBrokerBanner] Safe fallback activated:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

export function LiveEToroBrokerBanner(props) {
  return (
    <BannerErrorBoundary>
      <LiveEToroBrokerBannerInner {...props} />
    </BannerErrorBoundary>
  );
}

