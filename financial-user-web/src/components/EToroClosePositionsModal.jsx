import React, { useState, useEffect } from 'react';
import { 
  X, AlertCircle, CheckCircle2, Loader2, 
  ShieldAlert, CheckSquare, Square, DollarSign, 
  Layers, TrendingDown, ArrowRight
} from 'lucide-react';
import { api } from '../services/api';

/**
 * EToroClosePositionsModal
 * Interactive modal allowing portfolio managers to close active market positions
 * and cancel pending MIT limit orders associated with a specific quant Run.
 * Built with standard Vanilla CSS and the FintechDataHub design system.
 */
export default function EToroClosePositionsModal({
  isOpen,
  onClose,
  runId,
  onPositionsClosed,
  accountMode = 'demo',
}) {
  if (!isOpen) return null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeData, setActiveData] = useState(null);
  const [selectedItemIds, setSelectedItemIds] = useState(new Set());
  const [closing, setClosing] = useState(false);
  const [closeReport, setCloseReport] = useState(null);

  // Load live open items for this run upon opening
  useEffect(() => {
    if (!isOpen || !runId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setCloseReport(null);

    api.getRunActiveBrokerItems(runId, accountMode)
      .then((data) => {
        if (!isMounted) return;
        setActiveData(data);
        // By default select all active items
        const allIds = new Set((data.items || []).map((it) => it.id));
        setSelectedItemIds(allIds);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error loading active broker items:', err);
        setError(err.message || 'Errore nel recupero delle posizioni aperte su eToro');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, runId, accountMode]);

  const items = activeData?.items || [];
  const positions = items.filter((i) => i.item_type === 'POSITION');
  const orders = items.filter((i) => i.item_type === 'ORDER');

  const handleToggleSelect = (id) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedItemIds.size === items.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(items.map((i) => i.id)));
    }
  };

  const handleExecuteClose = async () => {
    if (selectedItemIds.size === 0) return;

    setClosing(true);
    setError(null);

    const posIds = positions.filter((p) => selectedItemIds.has(p.id)).map((p) => p.id);
    const ordIds = orders.filter((o) => selectedItemIds.has(o.id)).map((o) => o.id);

    try {
      const payload = {
        run_id: runId,
        mode: accountMode,
        position_ids: posIds.length > 0 ? posIds : null,
        order_ids: ordIds.length > 0 ? ordIds : null,
      };

      const result = await api.closeRunPositions(payload);
      setCloseReport(result);
      if (onPositionsClosed) {
        onPositionsClosed(result);
      }
    } catch (err) {
      console.error('Error closing positions on eToro:', err);
      setError(err.message || 'Errore durante la chiusura delle posizioni su eToro');
    } finally {
      setClosing(false);
    }
  };

  const selectedPositions = positions.filter((p) => selectedItemIds.has(p.id));
  const selectedPnl = selectedPositions.reduce((acc, p) => acc + (p.pnl || 0), 0);
  const selectedInvested = selectedPositions.reduce((acc, p) => acc + (p.invested || 0), 0);
  const selectedPnlPct = selectedInvested > 0 ? ((selectedPnl / selectedInvested) * 100).toFixed(2) : '0.00';

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '860px', 
          maxHeight: '92vh', 
          overflow: 'hidden', 
          display: 'flex', 
          flexDirection: 'column',
          padding: '24px 28px',
          background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.98) 0%, rgba(10, 15, 29, 0.99) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '16px',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.95), 0 0 35px rgba(239, 68, 68, 0.25)',
          color: '#f8fafc'
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.35)', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
                  CHIUSURA POSIZIONI & ORDINI RUN
                </h2>
                <span style={{ fontSize: '11px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.4)', padding: '2px 8px', borderRadius: '999px', fontWeight: 700, textTransform: 'uppercase' }}>
                  {accountMode.toUpperCase()}
                </span>
              </div>
              <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '13px', marginTop: '4px' }}>
                Run quantitativo: <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--cyan-primary, #06b6d4)', fontWeight: 600 }}>{runId}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={closing}
            style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#94a3b8', padding: '8px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease' }}
            title="Chiudi modale"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{ padding: '14px 16px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#fca5a5', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>{error}</div>
            </div>
          )}

          {loading ? (
            <div style={{ padding: '56px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <Loader2 size={36} color="#ef4444" className="animate-spin" />
              <p style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 500, margin: 0 }}>
                Interrogazione eToro Demo per posizioni e ordini attivi...
              </p>
            </div>
          ) : closeReport ? (
            /* Close Receipt with Full Diagnostics (Success / Partial / Failure) */
            (() => {
              const results = closeReport.results || [];
              const hasErrors = results.some((r) => r.status === 'ERROR');
              const allErrors = results.length > 0 && results.every((r) => r.status === 'ERROR');
              const hasSuccess = (closeReport.total_closed_positions || 0) > 0 || (closeReport.total_cancelled_orders || 0) > 0;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
                  {allErrors ? (
                    <div style={{ padding: '20px', borderRadius: '14px', background: 'rgba(239, 68, 68, 0.14)', border: '1px solid rgba(239, 68, 68, 0.45)', color: '#fca5a5', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: '24px' }}>
                        ✕
                      </div>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fef2f2', margin: 0 }}>
                        Chiusura Non Eseguita su eToro
                      </h3>
                      <p style={{ fontSize: '13px', color: '#fecaca', margin: 0, maxWidth: '520px', lineHeight: '1.5' }}>
                        Il broker eToro ha restituito un errore durante la trasmissione dell'ordine di vendita. Verifica il messaggio diagnostico nella lista in basso.
                      </p>
                    </div>
                  ) : hasErrors ? (
                    <div style={{ padding: '20px', borderRadius: '14px', background: 'rgba(245, 158, 11, 0.14)', border: '1px solid rgba(245, 158, 11, 0.45)', color: '#fde68a', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', fontSize: '24px' }}>
                        ⚠️
                      </div>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fffbeb', margin: 0 }}>
                        Chiusura Parziale con Errori
                      </h3>
                      <p style={{ fontSize: '13px', color: '#fef3c7', margin: 0, maxWidth: '520px', lineHeight: '1.5' }}>
                        Alcuni elementi sono stati elaborati, mentre altri hanno restituito un errore dal broker eToro.
                      </p>
                    </div>
                  ) : (
                    <div style={{ padding: '20px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#a7f3d0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399', fontSize: '24px' }}>
                        ✓
                      </div>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ecfdf5', margin: 0 }}>
                        Operazione di Chiusura Completata
                      </h3>
                      <p style={{ fontSize: '13px', color: '#d1fae5', margin: 0, maxWidth: '520px' }}>
                        Tutte le posizioni e gli ordini selezionati sono stati chiusi con successo a mercato su eToro Demo.
                      </p>
                    </div>
                  )}

                  {/* Summary Stats Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Posizioni Chiuse</span>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: (closeReport.total_closed_positions || 0) > 0 ? '#34d399' : '#f87171', marginTop: '4px', fontFamily: 'JetBrains Mono, monospace' }}>
                        {closeReport.total_closed_positions || 0}
                      </div>
                    </div>
                    <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ordini Cancellati</span>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginTop: '4px', fontFamily: 'JetBrains Mono, monospace' }}>
                        {closeReport.total_cancelled_orders || 0}
                      </div>
                    </div>
                    <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>P&L Realizzato</span>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: (closeReport.total_realized_pnl || 0) >= 0 ? '#34d399' : '#f87171', marginTop: '4px', fontFamily: 'JetBrains Mono, monospace' }}>
                        {(closeReport.total_realized_pnl || 0) >= 0 ? '+' : ''}${(closeReport.total_realized_pnl || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Detailed Breakdown with Error Messages */}
                  <div style={{ border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', overflow: 'hidden', background: 'rgba(0, 0, 0, 0.3)' }}>
                    <div style={{ padding: '10px 16px', background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Esito Broker per Posizione / Ordine
                    </div>
                    <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                      {results.map((res, idx) => (
                        <div key={idx} style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ padding: '2px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '10px', background: res.item_type === 'POSITION' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: res.item_type === 'POSITION' ? '#c084fc' : '#fbbf24' }}>
                                {res.item_type}
                              </span>
                              <strong style={{ color: '#ffffff', fontSize: '13px' }}>{res.symbol}</strong>
                              <span style={{ color: '#64748b', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>#{res.id}</span>
                              <span style={{ color: '#94a3b8', fontSize: '11px' }}>({res.units} quote)</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {res.item_type === 'POSITION' && (
                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: (res.pnl || 0) >= 0 ? '#34d399' : '#f87171' }}>
                                  {(res.pnl || 0) >= 0 ? '+' : ''}${(res.pnl || 0).toFixed(2)}
                                </span>
                              )}
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '999px',
                                fontWeight: 700,
                                fontSize: '10px',
                                background: res.status === 'CLOSED' ? 'rgba(16, 185, 129, 0.2)' : res.status === 'CANCELLED' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                color: res.status === 'CLOSED' ? '#34d399' : res.status === 'CANCELLED' ? '#fbbf24' : '#f87171',
                                border: `1px solid ${res.status === 'CLOSED' ? 'rgba(16, 185, 129, 0.4)' : res.status === 'CANCELLED' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
                              }}>
                                {res.status === 'CLOSED' ? 'CHIUSO' : res.status === 'CANCELLED' ? 'CANCELLATO' : 'FALLITO'}
                              </span>
                            </div>
                          </div>
                          {res.status === 'ERROR' && res.error_message && (
                            <div style={{ fontSize: '11px', color: '#fca5a5', background: 'rgba(239, 68, 68, 0.1)', padding: '5px 8px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.2)', fontFamily: 'JetBrains Mono, monospace', wordBreak: 'break-all' }}>
                              ⚠️ {res.error_message}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()
          ) : items.length === 0 ? (
            /* No active items found */
            <div style={{ padding: '48px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                ℹ️
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                Nessuna posizione o ordine attivo per questo Run
              </h3>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, maxWidth: '460px', lineHeight: '1.5' }}>
                Tutte le posizioni del run risultano già chiuse a target/stop loss, oppure gli ordini pendenti sono già stati eseguiti o cancellati su eToro.
              </p>
            </div>
          ) : (
            /* Active Items List with Selection */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Aggregate KPI Summary Banner */}
              <div style={{ padding: '14px 18px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Elementi Live Rilevati</span>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{positions.length} Posizioni Aperte</span>
                    <span style={{ color: '#475569' }}>•</span>
                    <span>{orders.length} Ordini Pendenti</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Capitale Selezionato</span>
                    <div style={{ fontSize: '15px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, color: '#f1f5f9', marginTop: '2px' }}>
                      ${selectedInvested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>P&L Non Realizzato</span>
                    <div style={{ fontSize: '15px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, color: selectedPnl >= 0 ? '#34d399' : '#f87171', marginTop: '2px' }}>
                      {selectedPnl >= 0 ? '+' : ''}${selectedPnl.toFixed(2)} ({selectedPnl >= 0 ? '+' : ''}{selectedPnlPct}%)
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table Controls */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: 0 }}
                >
                  {selectedItemIds.size === items.length && items.length > 0 ? (
                    <CheckSquare size={16} color="#38bdf8" />
                  ) : (
                    <Square size={16} color="#64748b" />
                  )}
                  <span>
                    {selectedItemIds.size === items.length ? 'Deseleziona Tutti' : 'Seleziona Tutti'} ({selectedItemIds.size}/{items.length})
                  </span>
                </button>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Prezzi live da broker demo
                </span>
              </div>

              {/* Items List */}
              <div style={{ border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', overflow: 'hidden', background: 'rgba(0, 0, 0, 0.25)' }}>
                <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                  {items.map((it) => {
                    const isPos = it.item_type === 'POSITION';
                    const isSelected = selectedItemIds.has(it.id);

                    return (
                      <div
                        key={`${it.item_type}-${it.id}`}
                        onClick={() => handleToggleSelect(it.id)}
                        style={{
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          background: isSelected ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                          opacity: isSelected ? 1 : 0.65,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', color: isSelected ? '#ef4444' : '#64748b' }}>
                            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '14px' }}>{it.symbol}</span>
                              <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, background: isPos ? 'rgba(168, 85, 247, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: isPos ? '#c084fc' : '#fbbf24', border: `1px solid ${isPos ? 'rgba(168, 85, 247, 0.35)' : 'rgba(245, 158, 11, 0.35)'}` }}>
                                {isPos ? 'POSIZIONE APERTA' : 'ORDINE PENDENTE'}
                              </span>
                              <span style={{ color: '#64748b', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}>#{it.id}</span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{it.units} quote</span>
                              <span>•</span>
                              <span>Carico: ${it.open_rate?.toFixed(2)}</span>
                              <span>•</span>
                              <span>Attuale: ${it.current_rate?.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          {isPos ? (
                            <>
                              <div style={{ fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, color: (it.pnl || 0) >= 0 ? '#34d399' : '#f87171' }}>
                                {(it.pnl || 0) >= 0 ? '+' : ''}${(it.pnl || 0).toFixed(2)}
                              </div>
                              <div style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: (it.pnl_percent || 0) >= 0 ? 'rgba(52, 211, 153, 0.8)' : 'rgba(248, 113, 113, 0.8)' }}>
                                {(it.pnl_percent || 0) >= 0 ? '+' : ''}${(it.pnl_percent || 0).toFixed(2)}%
                              </div>
                            </>
                          ) : (
                            <div style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 600 }}>
                              In attesa: ${it.open_rate?.toFixed(2)}
                            </div>
                          )}
                          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                            Inv: ${it.invested?.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Safety Warning Notice */}
              <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fef3c7', fontSize: '12px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ fontSize: '16px', lineHeight: 1 }}>⚠️</span>
                <div style={{ lineHeight: 1.4 }}>
                  <strong style={{ color: '#fbbf24' }}>Attenzione Operativa:</strong> L'invio confermerà la vendita immediata a prezzo di mercato per tutte le posizioni selezionate e la cancellazione irrevocabile degli ordini pendenti sul conto eToro Demo.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={closing}
            style={{ padding: '10px 18px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#cbd5e1', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease' }}
          >
            {closeReport ? 'Chiudi Finestra' : 'Annulla'}
          </button>

          {closeReport && (closeReport.results || []).some((r) => r.status === 'ERROR') && (
            <button
              type="button"
              onClick={() => {
                setCloseReport(null);
                handleExecuteClose();
              }}
              disabled={closing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: closing ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 16px rgba(239, 68, 68, 0.4)',
                transition: 'all 0.2s ease',
              }}
            >
              {closing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Nuovo invio a broker...</span>
                </>
              ) : (
                <>
                  <span>🔄</span>
                  <span>Riprova Chiusura a Mercato</span>
                </>
              )}
            </button>
          )}

          {!closeReport && items.length > 0 && (
            <button
              type="button"
              onClick={handleExecuteClose}
              disabled={closing || selectedItemIds.size === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
                borderRadius: '10px',
                background: selectedItemIds.size === 0 
                  ? 'rgba(239, 68, 68, 0.3)' 
                  : 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: selectedItemIds.size === 0 || closing ? 'not-allowed' : 'pointer',
                boxShadow: selectedItemIds.size > 0 ? '0 4px 16px rgba(239, 68, 68, 0.4)' : 'none',
                opacity: selectedItemIds.size === 0 || closing ? 0.6 : 1,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {closing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Chiusura a mercato in corso...</span>
                </>
              ) : (
                <>
                  <span>🔴</span>
                  <span>Conferma Chiusura a Mercato ({selectedItemIds.size})</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
