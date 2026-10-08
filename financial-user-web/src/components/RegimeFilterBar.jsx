import React from 'react';
import { RefreshCw, Activity, ShieldAlert, Compass, Sparkles } from 'lucide-react';

export function RegimeFilterBar({ selectedRegime, onSelectRegime, onRefreshAudit, isRefreshing, globalKpis }) {
  const regimes = [
    { id: 'ALL', label: 'Tutti i Regimi', icon: Compass, color: 'var(--accent-primary)' },
    { id: 'RISK_ON', label: '🟢 RISK_ON', icon: Sparkles, color: 'var(--success)' },
    { id: 'RISK_OFF', label: '🔴 RISK_OFF', icon: ShieldAlert, color: 'var(--danger)' },
    { id: 'NEUTRAL_CHOPPY', label: '🟡 NEUTRAL', icon: Activity, color: 'var(--warning)' },
  ];

  return (
    <div className="regime-filter-bar glass-panel">
      <div className="regime-selector-group">
        <span className="regime-selector-label">Filtro Regime di Mercato:</span>
        <div className="regime-pills">
          {regimes.map((r) => {
            const Icon = r.icon;
            const isActive = selectedRegime === r.id;
            return (
              <button
                key={r.id}
                className={`regime-pill-btn ${isActive ? 'active' : ''}`}
                onClick={() => onSelectRegime(r.id)}
                style={{
                  borderColor: isActive ? r.color : 'transparent',
                  background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                }}
              >
                <Icon size={14} style={{ color: r.color }} />
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="regime-bar-actions">
        <button
          className="refresh-audit-btn glass-button"
          onClick={onRefreshAudit}
          disabled={isRefreshing}
          title="Riconcilia i trade storici con i prezzi realtime e ricalcola metriche e attribuzione"
        >
          <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
          <span>{isRefreshing ? 'Riconciliazione in corso...' : 'Riconcilia Dati Reali'}</span>
        </button>
      </div>
    </div>
  );
}
