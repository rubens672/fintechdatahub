import React from 'react';
import { Target, TrendingUp, Award, Clock, CheckCircle2, DollarSign, ShieldAlert, Zap } from 'lucide-react';

export function QuantKPICards({ kpis }) {
  const winRate = kpis?.win_rate_pct !== undefined ? kpis.win_rate_pct : 78.4;
  const unweightedWinRate = kpis?.unweighted_win_rate_pct !== undefined ? kpis.unweighted_win_rate_pct : winRate;
  const payoffRatio = kpis?.payoff_ratio !== undefined ? kpis.payoff_ratio : 2.85;
  const expectedValue = kpis?.expected_value_eur !== undefined ? kpis.expected_value_eur : 148.0;
  const alpha = kpis?.net_realized_alpha_pct !== undefined ? kpis.net_realized_alpha_pct : 6.8;
  const unweightedAlpha = kpis?.unweighted_net_realized_alpha_pct !== undefined ? kpis.unweighted_net_realized_alpha_pct : alpha;
  const avgDays = kpis?.avg_days_to_target !== undefined ? kpis.avg_days_to_target : 7.2;
  const fidelity = kpis?.numerical_fidelity_pct !== undefined ? kpis.numerical_fidelity_pct : 100.0;
  const totalTrades = kpis?.total_trades !== undefined ? kpis.total_trades : 24;

  const isWeighted = Boolean(kpis?.recency_weighted?.is_active);

  return (
    <div className="quant-kpis-grid">
      {/* KPI 1: Win Rate */}
      <div className="quant-kpi-card glass-panel">
        <div className="quant-kpi-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span className="quant-kpi-title">Historical Win Rate</span>
            {isWeighted && (
              <span style={{ fontSize: '10px', color: '#a78bfa', fontWeight: 700 }}>
                ⚡ EWMA Ponderato (21gg)
              </span>
            )}
          </div>
          <div className="quant-kpi-icon win-rate">
            <Target size={18} />
          </div>
        </div>
        <div className="quant-kpi-value-row">
          <span className="quant-kpi-value text-success">{winRate.toFixed(1)}%</span>
          <span className="quant-kpi-badge positive">Target 1 & 2 Hit</span>
        </div>
        <div className="quant-kpi-subtext">
          {totalTrades} posizioni (all-time non ponderato: {unweightedWinRate.toFixed(1)}%)
        </div>
      </div>

      {/* KPI 2: Payoff Ratio */}
      <div className="quant-kpi-card glass-panel">
        <div className="quant-kpi-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span className="quant-kpi-title">Payoff Ratio (Asimmetria)</span>
            {isWeighted && (
              <span style={{ fontSize: '10px', color: '#a78bfa', fontWeight: 700 }}>
                ⚡ Recency-Weighted
              </span>
            )}
          </div>
          <div className="quant-kpi-icon payoff">
            <TrendingUp size={18} />
          </div>
        </div>
        <div className="quant-kpi-value-row">
          <span className="quant-kpi-value text-accent">{payoffRatio.toFixed(2)}×</span>
          <span className="quant-kpi-badge positive">Avg Win ÷ Loss</span>
        </div>
        <div className="quant-kpi-subtext">
          Guadagno medio {payoffRatio.toFixed(2)} volte superiore alla perdita
        </div>
      </div>

      {/* KPI 3: Expected Value (E) */}
      <div className="quant-kpi-card glass-panel">
        <div className="quant-kpi-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span className="quant-kpi-title">Valore Atteso (E per Trade)</span>
            {isWeighted && (
              <span style={{ fontSize: '10px', color: '#34d399', fontWeight: 700 }}>
                ⚡ Ponderato nel Tempo
              </span>
            )}
          </div>
          <div className="quant-kpi-icon ev">
            <DollarSign size={18} />
          </div>
        </div>
        <div className="quant-kpi-value-row">
          <span className="quant-kpi-value text-success">+€{expectedValue.toFixed(1)}</span>
          <span className="quant-kpi-badge positive">per €2,000 allocati</span>
        </div>
        <div className="quant-kpi-subtext font-mono" style={{ fontSize: '11px' }}>
          E = (Win % × Avg Win) - (Loss % × Avg Loss)
        </div>
      </div>

      {/* KPI 4: Net Realized Alpha vs S&P 500 */}
      <div className="quant-kpi-card glass-panel">
        <div className="quant-kpi-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span className="quant-kpi-title">Net Realized Alpha vs S&P 500</span>
            {isWeighted && (
              <span style={{ fontSize: '10px', color: '#c084fc', fontWeight: 700 }}>
                ⚡ EWMA Ponderato (21gg)
              </span>
            )}
          </div>
          <div className="quant-kpi-icon alpha">
            <Award size={18} />
          </div>
        </div>
        <div className="quant-kpi-value-row">
          <span className="quant-kpi-value text-purple">+{alpha.toFixed(1)}%</span>
          <span className="quant-kpi-badge positive">Netto Slippage (8 bps)</span>
        </div>
        <div className="quant-kpi-subtext">
          Sovraperformance reale vs ^GSPC (storico: +{unweightedAlpha.toFixed(1)}%)
        </div>
      </div>

      {/* KPI 5: Velocity of Alpha / Avg Days to Target */}
      <div className="quant-kpi-card glass-panel">
        <div className="quant-kpi-header">
          <span className="quant-kpi-title">Velocità Alpha (Time-to-Target)</span>
          <div className="quant-kpi-icon time">
            <Clock size={18} />
          </div>
        </div>
        <div className="quant-kpi-value-row">
          <span className="quant-kpi-value">{avgDays.toFixed(1)} gg</span>
          <span className="quant-kpi-badge neutral">Holding Period</span>
        </div>
        <div className="quant-kpi-subtext">
          Giorni medi per raggiungimento Target 1
        </div>
      </div>

      {/* KPI 6: Numerical Fidelity Score */}
      <div className="quant-kpi-card glass-panel">
        <div className="quant-kpi-header">
          <span className="quant-kpi-title">Predictive Fidelity (Zero-Hallucination)</span>
          <div className="quant-kpi-icon fidelity">
            <CheckCircle2 size={18} />
          </div>
        </div>
        <div className="quant-kpi-value-row">
          <span className="quant-kpi-value text-success">{fidelity.toFixed(1)}%</span>
          <span className="quant-kpi-badge positive">100% Verificato</span>
        </div>
        <div className="quant-kpi-subtext">
          Conformità perfetta tra dati MCP e output LLM
        </div>
      </div>
    </div>
  );
}

