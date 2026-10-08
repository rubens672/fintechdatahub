import React, { useState, useMemo } from 'react';
import { History, CheckCircle2, Shield, Play, RefreshCw, Sliders, Zap } from 'lucide-react';

export function ControlPanel({
  capital,
  setCapital,
  topN,
  setTopN,
  riskPct,
  setRiskPct,
  strategyFocus = 'ALL',
  setStrategyFocus,
  runId,
  runsList = [],
  onSelectRun,
  executionTime,
  isCockpit = false,
  isRunning = false,
  onRunWorkflow,
  onOpenHealthModal,
  etoroPositions = [],
  etoroExecutionReceipt = null,
}) {
  const PRESET_CAPITALS = [5000, 10000, 25000, 50000, 100000];
  const TOP_N_OPTIONS = [3, 5, 8, 10];
  const STRATEGY_OPTIONS = [
    { id: 'ALL', label: 'Tutti (150+)', icon: '🌐' },
    { id: 'TECH_AI', label: 'AI & Tech', icon: '⚡' },
    { id: 'MOMENTUM', label: 'High-Beta', icon: '🚀' },
    { id: 'GROWTH', label: 'Earnings Beat', icon: '📈' },
  ];
  const STRATEGY_LABELS = {
    ALL: 'Tutti (150+)',
    TECH_AI: 'AI & Tech',
    MOMENTUM: 'High-Beta',
    GROWTH: 'Earnings Beat',
  };

  const handleCapitalChange = (e) => {
    if (!setCapital) return;
    const val = parseFloat(e.target.value.replace(/[^0-9]/g, '')) || 0;
    setCapital(val);
  };

  const handleTopNChange = (e) => {
    if (!setTopN) return;
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const val = parseInt(raw, 10);
    if (!isNaN(val)) {
      setTopN(Math.min(Math.max(val, 1), 50));
    } else if (raw === '') {
      setTopN(0);
    }
  };

  const [filterEtoroOnly, setFilterEtoroOnly] = useState(false);

  // Active eToro Symbols
  const activeEtoroSymbols = useMemo(() => {
    if (!Array.isArray(etoroPositions)) return [];
    return [...new Set(
      etoroPositions
        .map((p) => (p?.symbol || p?.symbolName || '').replace('.US', '').trim().toUpperCase())
        .filter(Boolean)
    )];
  }, [etoroPositions]);

  // Is a run strictly executed/active on eToro?
  const isRunActiveOnEtoro = (r) => {
    if (!r) return false;
    // Explicit execution flag recorded in Firestore (runs/{run_id}.execution_orders) or active session receipt
    return (
      r.has_etoro_execution === true ||
      r.etoro_execution === true ||
      Boolean(etoroExecutionReceipt && etoroExecutionReceipt.run_id === r.run_id && etoroExecutionReceipt.has_executed)
    );
  };

  const etoroRuns = useMemo(() => {
    return (runsList || []).filter(isRunActiveOnEtoro);
  }, [runsList, etoroExecutionReceipt]);

  const displayedRuns = filterEtoroOnly ? etoroRuns : (runsList || []);

  const handleToggleEtoroFilter = (onlyEtoro) => {
    setFilterEtoroOnly(onlyEtoro);
    if (onlyEtoro && etoroRuns.length > 0) {
      if (!etoroRuns.some((r) => r.run_id === runId)) {
        onSelectRun && onSelectRun(etoroRuns[0].run_id);
      }
    }
  };

  // -------------------------------------------------------------
  // COCKPIT MODE (ADMIN / OPERATIONAL CONTROLS)
  // -------------------------------------------------------------
  if (isCockpit) {
    return (
      <div className="control-panel glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', boxSizing: 'border-box' }}>
        {/* Header Bar (Piano Superiore: Pulsanti TUTTO A SINISTRA, Titolo e Badge a Destra) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: '14px',
            flexWrap: 'wrap',
            gap: '12px',
            width: '100%',
          }}
        >
          {/* Pulsanti Diagnostica e Avvia Workflow TUTTO A SINISTRA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Feature 2: Pulsante Diagnostica */}
            <button
              type="button"
              className="btn-secondary"
              onClick={onOpenHealthModal}
              title="Esegui diagnostica completa sui 22+ sottosistemi di mercato"
              style={{
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-main)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Shield size={16} color="var(--cyan-primary)" />
              <span>Diagnostica</span>
            </button>

            {/* Feature 1: Pulsante Avvia Workflow Quantitativo */}
            <button
              type="button"
              className="btn-primary"
              onClick={onRunWorkflow}
              disabled={isRunning || !capital}
              style={{
                padding: '8px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: 700,
                borderRadius: '8px',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 12px rgba(6, 182, 212, 0.25)',
              }}
            >
              {isRunning ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Orchestrazione DAG...</span>
                </>
              ) : (
                <>
                  <Play size={16} fill="currentColor" />
                  <span>Avvia Workflow</span>
                </>
              )}
            </button>
          </div>

          {/* Titolo Sezione e Badge Modalità a destra */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <Sliders size={18} color="var(--cyan-primary)" />
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
              Parametri Quantitativi DAG & Centro Operativo
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                padding: '3px 10px',
                borderRadius: '16px',
              }}
            >
              <CheckCircle2 size={12} color="#38bdf8" />
              <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600 }}>Cockpit Pro</span>
            </div>
          </div>
        </div>

        {/* Griglia Parametri (Piano di Sotto Giustificato 100% Edge-to-Edge, Riga Superiore con Altezze e Allineamento Identici) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))',
            gap: '16px',
            width: '100%',
            alignItems: 'start',
            boxSizing: 'border-box',
          }}
        >

          {/* 2. Dynamic Capital Input */}
          <div className="control-group" style={{ margin: 0, width: '100%' }}>
            <label className="control-label" style={{ height: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span>Capitale</span>
              <span style={{ color: 'var(--cyan-primary)' }}>100% Deploy</span>
            </label>
            <div className="input-wrapper" style={{ width: '100%', height: '40px', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                className="custom-input"
                value={capital ? `${capital.toLocaleString('it-IT')} €` : ''}
                onChange={handleCapitalChange}
                placeholder="es. 10.000 €"
                disabled={isRunning}
                style={{ height: '40px', width: '100%', boxSizing: 'border-box', padding: '0 12px', fontSize: '13px', borderRadius: '8px' }}
              />
            </div>
            <div className="preset-pills" style={{ display: 'flex', width: '100%', gap: '4px', height: '26px', marginTop: '8px' }}>
              {PRESET_CAPITALS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`preset-pill ${capital === preset ? 'active' : ''}`}
                  onClick={() => setCapital && setCapital(preset)}
                  disabled={isRunning}
                  style={{ flex: 1, textAlign: 'center', padding: '0 2px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0, fontSize: '11px', borderRadius: '6px' }}
                >
                  {preset >= 1000 ? `${preset / 1000}k` : `${preset}€`}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Top N Input */}
          <div className="control-group" style={{ margin: 0, width: '100%' }}>
            <label className="control-label" style={{ height: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span>Titoli Dossier</span>
              <span style={{ color: 'var(--cyan-primary)' }}>Top {topN || 0}</span>
            </label>
            <div className="input-wrapper" style={{ width: '100%', height: '40px', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                className="custom-input"
                value={topN ? `Top ${topN}` : ''}
                onChange={handleTopNChange}
                placeholder="es. 5 titoli"
                disabled={isRunning}
                style={{ height: '40px', width: '100%', boxSizing: 'border-box', padding: '0 12px', fontSize: '13px', borderRadius: '8px' }}
              />
            </div>
            <div className="preset-pills" style={{ display: 'flex', width: '100%', gap: '4px', height: '26px', marginTop: '8px' }}>
              {TOP_N_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`preset-pill ${topN === n ? 'active' : ''}`}
                  onClick={() => setTopN && setTopN(n)}
                  disabled={isRunning}
                  style={{ flex: 1, textAlign: 'center', padding: '0 2px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0, fontSize: '11px', borderRadius: '6px' }}
                >
                  Top {n}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Strategy Focus (PULSANTI SU RIGA SINGOLA AD ALTEZZA 40px) */}
          <div className="control-group" style={{ margin: 0, width: '100%' }}>
            <label className="control-label" style={{ height: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span>Focus Strategia</span>
              <span style={{ color: 'var(--cyan-primary)' }}>150+ Titoli</span>
            </label>
            <div
              className="preset-pills"
              style={{
                display: 'flex',
                width: '100%',
                gap: '4px',
                height: '40px',
                margin: 0,
                alignItems: 'center',
              }}
            >
              {STRATEGY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`preset-pill ${strategyFocus === opt.id ? 'active' : ''}`}
                  onClick={() => setStrategyFocus && setStrategyFocus(opt.id)}
                  disabled={isRunning}
                  title={`Filtra per ${opt.label}`}
                  style={{
                    flex: 1,
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '0 4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: strategyFocus === opt.id ? '1px solid var(--cyan-primary)' : '1px solid var(--border-subtle)',
                    background: strategyFocus === opt.id ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: strategyFocus === opt.id ? 'var(--cyan-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                  }}
                >
                  <span style={{ fontSize: '12px' }}>{opt.icon}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {opt.id === 'ALL' ? 'Tutti' : (opt.id === 'TECH_AI' ? 'AI' : (opt.id === 'MOMENTUM' ? 'Beta' : 'Growth'))}
                  </span>
                </button>
              ))}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '8px', textAlign: 'center' }}>
              Paniere multi-settoriale
            </div>
          </div>

          {/* 5. Risk % per Position (PULSANTI SU RIGA SINGOLA AD ALTEZZA 40px) */}
          <div className="control-group" style={{ margin: 0, width: '100%' }}>
            <label className="control-label" style={{ height: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span>Rischio Max Stop</span>
              <span style={{ color: 'var(--red-loss)' }}>
                {((riskPct || 0.01) * 100).toFixed(1)}% ({capital ? (capital * (riskPct || 0.01)).toLocaleString('it-IT', { maximumFractionDigits: 0 }) : 100} €)
              </span>
            </label>
            <div
              className="top-n-selector"
              style={{
                display: 'flex',
                width: '100%',
                gap: '4px',
                height: '40px',
                margin: 0,
                padding: '2px',
                boxSizing: 'border-box',
                alignItems: 'center',
                borderRadius: '8px',
              }}
            >
              {[0.005, 0.01, 0.015, 0.02].map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`top-n-btn ${riskPct === r ? 'active' : ''}`}
                  onClick={() => setRiskPct && setRiskPct(r)}
                  disabled={isRunning}
                  style={{
                    flex: 1,
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    minWidth: 0,
                  }}
                >
                  {(r * 100).toFixed(1)}%
                </button>
              ))}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '8px', textAlign: 'center' }}>
              Cap rigido per trade
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // USER READ-ONLY MODE (DEFAULT)
  // -------------------------------------------------------------
  return (
    <div className="control-panel glass-panel user-control-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '12px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={18} color="var(--cyan-primary)" />
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
            Selezione Dossier Quantitativo Pre-Elaborato
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            padding: '4px 10px',
            borderRadius: '20px',
          }}
        >
          <CheckCircle2 size={13} color="#22c55e" />
          <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600 }}>Archivio Firestore Certificato</span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '16px',
          width: '100%',
          alignItems: 'start',
          boxSizing: 'border-box',
        }}
      >
        {/* 1. Capital Display (Read-Only) */}
        <div className="control-group" style={{ margin: 0, width: '100%', boxSizing: 'border-box' }}>
          <label className="control-label" style={{ height: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span>Capitale Dossier</span>
            <span style={{ color: 'var(--cyan-primary)' }}>Allocazione 100%</span>
          </label>
          <div className="input-wrapper" style={{ width: '100%', height: '40px', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              className="custom-input"
              value={capital ? `${capital.toLocaleString('it-IT')} €` : '10.000 €'}
              readOnly
              disabled
              style={{ height: '40px', width: '100%', boxSizing: 'border-box', padding: '0 12px', fontSize: '13px', borderRadius: '8px', background: 'rgba(30, 41, 59, 0.5)', color: '#f8fafc', fontWeight: 600 }}
            />
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', height: '26px', display: 'flex', alignItems: 'center', marginTop: '8px' }}>
            Dimensione del portafoglio simulato
          </div>
        </div>

        {/* 2. Top N Selected (Read-Only) */}
        <div className="control-group" style={{ margin: 0, width: '100%', boxSizing: 'border-box' }}>
          <label className="control-label" style={{ height: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span>Titoli Scelti</span>
            <span style={{ color: 'var(--cyan-primary)' }}>Top {topN || 5}</span>
          </label>
          <div className="input-wrapper" style={{ width: '100%', height: '40px', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              className="custom-input"
              value={`Top ${topN || 5}`}
              readOnly
              disabled
              style={{ height: '40px', width: '100%', boxSizing: 'border-box', padding: '0 12px', fontSize: '13px', borderRadius: '8px', background: 'rgba(30, 41, 59, 0.5)', color: '#38bdf8', fontWeight: 600, textAlign: 'center' }}
            />
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', height: '26px', display: 'flex', alignItems: 'center', marginTop: '8px' }}>
            Paniere asimmetrico finale
          </div>
        </div>

        {/* 3. Strategy Focus (Read-Only) */}
        <div className="control-group" style={{ margin: 0, width: '100%', boxSizing: 'border-box' }}>
          <label className="control-label" style={{ height: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span>Focus Strategico</span>
            <span style={{ color: 'var(--cyan-primary)' }}>Universo 150+</span>
          </label>
          <div className="input-wrapper" style={{ width: '100%', height: '40px', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              className="custom-input"
              value={STRATEGY_LABELS[strategyFocus] || strategyFocus || 'Tutti (150+)'}
              readOnly
              disabled
              style={{ height: '40px', width: '100%', boxSizing: 'border-box', padding: '0 12px', fontSize: '13px', borderRadius: '8px', background: 'rgba(30, 41, 59, 0.5)', color: '#f8fafc', fontWeight: 600 }}
            />
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', height: '26px', display: 'flex', alignItems: 'center', marginTop: '8px' }}>
            Paniere di screening settoriale
          </div>
        </div>

        {/* 4. Max Risk at Stop-Loss (Read-Only) */}
        <div className="control-group" style={{ margin: 0, width: '100%', boxSizing: 'border-box' }}>
          <label className="control-label" style={{ height: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span>Rischio Max Stop</span>
            <span style={{ color: 'var(--red-loss)' }}>
              {((riskPct || 0.01) * 100).toFixed(1)}% ({capital ? (capital * (riskPct || 0.01)).toLocaleString('it-IT', { maximumFractionDigits: 0 }) : 100} €)
            </span>
          </label>
          <div className="input-wrapper" style={{ width: '100%', height: '40px', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              className="custom-input"
              value={`${((riskPct || 0.01) * 100).toFixed(1)}% Cap`}
              readOnly
              disabled
              style={{ height: '40px', width: '100%', boxSizing: 'border-box', padding: '0 12px', fontSize: '13px', borderRadius: '8px', background: 'rgba(30, 41, 59, 0.5)', color: 'var(--red-loss)', fontWeight: 600, textAlign: 'center' }}
            />
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', height: '26px', display: 'flex', alignItems: 'center', marginTop: '8px' }}>
            Supporto S1 rigido (-4.5%)
          </div>
        </div>
      </div>
    </div>
  );
}
