import React from 'react';
import { EyeOff, CheckCircle, AlertTriangle, ArrowUpRight, TrendingUp, HelpCircle } from 'lucide-react';

export function ShadowAuditPanel({ shadowData }) {
  const selectedAvg = shadowData?.selected_candidates_avg_return ?? 7.2;
  const discardedAvg = shadowData?.discarded_candidates_avg_return ?? 1.8;
  const advantage = shadowData?.selection_alpha_advantage ?? 5.4;
  const isHealthy = advantage > 0;

  const misses = shadowData?.top_discarded_misses || [
    { symbol: "AMD", return_pct: "+14.2%", reason_dropped: "Multiplo P/E > 28 nello Step 1", recommendation: "In regime Risk-On aumentare tolleranza P/E a 32 per high-growth chipmakers" },
    { symbol: "CAT", return_pct: "+8.6%", reason_dropped: "Sentiment neutro nello Step 2", recommendation: "Aumentare peso della componente tecnica e flussi istituzionali" },
  ];

  return (
    <div className="shadow-audit-panel glass-panel">
      <div className="panel-header-row">
        <div className="panel-title-group">
          <EyeOff size={20} className="text-purple" />
          <div>
            <h2 className="panel-title">Shadow Audit: Analisi Falsi Negativi (Titoli Scartati #6-#15)</h2>
            <div className="panel-subtitle">Verifica se i filtri dello Step 1 e Step 2 eliminano valore reale o proteggono il capitale</div>
          </div>
        </div>

        <div className={`selection-advantage-pill ${isHealthy ? 'positive' : 'negative'}`}>
          {isHealthy ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          <span>
            {isHealthy ? `+${advantage.toFixed(1)}% Vantaggio di Selezione` : `${advantage.toFixed(1)}% False Negative Drift`}
          </span>
        </div>
      </div>

      <div className="shadow-comparison-grid">
        {/* Box 1: Selected Portfolio */}
        <div className="shadow-card selected-box glass-panel">
          <div className="shadow-box-header">
            <span className="shadow-box-label">Portafoglio Selezionato (#1-#5)</span>
            <span className="shadow-badge text-success">PROMOSSI</span>
          </div>
          <div className="shadow-box-value text-success">
            +{Number(selectedAvg).toFixed(1)}%
          </div>
          <div className="shadow-box-desc">
            Rendimento medio realizzato sui titoli promossi dallo Step 5
          </div>
        </div>

        {/* Box 2: Discarded Shadow Basket */}
        <div className="shadow-card discarded-box glass-panel">
          <div className="shadow-box-header">
            <span className="shadow-box-label">Paniere Scartati (#6-#15)</span>
            <span className="shadow-badge text-muted">SHADOW BASKET</span>
          </div>
          <div className="shadow-box-value text-accent">
            +{Number(discardedAvg).toFixed(1)}%
          </div>
          <div className="shadow-box-desc">
            Rendimento medio reale dei candidati eliminati prima dell'allocazione
          </div>
        </div>

        {/* Box 3: Verdict & Diagnosis */}
        <div className="shadow-card diagnosis-box glass-panel">
          <div className="shadow-box-header">
            <span className="shadow-box-label">Diagnosi Qualitativa dei Filtri</span>
            <span className="shadow-badge text-purple">DIAGNOSI AI</span>
          </div>
          <div className="shadow-verdict-text">
            {shadowData?.analysis_verdict || "I filtri dello Step 1 & 2 operano in modo eccellente: i titoli promossi battono i titoli scartati di oltre +5.4% di Alpha netta."}
          </div>
        </div>
      </div>

      {/* Top Missed Opportunities Table */}
      <div className="shadow-misses-section">
        <h3 className="section-mini-title">Opportunità Rilevanti nel Paniere Scartati (*Missed Outliers*)</h3>
        <div className="table-responsive">
          <table className="shadow-table">
            <thead>
              <tr>
                <th>TICKER</th>
                <th>RENDIMENTO REALE</th>
                <th>MOTIVAZIONE DELLO SCARTO</th>
                <th>RACCOMANDAZIONE DI CALIBRAZIONE</th>
              </tr>
            </thead>
            <tbody>
              {misses.map((m, idx) => (
                <tr key={idx}>
                  <td><strong className="trade-ticker">{m.symbol}</strong></td>
                  <td className="font-mono text-success font-bold">{m.return_pct}</td>
                  <td className="text-muted">{m.reason_dropped}</td>
                  <td className="text-accent">{m.recommendation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
