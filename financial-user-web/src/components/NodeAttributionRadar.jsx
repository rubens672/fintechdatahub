import React from 'react';
import { Layers, CheckCircle2, Zap, ArrowRight } from 'lucide-react';

export function NodeAttributionRadar({ nodes }) {
  const defaultNodes = [
    { step_index: 0, node_name: "Regime Detector", full_name: "Step 0: Market Regime Detector", accuracy_score: 94, value_add_alpha: "+1.8%", status: "EXCELLENT", insight: "Accurata classificazione VIX & spread Treasury, evitando falsi breakout." },
    { step_index: 1, node_name: "Factor Screener", full_name: "Step 1: Multi-Factor Screener", accuracy_score: 92, value_add_alpha: "+2.4%", status: "EXCELLENT", insight: "Filtri ROIC e transazioni del Congresso (STOCK Act) in cima al ranking." },
    { step_index: 2, node_name: "Catalysts & News", full_name: "Step 2: Catalysts & News Sentiment", accuracy_score: 88, value_add_alpha: "+1.2%", status: "OPTIMAL", insight: "Motore lessicale finanziario efficace nell'eliminare trappole di sentiment." },
    { step_index: 3, node_name: "Technical Timing", full_name: "Step 3: Technical Timing & Levels", accuracy_score: 89, value_add_alpha: "+1.6%", status: "OPTIMAL", insight: "Ingressi su supporti e pivot Fibonacci hanno minimizzato il drawdown." },
    { step_index: 4, node_name: "Relative Valuation", full_name: "Step 4: Relative Valuation", accuracy_score: 85, value_add_alpha: "+0.9%", status: "GOOD", insight: "Multipli PEG ed EV/EBITDA solidi; buon margine di sicurezza fondamentale." },
    { step_index: 5, node_name: "Portfolio Sizing", full_name: "Step 5: Portfolio Sizing & Risk Cap", accuracy_score: 96, value_add_alpha: "+3.1%", status: "EXCELLENT", insight: "Vincolo max 1% risk e 30% cap settoriale hanno abbattuto il Max DD a -3.8%." },
    { step_index: 6, node_name: "Backtest Verification", full_name: "Step 6: Backtest & Forecast Verification", accuracy_score: 87, value_add_alpha: "+0.8%", status: "OPTIMAL", insight: "Sharpe stimato 1.48 aderente allo Sharpe reale di 1.42 (RMSE < 0.08)." },
  ];

  const rawList = (nodes && nodes.length > 0) ? nodes : defaultNodes;
  const displayNodes = rawList.map((n, i) => ({
    ...defaultNodes[i],
    ...n,
    step_index: n.step_index !== undefined ? n.step_index : i,
    node_name: n.node_name ? n.node_name.replace(/^Step \d+:\s*/i, '') : defaultNodes[i].node_name,
    full_name: n.full_name || n.node_name || defaultNodes[i].full_name,
  }));

  const getStatusBadge = (status) => {
    switch (status) {
      case 'EXCELLENT':
        return <span className="status-pill status-excellent">★ TOP</span>;
      case 'OPTIMAL':
        return <span className="status-pill status-optimal">✓ OPTIMAL</span>;
      default:
        return <span className="status-pill status-good">STABLE</span>;
    }
  };

  return (
    <div className="node-attribution-panel glass-panel">
      <div className="panel-header-row">
        <div className="panel-title-group">
          <Layers size={20} className="text-accent" />
          <div>
            <h2 className="panel-title">DAG 7-Node Attribution Decomposition</h2>
            <div className="panel-subtitle">Attribuzione predittiva di Alpha e accuratezza per ciascuno step del workflow quantitativo</div>
          </div>
        </div>
        <div className="attribution-summary-badge">
          <span>Alpha Cumulata Generata: </span>
          <strong className="text-success">+11.8%</strong>
        </div>
      </div>

      {/* 7-Step Pipeline in a Single Horizontal Row */}
      <div className="attribution-cards-row">
        {displayNodes.map((n, idx) => {
          const score = n.accuracy_score || 90;
          return (
            <div key={n.step_index} className="node-attribution-card horizontal-card">
              <div className="node-card-top-compact">
                <div className="node-step-badge">
                  <span className="step-num-text">S{n.step_index}</span>
                </div>
                <div className="node-top-metrics">
                  <span className="node-alpha-badge-compact">{n.value_add_alpha}</span>
                  {getStatusBadge(n.status)}
                </div>
              </div>

              <div className="node-card-title-wrap">
                <h4 className="node-compact-title" title={n.full_name}>
                  {n.node_name}
                </h4>
              </div>

              {/* Progress bar */}
              <div className="node-progress-container-compact">
                <div className="node-progress-labels-compact">
                  <span>Accuratezza</span>
                  <strong className="text-accent">{score}%</strong>
                </div>
                <div className="node-progress-bar-bg">
                  <div 
                    className="node-progress-bar-fill"
                    style={{ 
                      width: `${score}%`,
                      background: score >= 90 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #3b82f6, #6366f1)',
                    }}
                  />
                </div>
              </div>

              {/* Insight text */}
              <div className="node-insight-compact">
                <span>💡 {n.insight}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
