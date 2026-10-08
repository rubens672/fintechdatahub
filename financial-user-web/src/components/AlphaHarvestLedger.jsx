import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  BookOpen,
  Info,
  Filter,
  Search,
  Sparkles,
  Layers,
  Activity
} from 'lucide-react';
import { api } from '../services/api';

export function AlphaHarvestLedger({ isCockpit = false }) {
  const [kpis, setKpis] = useState({
    total_harvested_capital_usd: 0,
    protected_locked_profit_usd: 0,
    extra_alpha_usd: 0,
    total_reviews: 0,
  });
  const [reviews, setReviews] = useState([]);
  const [activeSignals, setActiveSignals] = useState({});
  const [proposals, setProposals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [toastMsg, setToastMsg] = useState(null);
  const [selectedVerdictFilter, setSelectedVerdictFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [respondingProposalId, setRespondingProposalId] = useState(null);
  const [isClearingProposals, setIsClearingProposals] = useState(false);

  // Load all harvest intelligence data
  const loadHarvestData = async () => {
    setIsLoading(true);
    try {
      const [kpiRes, reviewsRes, signalsRes, proposalsRes] = await Promise.all([
        api.getHarvestKPIs(),
        api.getHarvestReviews(50),
        api.getHarvestActiveSignals(),
        api.getHarvestProposals(),
      ]);

      if (kpiRes) setKpis(kpiRes);
      if (reviewsRes?.reviews) setReviews(reviewsRes.reviews);
      if (signalsRes?.active_signals) setActiveSignals(signalsRes.active_signals);
      if (proposalsRes?.proposals) setProposals(proposalsRes.proposals);
    } catch (err) {
      console.warn('Errore durante il caricamento dei dati Alpha Harvest:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHarvestData();
    const interval = setInterval(loadHarvestData, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg, type = 'success') => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 6000);
  };

  // Trigger manual harvest scan (Cockpit only)
  const handleTriggerScan = async () => {
    if (!isCockpit || isScanning) return;
    setIsScanning(true);
    try {
      const res = await api.triggerHarvestScan('demo');
      const count = res.actions_taken ?? (res.actions_executed?.length ?? 0);
      const scanned = res.mature_positions_reviewed ?? (res.scanned_positions ?? 0);
      const total = res.total_positions_scanned ?? scanned;
      if (total === 0) {
        showToast('Scansione completata: nessuna posizione attiva trovata nel portafoglio eToro.', 'info');
      } else if (scanned === 0) {
        showToast(`Scansione completata: ${total} posizioni attive rilevate, ma nessuna ancora matura per il Week 2 Decision Gate (holding < 8 gg e profitto < +10%). Nessun intervento necessario.`, 'info');
      } else {
        showToast(`Scansione Alpha Harvest completata: ${scanned} posizioni mature analizzate su ${total}, ${count} interventi eseguiti.`, 'success');
      }
      await loadHarvestData();
    } catch (err) {
      showToast(err.message || 'Errore durante la scansione Alpha Harvest', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  // Trader response to Reinvestment Proposal (Human-in-the-Loop)
  const handleProposalDecision = async (proposalId, decision) => {
    if (!isCockpit || respondingProposalId) return;
    setRespondingProposalId(proposalId);
    try {
      const res = await api.respondToHarvestProposal(proposalId, decision);
      if (decision === 'APPROVE') {
        showToast(`Proposta approvata! Ordine MIT generato per ${res.recommended_symbol || 'il candidato'}.`, 'success');
      } else {
        showToast('Proposta rifiutata. Liquidità preservata per il portafoglio.', 'info');
      }
      await loadHarvestData();
    } catch (err) {
      showToast(err.message || 'Errore nella trasmissione della decisione', 'error');
    } finally {
      setRespondingProposalId(null);
    }
  };

  // Trader clears/archives all prior proposals (clean slate)
  const handleClearProposals = async () => {
    if (!isCockpit || isClearingProposals) return;
    setIsClearingProposals(true);
    try {
      await api.clearHarvestProposals();
      showToast('Tutte le proposte di reinvestimento precedenti sono state archiviate.', 'info');
      await loadHarvestData();
    } catch (err) {
      showToast(err.message || 'Errore durante la pulizia delle proposte', 'error');
    } finally {
      setIsClearingProposals(false);
    }
  };

  // Filtered Reviews for the Clinical Audit Trail
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const sym = (r.symbol || '').toUpperCase();
      const action = (r.action || '').toUpperCase();
      const matchesSearch = !searchTerm || sym.includes(searchTerm.toUpperCase());
      const matchesFilter = selectedVerdictFilter === 'ALL' || action.includes(selectedVerdictFilter);
      return matchesSearch && matchesFilter;
    });
  }, [reviews, searchTerm, selectedVerdictFilter]);

  // Pending proposals awaiting trader 1-click decision (deduplicated by source, picking newest and highest score)
  const pendingProposals = useMemo(() => {
    const rawPending = proposals.filter((p) => p.status === 'PENDING_USER_APPROVAL');
    // Group by source_symbol to guarantee zero duplicate clutter
    const dedupMap = new Map();
    // Sort descending by created_at first so newest takes precedence
    const sorted = [...rawPending].sort((a, b) => {
      const tA = new Date(a.created_at || 0).getTime();
      const tB = new Date(b.created_at || 0).getTime();
      return tB - tA;
    });

    for (const p of sorted) {
      const src = (p.source_symbol || p.proposal_id || '').toUpperCase();
      if (!dedupMap.has(src)) {
        dedupMap.set(src, p);
      }
    }

    // Sort remaining proposals by highest quant_score / convenience first
    return Array.from(dedupMap.values()).sort((a, b) => {
      return (Number(b.quant_score) || 0) - (Number(a.quant_score) || 0);
    });
  }, [proposals]);

  // Format timestamp in Italian CET format
  const formatIsoDate = (isoStr) => {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('it-IT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  // Render verdict badge with specific styling
  const renderVerdictBadge = (action) => {
    const act = (action || '').toUpperCase();
    if (act.includes('EXTEND_TO_RUNNER')) {
      return (
        <span className="harvest-badge badge-runner" title="Titolo SUPER_TREND: Target rimosso, posizione in corsa libera con Stop Loss dinamico">
          🚀 EXTEND TO RUNNER
        </span>
      );
    }
    if (act.includes('HOLD_SWING')) {
      return (
        <span className="harvest-badge badge-hold" title="Titolo NO_SUPER_TREND: Swing trade standard in marcia verso Target 2 (3.0R)">
          🎯 HOLD SWING (T2)
        </span>
      );
    }
    if (act.includes('TIGHTEN_SL') || act.includes('TIGHTEN')) {
      return (
        <span className="harvest-badge badge-tighten" title="Stop Loss alzato con Chandelier ATR 1.0x o 1.8x">
          🛡️ TIGHTENED SL
        </span>
      );
    }
    if (act.includes('HOLD_RUNNER') || act.includes('HOLD')) {
      return (
        <span className="harvest-badge badge-hold" title="Trend solido confermato, posizione mantenuta">
          ⏱️ HOLD RUNNER
        </span>
      );
    }
    if (act.includes('SOFT_HARVEST')) {
      return (
        <span className="harvest-badge badge-soft" title="Presa parziale 50% profitto su rally esteso">
          🌾 SOFT HARVEST (50%)
        </span>
      );
    }
    if (act.includes('EARNINGS')) {
      return (
        <span className="harvest-badge badge-earnings" title="Scudo anti-earnings: de-risking entro 72h">
          ⚠️ EARNINGS DE-RISK
        </span>
      );
    }
    if (act.includes('TIME_DECAY')) {
      return (
        <span className="harvest-badge badge-decay" title="Time-Decay Exit: monetizzazione posizione laterale prolungata (>14gg) per liberare capitale">
          ⌛ TIME-DECAY EXIT
        </span>
      );
    }
    if (act.includes('STAGNATION')) {
      return (
        <span className="harvest-badge badge-stagnation" title="Stagnation Harvest: monetizzazione profitto a 20 giorni su swing trade senza breakout T2">
          📦 STAGNATION HARVEST
        </span>
      );
    }
    if (act.includes('STOP_LOSS')) {
      return (
        <span className="harvest-badge badge-stop" title="Uscita difensiva per cedimento del supporto">
          🛑 STOP EXIT
        </span>
      );
    }
    return <span className="harvest-badge badge-neutral">{action || 'VALUTATO'}</span>;
  };

  return (
    <div className="alpha-harvest-ledger-container animate-fade-in" style={{ padding: '0 4px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Toast Notification Banner */}
      {toastMsg && (
        <div
          className={`glass-panel toast-notification ${toastMsg.type === 'error' ? 'toast-error' : toastMsg.type === 'info' ? 'toast-info' : 'toast-success'}`}
          style={{
            padding: '12px 20px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: toastMsg.type === 'error' ? '1px solid #ef4444' : toastMsg.type === 'info' ? '1px solid #38bdf8' : '1px solid #10b981',
            background: toastMsg.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : toastMsg.type === 'info' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {toastMsg.type === 'error' ? <AlertTriangle size={18} color="#ef4444" /> : <CheckCircle2 size={18} color="#10b981" />}
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>{toastMsg.msg}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Panel */}
      <div className="glass-panel" style={{ padding: '20px 24px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(56, 189, 248, 0.3))',
                  padding: '8px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Sparkles size={20} color="#c084fc" />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
                ALPHA HARVEST & REINVESTMENT LEDGER
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  background: 'rgba(168, 85, 247, 0.2)',
                  border: '1px solid rgba(168, 85, 247, 0.5)',
                  color: '#c084fc',
                  padding: '3px 8px',
                  borderRadius: '20px'
                }}
              >
                6 PILASTRI ISTITUZIONALI
              </span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '900px', lineHeight: 1.5 }}>
              Gestione clinica autonoma delle posizioni mature al <strong>Week 2 Decision Gate (16:30 IT / 10:30 NY)</strong>.
              Massimizzazione del profitto su trend estesi con <strong>Chandelier ATR Ratchet</strong>, rimozione Target per i veri runner
              (regola singola azione indivisibile) e riciclo del capitale liberato in <strong>1-Click Human-in-the-Loop</strong>.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="glass-button"
              onClick={loadHarvestData}
              disabled={isLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', fontSize: '13px' }}
              title="Ricarica i dati storici e le metriche di Alpha Harvest"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span>{isLoading ? 'Caricamento...' : 'Aggiorna'}</span>
            </button>

            {isCockpit && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <button
                  type="button"
                  className="btn-accent-glow"
                  onClick={handleTriggerScan}
                  disabled={isScanning}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #9333ea, #6366f1)',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: isScanning ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(147, 51, 234, 0.4)',
                    transition: 'all 0.2s ease',
                  }}
                  title="Esegui immediatamente l'algoritmo Alpha Harvest a 6 pilastri sulle posizioni mature"
                >
                  <Zap size={16} className={isScanning ? 'animate-pulse' : ''} />
                  <span>{isScanning ? 'Scansione in Corso...' : '🌾 Avvia Scansione Alpha Harvest'}</span>
                </button>
                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={10} color="#34d399" /> Auto: Lun-Ven 16:30 IT | Manuale: On-Demand
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Informational Banner: Cloud Scheduler & Manual Scan Operational Guide */}
      <div
        className="glass-panel"
        style={{
          marginBottom: '20px',
          padding: '16px 20px',
          borderRadius: '12px',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          background: 'linear-gradient(135deg, rgba(24, 24, 32, 0.9) 0%, rgba(30, 27, 45, 0.85) 100%)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.28)'
        }}
      >
        {/* Top bar with quick summary & expand/collapse toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(99, 102, 241, 0.3))',
                border: '1px solid rgba(168, 85, 247, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#c084fc'
              }}
            >
              <BookOpen size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>
                  Guida Operativa: Motore di Scansione &amp; Job Schedulato Cloud
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#34d399',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Clock size={11} /> Cloud Scheduler: Lun-Ven 16:30 IT (10:30 NY)
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    background: 'rgba(168, 85, 247, 0.15)',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                    color: '#c084fc',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Zap size={11} /> Trigger Manuale On-Demand
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                Cosa accade quando premi <strong>"Avvia Scansione"</strong> e come opera la schedulazione autonoma feriale.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: showGuide ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.06)',
              border: '1px solid ' + (showGuide ? 'rgba(168, 85, 247, 0.5)' : 'rgba(255, 255, 255, 0.1)'),
              color: showGuide ? '#c084fc' : '#e2e8f0',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <span>{showGuide ? 'Comprimi Guida' : 'Espandi Dettagli Operativi'}</span>
            {showGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Collapsible Details Body */}
        {showGuide && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>

            {/* 2-Column: Scheduled Job vs Manual Trigger */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px', marginBottom: '16px' }}>

              {/* Scheduled Cron Job Card */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.05)',
                  border: '1px solid rgba(16, 185, 129, 0.2)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Calendar size={16} color="#34d399" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#34d399' }}>
                    1. Job Schedulato Automatico (Google Cloud Scheduler)
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.55 }}>
                  <ul style={{ paddingLeft: '18px', margin: 0 }}>
                    <li><strong>Cadenza Feriale:</strong> Attivo ogni giorno lavorativo (<strong>Lunedì - Venerdì</strong>) alle <strong>16:30 Italiane (10:30 New York)</strong> via Cloud Scheduler.</li>
                    <li><strong>Timing Strategico:</strong> Interviene 60 minuti dopo l'apertura di Wall Street e 30 minuti dopo la chiusura dell'<strong>Opening Shield</strong> (16:00 IT): gli spread si sono ristretti e la price action istituzionale è stabilizzata.</li>
                    <li><strong>Autonomia Totale:</strong> Il job gira serverless su Cloud Run, interroga il portafoglio eToro Demo, applica i 6 pilastri clinici, aggiorna gli Stop Loss dinamici sul broker e registra l'audit su Firestore <em>senza richiedere la presenza dell'operatore</em>.</li>
                  </ul>
                </div>
              </div>

              {/* Manual Button Card */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  background: 'rgba(168, 85, 247, 0.05)',
                  border: '1px solid rgba(168, 85, 247, 0.2)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Zap size={16} color="#c084fc" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#c084fc' }}>
                    2. Pulsante Manuale "Avvia Scansione" (On-Demand)
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.55 }}>
                  <ul style={{ paddingLeft: '18px', margin: 0 }}>
                    <li><strong>Scopo:</strong> Consente al Portfolio Manager di forzare immediatamente la revisione clinica in qualsiasi istante (es. a metà sessione, prima di un dato macro o per aggiornare gli stop dopo un rally).</li>
                    <li><strong>Esecuzione:</strong> Lancia lo stesso identico algoritmo del cron job in tempo reale, restituendo un feedback a video con il conteggio delle posizioni analizzate e degli interventi eseguiti.</li>
                    <li><strong>Nessun Rischio di Conflitto:</strong> Grazie ai filtri anti-chattering e alla regola di non-regressione dello stop loss, una scansione manuale non arreca danni né abbassa mai la protezione.</li>
                  </ul>
                </div>
              </div>

            </div>

            {/* The 5 Operational Phases */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '10px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Activity size={16} color="#38bdf8" />
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#38bdf8' }}>
                  Cosa succede quando parte la Scansione (Le 5 Fasi Operative)
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>

                {/* Fase 1 */}
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid #6366f1' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#818cf8', marginBottom: '4px' }}>
                    Fase 1: Week 2 Decision Gate
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>
                    Vengono filtrate solo le posizioni con età <strong>&ge; 8 giorni</strong> oppure con profitto latente <strong>&ge; +10%</strong>. Le posizioni giovani (&lt; 8gg) non vengono toccate per evitare uscite premature da rumore di mercato.
                  </div>
                </div>

                {/* Fase 2 */}
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid #38bdf8' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', marginBottom: '4px' }}>
                    Fase 2: Diagnosi sui 6 Pilastri
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>
                    Interroga in parallelo il <code>financial-mcp-server</code> su: <strong>RSI &amp; Pivot R3</strong>, <strong>Volatilità ATR</strong> (&gt;1.8x), <strong>Earnings Risk</strong> (&le;3gg), <strong>SEC Form 4 / EDGAR</strong>, <strong>Trailing Stop Ratchet</strong> e <strong>Opportunity Cost</strong>.
                  </div>
                </div>

                {/* Fase 3 */}
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#34d399', marginBottom: '4px' }}>
                    Fase 3: Azioni Esecutive su eToro
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>
                    Emette ordini reali sul broker: <strong>EXTEND_TO_RUNNER</strong> (rimozione Take Profit), <strong>TIGHTEN_STOP</strong> (alza Stop Loss irreversibile a scalini), <strong>EARNINGS_DE_RISK</strong> (de-risking 50%), o <strong>SOFT_HARVEST</strong> (take profit parziale 50% solo se &ge; 2 quote).
                  </div>
                </div>

                {/* Fase 4 */}
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid #f59e0b' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24', marginBottom: '4px' }}>
                    Fase 4: Riciclo Capitale 1-Click
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>
                    Se una chiusura libera liquidità e lo Step 1 del DAG ha nuovi candidati con alpha superiore, genera una <strong>Proposta di Reinvestimento Human-in-the-Loop</strong> approvabile con 1 click.
                  </div>
                </div>

                {/* Fase 5 */}
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid #ec4899' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#f472b6', marginBottom: '4px' }}>
                    Fase 5: Audit Permanente Firestore
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>
                    Ogni punteggio clinico, motivazione LLM (Gemini Flash), vecchio e nuovo Stop Loss vengono archiviati su <code>alpha_harvest_reviews</code> e visualizzati nel registro storico sottostante.
                  </div>
                </div>

              </div>

              {/* Guardrails Box */}
              <div
                style={{
                  marginTop: '12px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '11px',
                  color: '#fde68a'
                }}
              >
                <ShieldCheck size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Guardrails Matematici Rigorosi:</strong> Lo Stop Loss è <em>non-regressivo</em> (sale solo e non scende mai). Le posizioni con <em>1 sola quota indivisibile</em> non subiscono mai split forzati, ma vengono preservate al 100% alzando la protezione dello stop loss.
                </span>
              </div>

            </div>

          </div>
        )}
      </div>

      {/* 3 Top Institutional KPI Cards */}
      <div className="quant-kpis-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>

        {/* KPI 1: Capitale Totale Raccolto */}
        <div className="quant-kpi-card glass-panel">
          <div className="quant-kpi-header">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span className="quant-kpi-title">Capitale Totale Raccolto</span>
              <span style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 700 }}>
                ⚡ Liquidità Liberata da Exits
              </span>
            </div>
            <div className="quant-kpi-icon payoff" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div className="quant-kpi-value-row">
            <span className="quant-kpi-value text-accent" style={{ color: '#38bdf8' }}>
              ${Number(kpis.total_harvested_capital_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="quant-kpi-badge positive" style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' }}>
              Pronto al Riciclo
            </span>
          </div>
          <div className="quant-kpi-subtext">
            Liquidità generata da prese di profitto parziali e chiusure difensive
          </div>
        </div>

        {/* KPI 2: Profitto Netto Blindato */}
        <div className="quant-kpi-card glass-panel">
          <div className="quant-kpi-header">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span className="quant-kpi-title">Profitto Netto Blindato</span>
              <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 700 }}>
                🛡️ Stop Loss Chandelier Ratchet
              </span>
            </div>
            <div className="quant-kpi-icon win-rate" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <ShieldCheck size={20} />
            </div>
          </div>
          <div className="quant-kpi-value-row">
            <span className="quant-kpi-value text-success">
              ${Number(kpis.protected_locked_profit_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="quant-kpi-badge positive">
              Lock-In Irreversibile
            </span>
          </div>
          <div className="quant-kpi-subtext">
            Guadagno minimo garantito al 100% su tutte le posizioni mature in corso
          </div>
        </div>

        {/* KPI 3: Extra Alpha Generato */}
        <div className="quant-kpi-card glass-panel">
          <div className="quant-kpi-header">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span className="quant-kpi-title">Extra Alpha Generato</span>
              <span style={{ fontSize: '10px', color: '#c084fc', fontWeight: 700 }}>
                🚀 Alpha Runner Oltre Target 2
              </span>
            </div>
            <div className="quant-kpi-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
              <Award size={20} />
            </div>
          </div>
          <div className="quant-kpi-value-row">
            <span className="quant-kpi-value" style={{ color: '#c084fc' }}>
              +${Number(kpis.extra_alpha_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="quant-kpi-badge positive" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }}>
              Uncapped Runners
            </span>
          </div>
          <div className="quant-kpi-subtext">
            Rendimento incrementale ottenuto lasciando correre le quote oltre T2
          </div>
        </div>
      </div>

      {/* Reinvestment Proposals Section (Human-in-the-Loop) */}
      {pendingProposals.length > 0 && (
        <div
          className="glass-panel"
          style={{
            padding: '22px 24px',
            borderRadius: '12px',
            border: '1px solid rgba(245, 158, 11, 0.5)',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(15, 23, 42, 0.6))',
            boxShadow: '0 8px 32px rgba(245, 158, 11, 0.15)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="pulse-dot pulse-amber" style={{ width: '10px', height: '10px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#f59e0b', margin: 0, letterSpacing: '0.02em' }}>
                PROPOSTE DI REINVESTIMENTO ATTIVE • ZERO SURPRISE BUYING (Richiede Approvazione 1-Click)
              </h3>
            </div>
            {isCockpit && (
              <button
                type="button"
                onClick={handleClearProposals}
                disabled={isClearingProposals}
                className="glass-button"
                style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  color: '#f87171',
                  borderColor: 'rgba(248, 113, 113, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title="Archivia tutte le proposte pendenti e ripulisci il ledger"
              >
                <XCircle size={13} />
                <span>{isClearingProposals ? 'Archiviazione...' : 'Archivia Tutte le Proposte'}</span>
              </button>
            )}
          </div>
          <div style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '18px', lineHeight: 1.5 }}>
            Il capitale liberato da prese di profitto viene allocato esclusivamente su proposta esplicita.
            Ad ogni scansione viene selezionato e mostrato <strong>il candidato quantitativamente più conveniente</strong> calcolato dal DAG sui dati di mercato correnti:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {pendingProposals.map((prop) => (
              <div
                key={prop.proposal_id}
                className="glass-panel"
                style={{
                  padding: '18px 20px',
                  borderRadius: '10px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: '#38bdf8' }}>
                        {prop.recommended_symbol}
                      </span>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        ({prop.candidate_name || prop.recommended_symbol})
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          background: 'rgba(16, 185, 129, 0.2)',
                          color: '#34d399',
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}
                      >
                        🌟 Miglior Scelta DAG • Score {prop.quant_score || 92}/100
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        • Scansione: {formatIsoDate(prop.created_at)}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                      Fonte Liquidità: <strong>{prop.source_symbol}</strong> (Capitale liberato: <strong>${Number(prop.freed_capital_usd).toFixed(2)}</strong> • Profitto: <strong>+${Number(prop.realized_profit_usd).toFixed(2)}</strong>)
                    </div>
                  </div>

                  {/* Operational Levels */}
                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px', fontFamily: 'JetBrains Mono' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--text-dim)', marginRight: '4px' }}>Entry S1:</span>
                      <strong style={{ color: '#38bdf8' }}>${Number(prop.entry_zone_s1 || 0).toFixed(2)}</strong>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--text-dim)', marginRight: '4px' }}>Stop Loss:</span>
                      <strong style={{ color: '#f87171' }}>${Number(prop.stop_loss_atr || 0).toFixed(2)}</strong>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--text-dim)', marginRight: '4px' }}>Target 1:</span>
                      <strong style={{ color: '#34d399' }}>${Number(prop.target_1 || 0).toFixed(2)}</strong>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--text-dim)', marginRight: '4px' }}>Target 2:</span>
                      <strong style={{ color: '#a78bfa' }}>${Number(prop.target_2 || 0).toFixed(2)}</strong>
                    </div>
                  </div>
                </div>

                {/* Sizing & Rationale */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '12px', color: '#cbd5e1', maxWidth: '650px' }}>
                    <span style={{ color: 'var(--text-dim)', marginRight: '6px' }}>Dimensionamento Risk Parity:</span>
                    <strong style={{ color: '#ffffff' }}>{prop.suggested_shares} quote</strong> (~${Number(prop.estimated_notional_usd || 0).toFixed(2)} con Rischio max 1%)
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                      {prop.rationale}
                    </div>
                  </div>

                  {/* 1-Click Action Buttons (Cockpit Mode Only) */}
                  {isCockpit ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleProposalDecision(prop.proposal_id, 'REJECT')}
                        disabled={respondingProposalId === prop.proposal_id}
                        className="glass-button"
                        style={{
                          padding: '7px 14px',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#f87171'
                        }}
                      >
                        <XCircle size={14} />
                        <span>Rifiuta & Mantieni Liquidità</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleProposalDecision(prop.proposal_id, 'APPROVE')}
                        disabled={respondingProposalId === prop.proposal_id}
                        className="btn-accent-glow"
                        style={{
                          padding: '7px 16px',
                          borderRadius: '6px',
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          border: 'none',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: respondingProposalId === prop.proposal_id ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <CheckCircle2 size={14} />
                        <span>⚡ Approva & Invia Ordine MIT</span>
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                      (Approvazione disponibile in Financial Cockpit)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clinical Audit Trail Table */}
      <div className="glass-panel" style={{ padding: '22px 24px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
              Audit Trail Clinico delle Decisioni di Uscita
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Registro cronologico delle diagnosi multi-timeframe e degli interventi sui livelli di Stop & Target
            </div>
          </div>

          {/* Filters & Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div className="search-input-wrapper" style={{ minWidth: '180px' }}>
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Cerca ticker..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input"
                style={{ fontSize: '12px', padding: '6px 10px 6px 30px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', padding: '3px', borderRadius: '8px' }}>
              {['ALL', 'RUNNER', 'TIGHTEN', 'SOFT_HARVEST', 'EARNINGS'].map((filt) => (
                <button
                  key={filt}
                  type="button"
                  onClick={() => setSelectedVerdictFilter(filt)}
                  className={`subtab-btn ${selectedVerdictFilter === filt ? 'active' : ''}`}
                  style={{ fontSize: '11px', padding: '4px 10px' }}
                >
                  {filt === 'ALL' ? 'Tutti' : filt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive" style={{ overflowX: 'auto' }}>
          <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-dim)', fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 10px' }}>Data / Ora (IT)</th>
                <th style={{ padding: '12px 10px' }}>Ticker & Pos ID</th>
                <th style={{ padding: '12px 10px' }}>Holding</th>
                <th style={{ padding: '12px 10px' }}>Verdetto Clinico</th>
                <th style={{ padding: '12px 10px' }}>Stop Loss (Pre → Post)</th>
                <th style={{ padding: '12px 10px' }}>Take Profit</th>
                <th style={{ padding: '12px 10px' }}>Diagnosi 6 Pilastri & Note</th>
                <th style={{ padding: '12px 10px', textAlign: 'right' }}>Extra Alpha</th>
              </tr>
            </thead>
            <tbody>
              {filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                    {isLoading ? 'Caricamento recensioni cliniche in corso...' : 'Nessuna recensione clinica registrata corrispondente ai filtri.'}
                  </td>
                </tr>
              ) : (
                filteredReviews.map((r, idx) => {
                  const postSlVal = r.new_sl ?? r.proposed_sl;
                  const prevSlVal = r.previous_sl;
                  const prevSl = (prevSlVal !== undefined && prevSlVal !== null && prevSlVal > 0) ? `$${Number(prevSlVal).toFixed(2)}` : '-';
                  const newSl = (postSlVal !== undefined && postSlVal !== null && postSlVal > 0) ? `$${Number(postSlVal).toFixed(2)}` : prevSl;
                  const slDelta = (postSlVal && prevSlVal && postSlVal > prevSlVal)
                    ? `+${(((postSlVal - prevSlVal) / prevSlVal) * 100).toFixed(1)}%`
                    : null;
                  const postTpVal = r.new_tp ?? r.proposed_tp;
                  const currentVerdict = r.action || r.verdict;

                  return (
                    <tr
                      key={r.review_id || idx}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        fontSize: '12px',
                        transition: 'background 0.15s ease'
                      }}
                      className="table-row-hover"
                    >
                      {/* Timestamp */}
                      <td style={{ padding: '12px 10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {formatIsoDate(r.timestamp)}
                      </td>

                      {/* Ticker & ID */}
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong style={{ color: '#ffffff', fontSize: '13px' }}>{r.symbol}</strong>
                          <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono' }}>
                            #{r.position_id}
                          </span>
                        </div>
                      </td>

                      {/* Holding Days */}
                      <td style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: r.holding_days >= 8 ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.05)',
                            color: r.holding_days >= 8 ? '#38bdf8' : 'var(--text-muted)',
                            fontWeight: 600,
                            fontFamily: 'JetBrains Mono'
                          }}
                        >
                          {r.holding_days || 0} gg
                        </span>
                      </td>

                      {/* Verdict Badge */}
                      <td style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>
                        {renderVerdictBadge(currentVerdict)}
                      </td>

                      {/* Stop Loss (Old -> New) */}
                      <td style={{ padding: '12px 10px', fontFamily: 'JetBrains Mono', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: 'var(--text-dim)' }}>{prevSl}</span>
                          <ArrowRight size={12} color="#94a3b8" />
                          <strong style={{ color: '#34d399' }}>{newSl}</strong>
                          {slDelta && (
                            <span style={{ fontSize: '10px', color: '#10b981', marginLeft: '2px' }}>
                              ({slDelta})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Take Profit */}
                      <td style={{ padding: '12px 10px', fontFamily: 'JetBrains Mono', whiteSpace: 'nowrap' }}>
                        {r.trend_profile === 'SUPER_TREND' || (currentVerdict && currentVerdict.includes('RUNNER')) || (postTpVal === null && !postTpVal) ? (
                          <span style={{ color: '#c084fc', fontWeight: 700 }} title="Titolo SUPER_TREND: Corsa libera senza Take Profit (Alpha Runner)">
                            🚀 ∞ Uncapped
                          </span>
                        ) : postTpVal ? (
                          <span style={{ color: '#38bdf8', fontWeight: 700 }} title="Titolo NO_SUPER_TREND: Take Profit ancorato su Target 2 (3.0R)">
                            🎯 ${Number(postTpVal).toFixed(2)} (T2)
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>-</span>
                        )}
                      </td>

                      {/* Clinical Notes & Diagnostic Reasoning */}
                      <td style={{ padding: '12px 10px', maxWidth: '350px' }}>
                        <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: 1.4 }}>
                          {r.clinical_notes || r.rationale || 'Nessuna anomalia strutturale rilevata.'}
                        </div>
                      </td>

                      {/* Extra Alpha */}
                      <td style={{ padding: '12px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono', whiteSpace: 'nowrap' }}>
                        {r.trend_profile === 'NO_SUPER_TREND' ? (
                          <span style={{ color: 'var(--text-dim)', fontSize: '11px' }} title="Target fisso T2: l'Extra Alpha misura solo il rendimento aggiuntivo dei titoli Super Trend senza tetto">
                            T2 Fixed
                          </span>
                        ) : r.extra_alpha_usd && r.extra_alpha_usd > 0 ? (
                          <strong style={{ color: '#10b981' }} title="Profitto netto incrementale generato oltre il target teorico">
                            +${Number(r.extra_alpha_usd).toFixed(2)}
                          </strong>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
