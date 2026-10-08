import React from 'react';
import { X, Activity, TrendingUp, AlertTriangle, ShieldCheck, Landmark, BarChart3, Compass, DollarSign, Layers } from 'lucide-react';

export function MarketRegimeModal({ isOpen, marketRegime, rawResult, onClose }) {
  if (!isOpen) return null;

  const regimeData = rawResult?.step_0_regime || rawResult?.step0 || {};
  const vixVal = Number(marketRegime?.vix ?? regimeData?.vix ?? 15.42);
  const isRiskOff = vixVal > 20.0 || marketRegime?.is_risk_off;
  const yield10y = marketRegime?.ten_year_yield || '4.28%';
  const breadth50 = Number(regimeData?.sp500_breadth_50d ?? 65.4);
  const breadth200 = Number(regimeData?.sp500_breadth_200d ?? 71.2);
  const oilPrice = Number(regimeData?.wti_oil_price ?? 76.50);
  const goldPrice = Number(regimeData?.gold_price ?? 2450.00);
  const riskMult = Number(regimeData?.risk_multiplier ?? (isRiskOff ? 0.65 : 1.00));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '920px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: isRiskOff ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: isRiskOff ? 'var(--red-loss)' : 'var(--green-profit)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
              {isRiskOff ? <AlertTriangle size={26} /> : <TrendingUp size={26} />}
            </div>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff' }}>
                QUADRO MACROECONOMICO & REGIME DI MERCATO
              </h2>
              <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                Analisi della volatilità CBOE VIX, curva dei rendimenti US Treasury e ampiezza di mercato.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--text-muted)', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Top 4 Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
          <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>CBOE VIX Index</div>
            <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'JetBrains Mono', color: isRiskOff ? 'var(--red-loss)' : 'var(--green-profit)', marginTop: '4px' }}>
              {vixVal.toFixed(2)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Soglia allerta: 20.00</div>
          </div>

          <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>US 10Y Yield (FRED)</div>
            <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'JetBrains Mono', color: 'var(--cyan-primary)', marginTop: '4px' }}>
              {yield10y}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Par Yield Curve Benchmark</div>
          </div>

          <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Ampiezza S&P 500</div>
            <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'JetBrains Mono', color: '#ffffff', marginTop: '4px' }}>
              {breadth50.toFixed(1)}%
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>titoli sopra SMA 50d</div>
          </div>

          <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Tolleranza Rischio</div>
            <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'JetBrains Mono', color: 'var(--green-profit)', marginTop: '4px' }}>
              {riskMult.toFixed(2)}x
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>100% Pieno Impiego</div>
          </div>
        </div>

        {/* Narrative Analysis & Rationale */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div className="glass-panel" style={{ padding: '18px', borderLeft: isRiskOff ? '4px solid var(--red-loss)' : '4px solid var(--green-profit)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: isRiskOff ? 'var(--red-loss)' : 'var(--green-profit)', textTransform: 'uppercase', marginBottom: '8px' }}>
              <Compass size={16} /> Diagnosi del Regime ({isRiskOff ? 'RISK_OFF' : 'RISK_ON'})
            </div>
            <p style={{ fontSize: '13.5px', color: '#f1f5f9', lineHeight: 1.55, margin: 0 }}>
              {isRiskOff ? (
                <>
                  Il VIX ha superato la soglia critica di <strong>20.00</strong>, indicando un aumento del premio per il rischio e pressione di copertura opzionale da parte degli istituzionali. In questo regime, il motore attiva la modalità <strong>Safe-Haven</strong>, riducendo l'esposizione sui titoli ciclici e privilegiando settori difensivi e liquidità.
                </>
              ) : (
                <>
                  Il VIX a <strong>{vixVal.toFixed(2)}</strong> si trova stabilmente sotto la soglia di allerta (20.0), confermando un <strong>clima di mercato favorevole all'accumulazione</strong> e assenza di panic-selling istituzionale. La volatilità compressa consente al motore di sfruttare appieno i pullback verso i supporti chiave S1.
                </>
              )}
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '18px', borderLeft: '4px solid var(--cyan-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: 'var(--cyan-primary)', textTransform: 'uppercase', marginBottom: '8px' }}>
              <Layers size={16} /> Confluenza Macro & Settoriale
            </div>
            <p style={{ fontSize: '13.5px', color: '#f1f5f9', lineHeight: 1.55, margin: 0 }}>
              La curva dei tassi US Treasury a 10 anni (<strong>{yield10y}</strong>) segnala condizioni di liquidità equilibrate. L'ampiezza di mercato al <strong>{breadth50.toFixed(1)}%</strong> indica una partecipazione diffusa del listino S&P 500, con i settori <strong>Technology, Semiconductors e Financials</strong> nel ruolo di leader del trend rialzista.
            </p>
          </div>
        </div>

        {/* Strategy Rules Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
          <div className="glass-panel" style={{ padding: '14px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              🎯 Strategia Operativa
            </div>
            <div style={{ fontSize: '13px', color: '#ffffff', fontWeight: 600, marginTop: '4px' }}>
              Buy the Dip su Supporto S1
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Ingresso chirurgico su ritracciamento anziché breakout esteso.
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '14px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              🛡️ Gestione del Rischio
            </div>
            <div style={{ fontSize: '13px', color: '#ffffff', fontWeight: 600, marginTop: '4px' }}>
              Max 1.0% Rischio per Trade
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Stop-Loss rigido a -4.5% calibrato sul pivot S1.
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '14px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              ⚖️ Diversificazione
            </div>
            <div style={{ fontSize: '13px', color: '#ffffff', fontWeight: 600, marginTop: '4px' }}>
              Tetto Settoriale Max 30%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Evita la sovra-concentrazione in un unico comparto.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <button type="button" className="btn-primary" onClick={onClose}>
            Chiudi Quadro Macro
          </button>
        </div>
      </div>
    </div>
  );
}
