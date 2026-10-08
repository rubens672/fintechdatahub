import React, { useState, useEffect } from 'react';
import { 
  X, Send, ShieldCheck, AlertCircle, CheckCircle2, 
  Loader2, DollarSign, Layers, CheckSquare, Square,
  TrendingUp, AlertTriangle, Info
} from 'lucide-react';
import { api } from '../services/api';

export function EToroExecutionModal({ isOpen, runId, onClose, onExecutionComplete }) {
  if (!isOpen) return null;

  const [loadingPreflight, setLoadingPreflight] = useState(true);
  const [preflightData, setPreflightData] = useState(null);
  const [error, setError] = useState(null);
  const [strategy, setStrategy] = useState('adaptive'); // 'adaptive' | 'dual_tranche' | 'single_t2'
  const [selectedSymbols, setSelectedSymbols] = useState({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);

  // Load preflight verification when modal opens
  useEffect(() => {
    if (runId) {
      loadPreflight();
    } else {
      setLoadingPreflight(false);
      setError('Nessuna run quantitativa selezionata. Seleziona una run dal menu in alto prima di eseguire il Pre-Flight Check.');
    }
  }, [runId]);

  const loadPreflight = async () => {
    if (!runId || !runId.startsWith('run_20')) {
      setLoadingPreflight(false);
      setError(`ID Run non valido ("${runId || 'nessuno'}"). Seleziona una run completata dal menu in alto o attendi il completamento del workflow.`);
      return;
    }

    setLoadingPreflight(true);
    setError(null);
    setExecutionResult(null);
    try {
      const data = await api.getEToroPreflight(runId, 'demo');
      setPreflightData(data);
      // Initialize candidates: select candidate if not already pending on broker
      const initialSelected = {};
      const plans = data.orders_plan || [];
      const allAlreadyPlaced = plans.length > 0 && plans.every((p) => p.already_placed);

      plans.forEach((p) => {
        initialSelected[p.symbol] = !p.already_placed;
      });

      // If none selected and NOT all are already placed, default to all selected
      const hasAnySelected = Object.values(initialSelected).some(Boolean);
      if (!hasAnySelected && !allAlreadyPlaced && plans.length > 0) {
        plans.forEach((p) => {
          initialSelected[p.symbol] = true;
        });
      }
      setSelectedSymbols(initialSelected);
    } catch (err) {
      console.error('Error fetching eToro preflight:', err);
      const rawMsg = err.message || '';
      if (rawMsg.includes('404') || rawMsg.includes('Not Found') || rawMsg.includes('non trovata')) {
        setError(`Run quantitativa "${runId}" non trovata su Firestore. Seleziona una run completata dall'elenco a tendina in alto.`);
      } else {
        setError(rawMsg || 'Errore nel caricamento del pre-flight eToro.');
      }
    } finally {
      setLoadingPreflight(false);
    }
  };

  const toggleSymbol = (symbol) => {
    setSelectedSymbols((prev) => ({
      ...prev,
      [symbol]: !prev[symbol],
    }));
  };

  const toggleSelectAll = () => {
    const allSelected = Object.values(selectedSymbols).every(Boolean);
    const updated = {};
    (preflightData?.orders_plan || []).forEach((p) => {
      updated[p.symbol] = !allSelected;
    });
    setSelectedSymbols(updated);
  };

  const activeCandidates = (preflightData?.orders_plan || []).filter(
    (p) => selectedSymbols[p.symbol]
  );

  const totalSelectedNotional = activeCandidates.reduce(
    (acc, p) => acc + (p.total_notional_usd || 0),
    0
  );

  const availableCash = preflightData?.available_cash ?? preflightData?.availableCash ?? 0;
  const isCashSufficient = preflightData?.is_cash_sufficient ?? preflightData?.cashSufficient ?? (availableCash >= totalSelectedNotional);

  const allAlreadyPlaced = (preflightData?.orders_plan || []).length > 0 &&
    (preflightData?.orders_plan || []).every((p) => p.already_placed);

  const marketRegime = preflightData?.market_regime || 'RISK_ON';
  const effectiveStrategy = strategy === 'adaptive'
    ? (marketRegime === 'RISK_ON' ? 'single_runner' : 'single_tp_t1')
    : strategy;

  const handleExecuteOrders = async () => {
    if (activeCandidates.length === 0) return;
    setIsExecuting(true);
    setError(null);

    const symbolsToSend = activeCandidates.map((p) => p.symbol);
    try {
      const res = await api.executeEToroOrders(runId, symbolsToSend, strategy, 'demo');
      setExecutionResult(res);
      if (onExecutionComplete) {
        onExecutionComplete(res);
      }
    } catch (err) {
      console.error('Execution error:', err);
      setError(err.message || "Errore durante l'inserimento degli ordini su eToro.");
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '960px', 
          maxHeight: '92vh', 
          overflow: 'hidden', 
          display: 'flex', 
          flexDirection: 'column',
          padding: '24px 28px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-highlight)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.9), 0 0 40px rgba(6, 182, 212, 0.2)'
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--green-profit)', padding: '10px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Send size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
                  ESECUZIONE AUTOMATICA ETORO
                </h2>
                <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--green-profit)', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
                  Ambiente Demo
                </span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                Run quantitativo: <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--cyan-primary)', fontWeight: 600 }}>{runId}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--text-muted)', padding: '8px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 4px 10px 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {loadingPreflight ? (
            <div style={{ padding: '80px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', color: 'var(--cyan-primary)' }}>
              <Loader2 size={32} className="animate-spin" />
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>
                Verifica liquidità, posizioni e saldo in corso su eToro Demo...
              </p>
            </div>
          ) : error && !preflightData ? (
            <div style={{ padding: '16px 20px', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', color: 'var(--red-loss)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4 style={{ fontWeight: 700, fontSize: '14px', color: '#ffffff' }}>Impossibile completare il Pre-Flight Check</h4>
                <p style={{ fontSize: '13px', marginTop: '4px', color: '#fca5a5' }}>{error}</p>
                <button
                  type="button"
                  onClick={loadPreflight}
                  style={{ marginTop: '12px', padding: '6px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.25)', border: 'none', color: '#ffffff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Riprova Verifica
                </button>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div style={{ padding: '14px 18px', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <AlertCircle size={20} style={{ color: 'var(--red-loss)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: '13px' }}>Errore durante l'invio ordini:</strong>
                    <div style={{ fontSize: '12px', color: '#fca5a5', marginTop: '2px' }}>{error}</div>
                  </div>
                </div>
              )}

              {/* Top Summary Cards (3 Columns) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <DollarSign size={14} color="var(--green-profit)" />
                    Cassa Disponibile eToro Demo
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'JetBrains Mono', color: 'var(--green-profit)' }}>
                    {availableCash ? `$${availableCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Account Demo: <strong style={{ fontFamily: 'JetBrains Mono', color: '#ffffff' }}>33932108</strong>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={14} color="var(--cyan-primary)" />
                    Nozionale Selezionato
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'JetBrains Mono', color: 'var(--cyan-primary)' }}>
                    ${totalSelectedNotional.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    <strong style={{ color: '#ffffff' }}>{activeCandidates.length}</strong> titoli su {preflightData?.orders_plan?.length || 0} selezionati
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={14} color="var(--purple-accent)" />
                    Stato Liquidità
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                    {isCashSufficient ? (
                      <>
                        <CheckCircle2 size={18} color="var(--green-profit)" />
                        <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--green-profit)' }}>Liquidità Sufficiente</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={18} color="var(--amber-gold)" />
                        <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--amber-gold)' }}>Fondi Insufficienti</span>
                      </>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Rischio max: <strong style={{ color: '#ffffff' }}>1.0%</strong> per posizione
                  </div>
                </div>
              </div>

              {/* Warnings Banner if any */}
              {preflightData?.warnings && preflightData.warnings.length > 0 && (
                <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', color: 'var(--amber-gold)' }}>
                  <div style={{ fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <AlertTriangle size={14} />
                    Avvisi di Pre-Flight & Protezione:
                  </div>
                  <ul style={{ paddingLeft: '18px', fontSize: '12px', lineHeight: 1.5, color: '#fef08a' }}>
                    {preflightData.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Informational Banner if all orders are already placed */}
              {allAlreadyPlaced && (
                <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8' }}>
                  <div style={{ fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Info size={15} />
                    Tutti gli ordini di questa run risultano già registrati e pendenti su eToro.
                  </div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px', lineHeight: 1.5 }}>
                    I titoli sono già attivi a mercato in attesa dell'esecuzione sul livello limite S1. Puoi selezionare manualmente i titoli dalla tabella sottostante se desideri inviare quote aggiuntive.
                  </div>
                </div>
              )}

              {/* Execution Strategy Selector */}
              <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <TrendingUp size={15} color="var(--cyan-primary)" />
                    Strategia di Esecuzione Ordini eToro:
                  </div>
                  {preflightData?.market_regime && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Regime DAG:</span>
                      <strong style={{
                        color: preflightData.market_regime === 'RISK_ON' ? 'var(--green-profit)' : (preflightData.market_regime === 'RISK_OFF' ? 'var(--red-loss)' : 'var(--amber-gold)')
                      }}>
                        {preflightData.market_regime}
                      </strong>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Option 1: Adaptive Model 3 (Recommended) */}
                  <div
                    onClick={() => setStrategy('adaptive')}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      border: strategy === 'adaptive' ? '1px solid var(--cyan-primary)' : '1px solid var(--border-subtle)',
                      background: strategy === 'adaptive' ? 'rgba(6, 182, 212, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      boxShadow: strategy === 'adaptive' ? '0 0 15px rgba(6, 182, 212, 0.2)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input
                      type="radio"
                      name="strategy"
                      value="adaptive"
                      checked={strategy === 'adaptive'}
                      onChange={() => setStrategy('adaptive')}
                      style={{ marginTop: '4px', accentColor: 'var(--cyan-primary)', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span>Strategia Adattiva al Regime</span>
                        <span style={{ fontSize: '10px', background: 'rgba(6, 182, 212, 0.2)', color: 'var(--cyan-primary)', border: '1px solid rgba(6, 182, 212, 0.4)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          CONSIGLIATO
                        </span>
                        <span style={{ fontSize: '10px', background: effectiveStrategy === 'single_runner' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: effectiveStrategy === 'single_runner' ? 'var(--green-profit)' : 'var(--amber-gold)', border: `1px solid ${effectiveStrategy === 'single_runner' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`, padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          {effectiveStrategy === 'single_runner' ? '⚡ Azione: Uncapped Alpha Runner (No TP + BE a T1 + Trailing)' : '🎯 Azione: Take Profit a Target 1 (1.5R)'}
                        </span>
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.45 }}>
                        {marketRegime === 'RISK_ON'
                          ? 'In regime RISK_ON: per i titoli SUPER_TREND corre senza Take Profit (Uncapped Runner) con Break-Even Netto a T1 e Trailing Stop Ratchet; per i titoli Swing (NO_SUPER_TREND) ancora il Take Profit su Target 2 (3.0R).'
                          : 'In regime NEUTRAL_CHOPPY / RISK_OFF: Take Profit prudenziale su Target 2 o Target 1 per monetizzare alla resistenza prima del ritracciamento, con Stop Loss a protezione del capitale.'}
                      </p>
                    </div>
                  </div>

                  {/* Manual Overrides (2 Columns) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div
                      onClick={() => setStrategy('single_runner')}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        border: strategy === 'single_runner' ? '1px solid var(--cyan-primary)' : '1px solid var(--border-subtle)',
                        background: strategy === 'single_runner' ? 'rgba(6, 182, 212, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                        boxShadow: strategy === 'single_runner' ? '0 0 15px rgba(6, 182, 212, 0.2)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input
                        type="radio"
                        name="strategy"
                        value="single_runner"
                        checked={strategy === 'single_runner'}
                        onChange={() => setStrategy('single_runner')}
                        style={{ marginTop: '3px', accentColor: 'var(--cyan-primary)', cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>
                          Uncapped Runner (No TP • Trailing)
                        </div>
                        <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.35 }}>
                          Esegue l'ordine senza Take Profit, lasciando correre la posizione con Trailing Stop Ratchet.
                        </p>
                      </div>
                    </div>

                    <div
                      onClick={() => setStrategy('single_tp_t1')}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        border: strategy === 'single_tp_t1' ? '1px solid var(--cyan-primary)' : '1px solid var(--border-subtle)',
                        background: strategy === 'single_tp_t1' ? 'rgba(6, 182, 212, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                        boxShadow: strategy === 'single_tp_t1' ? '0 0 15px rgba(6, 182, 212, 0.2)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input
                        type="radio"
                        name="strategy"
                        value="single_tp_t1"
                        checked={strategy === 'single_tp_t1'}
                        onChange={() => setStrategy('single_tp_t1')}
                        style={{ marginTop: '3px', accentColor: 'var(--cyan-primary)', cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>
                          Target 1 Forzato (TP a T1)
                        </div>
                        <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.35 }}>
                          Esegue l'ordine con Take Profit su Target 1 (1.5R) per monetizzazione rapida alla resistenza.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Candidates Selection Table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Titoli Candidati per l'Invio ({activeCandidates.length}/{preflightData?.orders_plan?.length || 0})
                  </h3>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    style={{ background: 'transparent', border: 'none', color: 'var(--cyan-primary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {Object.values(selectedSymbols).every(Boolean) ? 'Deseleziona tutti' : 'Seleziona tutti'}
                  </button>
                </div>

                <div style={{ overflowX: 'auto', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255, 255, 255, 0.04)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                        <th style={{ padding: '10px 14px', width: '40px', textAlign: 'center' }}>Sel</th>
                        <th style={{ padding: '10px 14px' }}>Titolo</th>
                        <th style={{ padding: '10px 14px' }}>Prezzo Attuale</th>
                        <th style={{ padding: '10px 14px' }}>Limite S1 (Entry)</th>
                        <th style={{ padding: '10px 14px' }}>Stop Loss (-4.5%)</th>
                        <th style={{ padding: '10px 14px' }}>Target 1 (+8.5%)</th>
                        <th style={{ padding: '10px 14px' }}>Target 2 (+18.2%)</th>
                        <th style={{ padding: '10px 14px' }}>Quote / Tranche</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>Nozionale</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontFamily: 'JetBrains Mono' }}>
                      {(preflightData?.orders_plan || []).map((plan) => {
                        const isChecked = !!selectedSymbols[plan.symbol];
                        return (
                          <tr
                            key={plan.symbol}
                            onClick={() => toggleSymbol(plan.symbol)}
                            style={{
                              cursor: 'pointer',
                              borderBottom: '1px solid var(--border-subtle)',
                              background: isChecked ? 'rgba(6, 182, 212, 0.06)' : 'transparent',
                              opacity: isChecked ? 1 : 0.45,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <td style={{ padding: '10px 14px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => toggleSymbol(plan.symbol)}
                                style={{ background: 'transparent', border: 'none', color: isChecked ? 'var(--cyan-primary)' : 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                {isChecked ? <CheckSquare size={16} /> : <Square size={16} />}
                              </button>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Inter, sans-serif', fontWeight: 800, color: '#ffffff' }}>
                                <span>{plan.symbol}</span>
                                {plan.already_placed && (
                                  <span style={{ fontSize: '10px', background: 'rgba(245, 158, 11, 0.2)', color: 'var(--amber-gold)', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '1px 6px', borderRadius: '4px', fontFamily: 'JetBrains Mono' }}>
                                    Già pendente #{plan.existing_order_id}
                                  </span>
                                )}
                                {plan.already_in_portfolio && (
                                  <span style={{ fontSize: '10px', background: 'rgba(6, 182, 212, 0.2)', color: 'var(--cyan-primary)', border: '1px solid rgba(6, 182, 212, 0.4)', padding: '1px 6px', borderRadius: '4px', fontFamily: 'JetBrains Mono' }}>
                                    Già a mercato ({plan.existing_positions_count} pos.)
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'Inter, sans-serif', marginTop: '2px' }}>
                                {plan.name}
                              </div>
                            </td>
                            <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>
                              ${plan.current_price?.toFixed(2)}
                            </td>
                            <td style={{ padding: '10px 14px', color: 'var(--cyan-primary)', fontWeight: 700 }}>
                              ${plan.entry_zone?.toFixed(2)}
                            </td>
                            <td style={{ padding: '10px 14px', color: 'var(--red-loss)', fontWeight: 700 }}>
                              ${plan.stop_loss?.toFixed(2)}
                            </td>
                            <td style={{ padding: '10px 14px', color: 'var(--green-profit)' }}>
                              ${plan.target_1?.toFixed(2)}
                            </td>
                            <td style={{ padding: '10px 14px', color: 'var(--green-profit)', fontWeight: 700 }}>
                              ${plan.target_2?.toFixed(2)}
                            </td>
                            <td style={{ padding: '10px 14px', fontFamily: 'Inter, sans-serif', fontSize: '11px' }}>
                              {(() => {
                                const isSuperTrend = (plan.trend_profile || plan.trendProfile) === 'SUPER_TREND';
                                let label = '100% TP a T1';
                                let color = 'var(--amber-gold)';
                                if (strategy === 'single_runner') {
                                  label = '100% Uncapped Runner';
                                  color = 'var(--cyan-primary)';
                                } else if (strategy === 'single_tp_t1') {
                                  label = '100% TP a T1';
                                  color = 'var(--amber-gold)';
                                } else if (marketRegime === 'RISK_OFF') {
                                  label = '100% TP a T2 (Prudenziale)';
                                  color = 'var(--amber-gold)';
                                } else if (isSuperTrend) {
                                  label = '100% Uncapped Runner (No TP)';
                                  color = 'var(--cyan-primary)';
                                } else {
                                  label = '100% TP a T2 (3.0R)';
                                  color = 'var(--green-profit)';
                                }
                                return (
                                  <span>
                                    <strong style={{ color: '#ffffff' }}>{plan.total_shares} az.</strong>{' '}
                                    <span style={{ color, fontWeight: 600 }}>({label})</span>
                                  </span>
                                );
                              })()}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#ffffff' }}>
                              ${plan.total_notional_usd?.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Execution Result Banner if submitted */}
              {executionResult && (() => {
                const effectiveSuccessCount = executionResult.results 
                  ? executionResult.results.filter(r => r.status === 'SUBMITTED' || r.error_code === '200').length 
                  : (executionResult.total_orders_successful || 0);
                const isAllSuccess = effectiveSuccessCount === executionResult.total_orders_attempted && executionResult.total_orders_attempted > 0;
                const isPartial = effectiveSuccessCount > 0 && !isAllSuccess;

                return (
                <div style={{
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-md)',
                  background: effectiveSuccessCount > 0
                    ? (isAllSuccess ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)')
                    : 'rgba(239, 68, 68, 0.12)',
                  border: effectiveSuccessCount > 0
                    ? (isAllSuccess ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(245, 158, 11, 0.35)')
                    : '1px solid rgba(239, 68, 68, 0.35)',
                  color: effectiveSuccessCount > 0 ? 'var(--green-profit)' : 'var(--red-loss)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 800 }}>
                    {isAllSuccess ? (
                      <>
                        <CheckCircle2 size={18} color="var(--green-profit)" />
                        <span style={{ color: '#ffffff' }}>Esecuzione completata con successo!</span>
                      </>
                    ) : isPartial ? (
                      <>
                        <AlertTriangle size={18} color="var(--amber-gold)" />
                        <span style={{ color: 'var(--amber-gold)' }}>
                          Esecuzione parziale ({effectiveSuccessCount} su {executionResult.total_orders_attempted} ordini inseriti)
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={18} color="var(--red-loss)" />
                        <span style={{ color: 'var(--red-loss)' }}>
                          Nessun ordine inserito (Rifiutati da eToro)
                        </span>
                      </>
                    )}
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-main)', margin: 0 }}>
                    {effectiveSuccessCount > 0 ? (
                      <>
                        Inseriti con successo <strong style={{ color: 'var(--green-profit)' }}>{effectiveSuccessCount}</strong> ordini MIT su eToro Demo per un totale nozionale di <strong style={{ fontFamily: 'JetBrains Mono', color: 'var(--cyan-primary)' }}>${executionResult.total_notional_deployed > 0 ? executionResult.total_notional_deployed?.toFixed(2) : totalSelectedNotional?.toFixed(2)}</strong>.
                      </>
                    ) : (
                      <>
                        Tutti i <strong style={{ color: 'var(--red-loss)' }}>{executionResult.total_orders_attempted}</strong> ordini sono stati respinti dal broker. Consulta il dettaglio degli errori sottostante:
                      </>
                    )}
                  </p>
                  <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(0, 0, 0, 0.35)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontFamily: 'JetBrains Mono', fontSize: '11px' }}>
                    {executionResult.results?.map((r, i) => {
                      const isOk = r.status === 'SUBMITTED' || r.error_code === '200';
                      return (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                          <span style={{ color: 'var(--text-main)' }}>
                            {r.symbol} ({r.tranche}): {r.units} quote @ ${r.limit_price} (SL: ${r.stop_loss}, TP: ${r.take_profit})
                          </span>
                          <span style={{ fontWeight: 700, color: isOk ? 'var(--green-profit)' : 'var(--red-loss)' }}>
                            {isOk ? `✓ Inserito ${r.order_id ? `#${r.order_id}` : (r.reference_id ? `(${r.reference_id.substring(0, 8)})` : '')}` : `❌ ${r.error_message}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                );
              })()}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', marginTop: '8px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {activeCandidates.length > 0 && (
              <span>
                Totale ordini da inviare:{' '}
                <strong style={{ color: '#ffffff' }}>
                  {activeCandidates.length} ordini MIT (1 per candidato)
                </strong>
                {strategy === 'adaptive' && (
                  <span style={{ marginLeft: '8px', color: 'var(--cyan-primary)', fontSize: '11px' }}>
                    (Adattiva • {marketRegime})
                  </span>
                )}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease' }}
            >
              {executionResult ? 'Chiudi' : 'Annulla'}
            </button>

            {!executionResult && (
              <button
                type="button"
                onClick={handleExecuteOrders}
                disabled={isExecuting || loadingPreflight || activeCandidates.length === 0 || !isCashSufficient}
                style={{
                  padding: '10px 22px',
                  borderRadius: 'var(--radius-md)',
                  background: (isExecuting || loadingPreflight || activeCandidates.length === 0 || !isCashSufficient)
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
                  border: 'none',
                  color: (isExecuting || loadingPreflight || activeCandidates.length === 0 || !isCashSufficient) ? 'var(--text-dim)' : '#000000',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: (isExecuting || loadingPreflight || activeCandidates.length === 0 || !isCashSufficient) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: (isExecuting || loadingPreflight || activeCandidates.length === 0 || !isCashSufficient) ? 'none' : '0 4px 20px rgba(6, 182, 212, 0.4)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {isExecuting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Invio Ordini a eToro...</span>
                  </>
                ) : !isCashSufficient ? (
                  <span>Saldo Insufficiente per l'invio</span>
                ) : activeCandidates.length === 0 ? (
                  <span>Seleziona almeno 1 Titolo</span>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Invia {activeCandidates.length} Titoli a eToro (Demo)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
