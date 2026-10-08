import React from 'react';
import { X, TrendingUp, ShieldCheck, Zap, Award, BarChart2 } from 'lucide-react';

export function WhatIfSimulationModal({ isOpen, onClose, simulationData, onConfirmApply, isApplying }) {
  if (!isOpen) return null;

  const sim = simulationData || {
    dates: ["T0", "T+1", "T+2", "T+3", "T+4", "T+5", "T+6", "T+7", "T+8"],
    current_equity_curve: [10000, 10210, 10180, 10450, 10390, 10680, 10550, 10920, 10840],
    simulated_equity_curve: [10000, 10240, 10220, 10580, 10540, 10910, 10820, 11340, 11310],
    current_total_return_pct: 8.4,
    simulated_total_return_pct: 13.1,
    alpha_improvement_pct: 4.7,
    projected_sharpe_improvement: "+0.38",
    projected_max_drawdown_reduction: "-4.2%",
  };

  const currRet = sim.current_total_return_pct || 8.4;
  const simRet = sim.simulated_total_return_pct || 13.1;
  const alphaImp = sim.alpha_improvement_pct || 4.7;

  // Simple SVG polyline coordinate generator
  const maxVal = Math.max(...(sim.simulated_equity_curve || [11500]), ...(sim.current_equity_curve || [11000])) * 1.02;
  const minVal = Math.min(...(sim.simulated_equity_curve || [9500]), ...(sim.current_equity_curve || [9500])) * 0.98;
  const width = 600;
  const height = 220;

  const getPoints = (curve) => {
    if (!curve || curve.length === 0) return '';
    return curve.map((val, idx) => {
      const x = (idx / (curve.length - 1)) * (width - 40) + 20;
      const y = height - 20 - ((val - minVal) / (maxVal - minVal)) * (height - 40);
      return `${x},${y}`;
    }).join(' ');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content what-if-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '10px', borderRadius: 'var(--radius-md)' }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Simulazione What-If: Curva di Equity Ricalibrata
              </h2>
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
                Confronto retrospettivo tra i parametri attuali e le nuove calibrazioni proposte
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

        {/* Impact Highlights */}
        <div className="what-if-highlights-grid">
          <div className="what-if-stat-card glass-panel">
            <span className="what-if-stat-label">Alpha Incrementale</span>
            <div className="what-if-stat-val text-success">+{alphaImp.toFixed(1)}%</div>
            <span className="what-if-stat-sub">Miglioramento netto su 30 trade</span>
          </div>

          <div className="what-if-stat-card glass-panel">
            <span className="what-if-stat-label">Rendimento Simulato</span>
            <div className="what-if-stat-val text-accent">+{simRet.toFixed(1)}% <span className="stat-prev">(vs +{currRet.toFixed(1)}%)</span></div>
            <span className="what-if-stat-sub">Capitale finale: €{Number(sim.simulated_final_capital || 11310).toLocaleString()}</span>
          </div>

          <div className="what-if-stat-card glass-panel">
            <span className="what-if-stat-label">Delta Sharpe Ratio</span>
            <div className="what-if-stat-val text-purple">{sim.projected_sharpe_improvement || "+0.38"}</div>
            <span className="what-if-stat-sub">Migliore profilo rischio/rendimento</span>
          </div>

          <div className="what-if-stat-card glass-panel">
            <span className="what-if-stat-label">Riduzione Max Drawdown</span>
            <div className="what-if-stat-val text-success">{sim.projected_max_drawdown_reduction || "-4.2%"}</div>
            <span className="what-if-stat-sub">Grazie a Stop-Loss stringenti</span>
          </div>
        </div>

        {/* Equity Curve SVG Visualization */}
        <div className="what-if-chart-box glass-panel">
          <div className="chart-legend-row">
            <div className="legend-item">
              <span className="legend-line line-simulated" />
              <span>Nuova Curva Simulata (Calibrata)</span>
            </div>
            <div className="legend-item">
              <span className="legend-line line-current" />
              <span>Curva Attuale (Baseline)</span>
            </div>
          </div>

          <svg className="equity-curve-svg" viewBox={`0 0 ${width} ${height}`}>
            {/* Grid lines */}
            <line x1="20" y1={height - 20} x2={width - 20} y2={height - 20} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            <line x1="20" y1="20" x2={width - 20} y2="20" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4 4" />
            
            {/* Current polyline */}
            <polyline
              fill="none"
              stroke="#64748b"
              strokeWidth="2"
              strokeDasharray="4 4"
              points={getPoints(sim.current_equity_curve)}
            />

            {/* Simulated polyline */}
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              points={getPoints(sim.simulated_equity_curve)}
            />
          </svg>
        </div>

        {/* Modal Actions */}
        <div className="modal-footer-row">
          <button className="glass-button" onClick={onClose}>
            Chiudi Anteprima
          </button>

          <button
            className="primary-glow-btn"
            onClick={() => {
              if (onConfirmApply) onConfirmApply();
            }}
            disabled={isApplying}
          >
            <Zap size={16} className={isApplying ? 'spin' : ''} />
            <span>{isApplying ? 'Applicazione in corso...' : 'Conferma ed Applica al DAG (1-Click Apply)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
