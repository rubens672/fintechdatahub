import React, { useMemo } from 'react';
import { DollarSign, ShieldAlert, Target, Sparkles, Send, CheckCircle2 } from 'lucide-react';

export function PortfolioSummary({ 
  capital, 
  topN, 
  riskPct, 
  itemsCount, 
  stocks = [],
  etoroPositions = [],
  isCockpit = false, 
  onOpenEToroModal,
  onOpenCloseModal,
  hasExecutedOrders = false 
}) {
  const count = topN || itemsCount || 5;
  const capPerStock = capital && count ? Math.floor(capital / count) : 0;
  const maxRiskPerTrade = Math.floor(capital * (riskPct || 0.01));
  const estimatedT1Gain = Math.floor(capital * 0.06); // +6% average T1
  const estimatedT2Gain = Math.floor(capital * 0.15); // +15% average T2

  const alreadyOwnedStocks = useMemo(() => {
    if (!Array.isArray(stocks) || !Array.isArray(etoroPositions)) return [];
    const ownedSyms = new Set(
      etoroPositions
        .map(p => (p.symbol || p.symbolName || '').replace('.US', '').toUpperCase().trim())
        .filter(Boolean)
    );
    return stocks.filter(s => {
      const sym = (s.symbol || s.code || '').replace('.US', '').toUpperCase().trim();
      return sym && ownedSyms.has(sym);
    });
  }, [stocks, etoroPositions]);

  return (
    <div className="portfolio-summary-banner" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', flex: 1 }}>
        <div className="summary-metric">
          <div className="summary-metric-label">Capitale Totale</div>
          <div className="summary-metric-value">
            {capital ? capital.toLocaleString('it-IT') : '10.000'} €
          </div>
          <div style={{ fontSize: '11px', color: 'var(--cyan-primary)' }}>100% Full Deployment</div>
        </div>

        <div className="summary-metric">
          <div className="summary-metric-label">Dimensionamento Dossier</div>
          <div className="summary-metric-value" style={{ color: 'var(--cyan-primary)', fontSize: '18px' }}>
            Dinamico (Step 5)
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Top {count} titoli • Ponderati per R/R</div>
        </div>

        <div className="summary-metric">
          <div className="summary-metric-label">Rischio Max a Stop (-4.5%)</div>
          <div className="summary-metric-value risk">
            -{maxRiskPerTrade} € <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>/ trade</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>1.0% max portafoglio</div>
        </div>

        <div className="summary-metric">
          <div className="summary-metric-label">Target 1 (+6.0% TTM)</div>
          <div className="summary-metric-value profit">
            +{estimatedT1Gain.toLocaleString('it-IT')} €
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>50% sell & Stop a Break-Even</div>
        </div>

        <div className="summary-metric">
          <div className="summary-metric-label">Target 2 (+15.0% TTM)</div>
          <div className="summary-metric-value profit">
            +{estimatedT2Gain.toLocaleString('it-IT')} €
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Profitto finale su restante 50%</div>
        </div>
      </div>

      {/* Cockpit Exclusive: Automated Trading Order Placement & Close CTA */}
      {isCockpit && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '8px' }}>
          <button
            type="button"
            onClick={onOpenEToroModal}
            className="hover:scale-[1.03] active:scale-[0.98]"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
              color: '#000',
              fontWeight: '700',
              fontSize: '13px',
              padding: '10px 18px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(6, 182, 212, 0.35)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            title="Apri pannello pre-flight ed invia gli ordini MIT selezionati al conto Demo eToro"
          >
            <Send size={16} color="#000" />
            <span>⚡ Invia a eToro (Demo)</span>
          </button>

          {/* Sell / Close Positions Button */}
          <button
            type="button"
            onClick={onOpenCloseModal}
            className="hover:scale-[1.03] active:scale-[0.98]"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
              color: '#fff',
              fontWeight: '700',
              fontSize: '13px',
              padding: '10px 18px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(239, 68, 68, 0.35)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            title="Chiudi le posizioni a mercato o cancella gli ordini pendenti relativi a questo run"
          >
            <span style={{ fontSize: '14px' }}>🔴</span>
            <span>Vendi Posizioni Run</span>
          </button>
        </div>
      )}

      {/* Indicator for candidates already open on eToro */}
      {alreadyOwnedStocks.length > 0 && (
        <div style={{
          width: '100%',
          marginTop: '6px',
          padding: '8px 14px',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          fontSize: '12px',
          color: '#34d399'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px' }}>⚡</span>
            <span>
              <strong>{alreadyOwnedStocks.length} {alreadyOwnedStocks.length === 1 ? 'titolo candidato è' : 'titoli candidati sono'} già a mercato su eToro ({alreadyOwnedStocks.map(s => (s.symbol || s.code || '').replace('.US','')).join(', ')}):</strong> contrassegnati con badge verde sulle card e gestiti in sicurezza nel pannello di invio.
            </span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Deselezione automatica per prevenire doppi acquisti
          </span>
        </div>
      )}
    </div>
  );
}

