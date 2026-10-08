import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, Zap, BookOpen, Layers, Newspaper, Bot, ShieldCheck, Sparkles } from 'lucide-react';
import logoImg from '../assets/logo.jpg';

export function Header({
  activeTab,
  onTabChange,
  marketRegime,
  onOpenMarketRegimeModal,
  isCockpit = false,
  health = null,
  onOpenHealthModal,
  isWsConnected = false,
}) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isRiskOff = marketRegime?.vix > 20 || marketRegime?.is_risk_off;

  return (
    <header className="app-header glass-panel">
      {/* Top Row: Logo/Title (Left), Fintech Data Hub Institutional Center (Middle), Status Bar (Right) */}
      <div className="header-top-row">
        <div className="logo-section">
          <div className="logo-icon">
            <img src={logoImg} alt="Fintech Data Hub Logo" className="header-logo-img" />
          </div>
          <div>
            <h1 className="app-title">{isCockpit ? 'FINANCIAL COCKPIT' : 'FINANCIAL USER COCKPIT'}</h1>
            <div className="app-subtitle">
              {isCockpit
                ? 'Quantitative DAG Engine & Institutional Intelligence'
                : 'Institutional Quantitative Intelligence (Read-Only Portal)'}
            </div>
          </div>
        </div>

        {/* Institutional Center Brand */}
        <div className="header-institution-center">
          <span className="institution-tag">Institutional Quantitative Platform</span>
          <h2 className="institution-title">Fintech Data Hub</h2>
        </div>

        {/* Right Status Bar: Time, Stream Live, Risk Regime, 100% Healthy */}
        <div className="header-status-bar">
          {/* Italian Local Time */}
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
            {time.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} IT
          </div>

          {/* Real-time WebSocket Stream Indicator */}
          <div
            className={`status-badge ${isWsConnected ? 'ws-connected' : 'ws-disconnected'}`}
            title={isWsConnected ? 'Stream WebSocket Attivo: Aggiornamenti real-time istantanei (Zero-Polling)' : 'Riconnessione WebSocket al feed di mercato in corso...'}
            style={{ transition: 'all 0.2s ease' }}
          >
            <div className={`pulse-dot ${isWsConnected ? 'pulse-green' : 'pulse-amber'}`} />
            <span style={{ fontSize: '11px', letterSpacing: '0.04em' }}>
              {isWsConnected ? '● STREAM LIVE' : '○ CONNECTING...'}
            </span>
          </div>

          {/* Market Regime Badge (VIX) */}
          <div
            className={`status-badge ${isRiskOff ? 'risk-off' : 'healthy'}`}
            onClick={onOpenMarketRegimeModal}
            style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
            title="Clicca per visualizzare l'analisi dettagliata del Regime di Mercato e Macro Contesto"
          >
            {isRiskOff ? <AlertTriangle size={15} /> : <TrendingUp size={15} />}
            <span>
              {isRiskOff ? '⚠️ RISK_OFF' : '✓ RISK_ON'} (VIX: {marketRegime?.vix ? marketRegime.vix.toFixed(1) : '15.4'})
            </span>
          </div>

          {/* Health Diagnostics Badge (Available in Cockpit mode) */}
          {isCockpit && (
            <div
              className="status-badge healthy"
              onClick={onOpenHealthModal}
              style={{ cursor: 'pointer' }}
              title="Clicca per aprire il cruscotto di diagnostica dettagliato"
            >
              <div className="pulse-dot" />
              <ShieldCheck size={16} />
              <span>{health?.system_status || '🟢 100% HEALTHY'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Navigation Tabs with ample space and distribution */}
      <div className="header-bottom-row">
        <div className="header-nav-tabs">
          <button
            className={`nav-tab-btn ${activeTab === 'screener' ? 'active' : ''}`}
            onClick={() => onTabChange('screener')}
          >
            <Zap size={16} />
            <span>Live Screener</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => onTabChange('audit')}
          >
            <Layers size={16} />
            <span>Quant Audit & Learning Lab</span>
            <span className="tab-pill-badge">{isCockpit ? 'PRO' : 'AUDIT'}</span>
          </button>

          {isCockpit && (
            <button
              className={`nav-tab-btn ${activeTab === 'harvest' ? 'active' : ''}`}
              onClick={() => onTabChange('harvest')}
              style={activeTab === 'harvest' ? { borderColor: 'rgba(168, 85, 247, 0.6)', background: 'rgba(168, 85, 247, 0.15)' } : {}}
              title="Visualizza la gestione clinica delle uscite, Chandelier Ratchet e riciclo capitale"
            >
              <Sparkles size={16} color={activeTab === 'harvest' ? '#c084fc' : undefined} />
              <span style={activeTab === 'harvest' ? { color: '#c084fc', fontWeight: 600 } : {}}>Alpha Harvest</span>
              <span className="tab-pill-badge" style={{ background: '#7c3aed', color: '#ffffff' }}>
                6 PILASTRI
              </span>
            </button>
          )}

          <button
            className={`nav-tab-btn ${activeTab === 'hub' ? 'active hub-active' : ''}`}
            onClick={() => onTabChange('hub')}
          >
            <Newspaper size={16} />
            <span>FintechDataHub</span>
            <span className="tab-pill-badge hub-live-badge">
              <span className="hub-pulse-dot" /> LIVE
            </span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'methodology' ? 'active' : ''}`}
            onClick={() => onTabChange('methodology')}
            title="Visualizza la specifica matematica e ingegneristica del DAG Workflow"
          >
            <BookOpen size={16} />
            <span>Metodologia & Formule DAG</span>
          </button>

          {/* 5th Tab: AI Financial Copilot (Available in Cockpit mode) */}
          {isCockpit && (
            <button
              className={`nav-tab-btn ai-copilot-btn ${activeTab === 'copilot' ? 'active' : ''}`}
              onClick={() => onTabChange('copilot')}
              style={{
                background: activeTab === 'copilot' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(56, 189, 248, 0.08)',
                borderColor: activeTab === 'copilot' ? 'rgba(56, 189, 248, 0.6)' : 'rgba(56, 189, 248, 0.4)',
              }}
              title="Apri l'Assistente Finanziario Conversazionale Chainlit"
            >
              <Bot size={16} color="#38bdf8" />
              <span style={{ color: '#38bdf8', fontWeight: 600 }}>AI Copilot</span>
              <span className="tab-pill-badge" style={{ background: '#0284c7', color: '#ffffff' }}>
                ADK
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
