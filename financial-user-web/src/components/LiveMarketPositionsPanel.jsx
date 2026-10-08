import React, { useState, useMemo, useEffect } from 'react';
import { 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  Shield, 
  Target, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  Layers, 
  List,
  Eye,
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info, 
  Moon, 
  Sun,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';

/**
 * Client-side helper to compute current US market trading session
 * in case WebSocket hasn't delivered session payload yet.
 */
function getClientMarketSession() {
  const now = new Date();
  const utcDay = now.getUTCDay();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const utcTotalMin = utcHours * 60 + utcMinutes;

  // Saturday = 6, Sunday = 0
  if (utcDay === 6 || utcDay === 0) {
    return { session: 'CLOSED', name: 'MERCATO CHIUSO (WEEKEND)', isTrading: false, isExtended: false };
  }

  // Convert UTC to US Eastern Time (approx UTC-4 during summer DST)
  const estTotalMin = (utcTotalMin - 4 * 60 + 24 * 60) % (24 * 60);

  // Pre-Market: 04:00 - 09:30 ET (240 - 570 min) -> 10:00 - 15:30 CET
  if (estTotalMin >= 4 * 60 && estTotalMin < 9 * 60 + 30) {
    return { session: 'PRE_MARKET', name: 'PRE-MARKET USA (10:00 - 15:30 CET)', isTrading: true, isExtended: true };
  }
  // Regular Trading: 09:30 - 16:00 ET (570 - 960 min) -> 15:30 - 22:00 CET
  if (estTotalMin >= 9 * 60 + 30 && estTotalMin < 16 * 60) {
    return { session: 'REGULAR', name: 'SESSIONE REGOLARE USA (15:30 - 22:00 CET)', isTrading: true, isExtended: false };
  }
  // After-Hours: 16:00 - 20:00 ET (960 - 1200 min) -> 22:00 - 02:00 CET
  if (estTotalMin >= 16 * 60 && estTotalMin < 20 * 60) {
    return { session: 'AFTER_HOURS', name: 'AFTER-HOURS USA (22:00 - 02:00 CET)', isTrading: true, isExtended: true };
  }
  // Overnight / 24-5 Broker Session: 20:00 - 04:00 ET
  return { session: 'OVERNIGHT', name: 'SESSIONE NOTTURNA (BROKER 24/5)', isTrading: true, isExtended: true };
}

/**
 * Formatta timestamp ISO o epoch nel formato standard finanziario italiano:
 * dd/mm/yyyy hh:mm (24 ore, orario locale / borsa)
 */
export function formatDateTime(raw) {
  if (!raw) return 'N/D';
  try {
    let d;
    if (typeof raw === 'number') {
      d = new Date(raw < 1e11 ? raw * 1000 : raw);
    } else if (typeof raw === 'string') {
      const normalized = raw.includes(' ') && !raw.includes('T') ? raw.replace(' ', 'T') : raw;
      d = new Date(normalized);
    } else if (raw instanceof Date) {
      d = raw;
    } else {
      return 'N/D';
    }
    if (isNaN(d.getTime())) return 'N/D';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  } catch {
    return 'N/D';
  }
}

export function LiveMarketPositionsPanel({
  runId,
  executionReceipt,
  etoroPositions = [],
  etoroOrders = [],
  closedTrades = [],
  stocks = [],
  livePrices = {},
  tickFlashes = {},
  marketSession = null,
  onSelectStock,
  isCockpit = false,
  onOpenCloseModal,
  viewMode = 'ALL', // 'ALL' | 'ACTIVE_ONLY' | 'CLOSED_ONLY'
}) {
  const safeLivePrices = (livePrices && typeof livePrices === 'object') ? livePrices : {};
  const safeFlashes = (tickFlashes && typeof tickFlashes === 'object') ? tickFlashes : {};
  const currentSession = marketSession || getClientMarketSession();
  const [displayMode, setDisplayMode] = useState('TABLE'); // 'TABLE' (default) | 'CARDS'
  const [harvestSignals, setHarvestSignals] = useState({});

  useEffect(() => {
    if (!isCockpit) return;
    let isMounted = true;
    const fetchSignals = async () => {
      try {
        const res = await api.getHarvestActiveSignals();
        if (isMounted && res?.active_signals) {
          setHarvestSignals(res.active_signals);
        }
      } catch (e) {
        // silent fallback
      }
    };
    fetchSignals();
    const interval = setInterval(fetchSignals, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isCockpit]);

  const getHarvestSignal = (p) => {
    if (!isCockpit) return null;
    if (!harvestSignals || Object.keys(harvestSignals).length === 0) return null;
    const sym = (p.symbol || '').replace('.US', '').trim().toUpperCase();
    for (const [id, sig] of Object.entries(harvestSignals)) {
      const sigSym = (sig.symbol || '').replace('.US', '').trim().toUpperCase();
      if (sigSym === sym) return sig;
      if (p.rawPositions && Array.isArray(p.rawPositions)) {
        if (p.rawPositions.some(rp => String(rp.position_id || rp.positionID || rp.id) === String(id))) {
          return sig;
        }
      }
    }
    return null;
  };

  // 1. Identify active symbols currently open on eToro broker
  const activeEtoroSymbols = useMemo(() => {
    if (!Array.isArray(etoroPositions)) return new Set();
    const set = new Set();
    etoroPositions.forEach((p) => {
      const sym = (p?.symbol || '').replace('.US', '').trim().toUpperCase();
      if (sym) set.add(sym);
    });
    return set;
  }, [etoroPositions]);

  // 1b. Identify closed symbols from official eToro trade history (stopped out / profit taken)
  const closedSymbols = useMemo(() => {
    if (!Array.isArray(closedTrades) || closedTrades.length === 0) return new Set();
    const set = new Set();
    closedTrades.forEach((t) => {
      const raw = t?.symbol || t?.Symbol || t?.symbolName || t?.SymbolName || t?.market?.symbol || '';
      let sym = String(raw).replace('.US', '').trim().toUpperCase();

      // If symbol is missing from trade, resolve it from execution orders or stocks
      if (!sym) {
        const tOrdId = t?.order_id || t?.orderId || t?.OrderID;
        if (tOrdId && executionReceipt?.orders) {
          const matchOrd = executionReceipt.orders.find(o => o.order_id === tOrdId || o.orderId === tOrdId);
          if (matchOrd?.symbol) sym = matchOrd.symbol.replace('.US', '').trim().toUpperCase();
        }
      }
      if (!sym) {
        const op = Number(t?.open_rate ?? t?.openRate ?? 0);
        const sl = Number(t?.stop_loss ?? t?.stopLossRate ?? 0);
        const tp = Number(t?.take_profit ?? t?.takeProfitRate ?? 0);
        for (const s of (stocks || [])) {
          const sSym = (s.symbol || s.code || '').replace('.US', '').trim().toUpperCase();
          const sEntry = Number(s.entry_zone || s.entry || s.price || 0);
          const sStop = Number(s.stop_loss || s.stop || 0);
          const sT1 = Number(s.target_price || s.target1 || s.t1 || 0);
          const sT2 = Number(s.target_price_2 || s.target2 || s.t2 || 0);
          if (
            (op > 0 && Math.abs(op - sEntry) / sEntry < 0.02) ||
            (sl > 0 && Math.abs(sl - sStop) / sStop < 0.02) ||
            (tp > 0 && ((sT1 > 0 && Math.abs(tp - sT1) / sT1 < 0.02) || (sT2 > 0 && Math.abs(tp - sT2) / sT2 < 0.02)))
          ) {
            sym = sSym;
            break;
          }
        }
      }

      if (sym) set.add(sym);
    });
    return set;
  }, [closedTrades, executionReceipt, stocks]);

  // 2. Build strictly ACTIVE positions list (both filled positions and submitted pending orders)
  const activeMarketPositions = useMemo(() => {
    const symMap = new Map();

    // 1. Map live eToro positions by symbol (Filled active broker positions)
    if (Array.isArray(etoroPositions) && etoroPositions.length > 0) {
      etoroPositions.forEach((pos) => {
        const sym = (pos.symbol || pos.symbolName || '').replace('.US', '').trim().toUpperCase();
        if (sym) {
          const prev = symMap.get(sym) || { positions: [], orders: [], isPendingOrder: false };
          prev.positions.push(pos);
          prev.isPendingOrder = false;
          symMap.set(sym, prev);
        }
      });
    }

    // 2. Map live eToro pending limit orders by symbol (Awaiting S1 fill)
    if (Array.isArray(etoroOrders) && etoroOrders.length > 0) {
      etoroOrders.forEach((ord) => {
        const sym = (ord.symbol || ord.symbolName || '').replace('.US', '').trim().toUpperCase();
        if (sym) {
          const prev = symMap.get(sym) || { positions: [], orders: [], isPendingOrder: true };
          prev.orders = prev.orders || [];
          const ordId = ord.order_id || ord.orderId || ord.OrderID;
          if (!ordId || !prev.orders.some(o => (o.order_id || o.orderId || o.OrderID) === ordId)) {
            prev.orders.push(ord);
          }
          if (prev.positions.length === 0) {
            prev.isPendingOrder = true;
          }
          symMap.set(sym, prev);
        }
      });
    }

    // 3. Correlate submitted orders from execution receipt (filtering out cancelled/revoked/closed orders)
    if (executionReceipt?.orders && Array.isArray(executionReceipt.orders)) {
      executionReceipt.orders.forEach((ord) => {
        const st = (ord.status || '').toUpperCase();
        if (st === 'CANCELLED' || st === 'CANCELED' || st === 'REVOKED' || st === 'CLOSED' || st === 'REJECTED' || st === 'EXPIRED') {
          return;
        }

        const sym = (ord.symbol || '').replace('.US', '').trim().toUpperCase();
        if (!sym) return;

        const ordId = ord.order_id || ord.orderId || ord.OrderID;
        const isOnBroker = Array.isArray(etoroOrders) && etoroOrders.some(o => (o.order_id || o.orderId || o.OrderID) === ordId);
        const isFilledOnBroker = Array.isArray(etoroPositions) && etoroPositions.some(p => {
          const pSym = (p.symbol || p.symbolName || '').replace('.US', '').trim().toUpperCase();
          return pSym === sym;
        });

        // Se i dati live del broker sono stati caricati e l'ordine non è né a mercato né pendente sul broker, è stato revocato
        if (Array.isArray(etoroOrders) && !isOnBroker && !isFilledOnBroker) {
          return;
        }

        const prev = symMap.get(sym) || { positions: [], orders: [], isPendingOrder: true };
        prev.orders = prev.orders || [];
        if (!ordId || !prev.orders.some(o => (o.order_id || o.orderId || o.OrderID) === ordId)) {
          prev.orders.push(ord);
        }
        if (prev.positions.length === 0) {
          prev.isPendingOrder = true;
        }
        symMap.set(sym, prev);
      });
    }

    // 4. Correlate with Step 5 recommendations
    (stocks || []).forEach((s) => {
      const sym = (s.symbol || s.code || '').replace('.US', '').trim().toUpperCase();
      if (sym && symMap.has(sym)) {
        const item = symMap.get(sym);
        item.stock = s;
      }
    });

    // Build display items for all active broker positions & orders
    const items = [];
    symMap.forEach((data, sym) => {
      const positions = data.positions || [];
      const s = data.stock || {};
      const orders = data.orders || [];

      // Strictly ignore any symbol that has neither open positions nor pending orders on eToro
      if (positions.length === 0 && orders.length === 0) {
        return;
      }

      const isPending = positions.length === 0;

      // Primary position rate
      const primaryPos = positions[0];
      const liveData = safeLivePrices[sym] || safeLivePrices[`${sym}.US`];
      const livePriceVal = typeof liveData === 'number'
        ? liveData
        : (liveData?.price !== undefined ? Number(liveData.price) : null);

      let totalUnits = 0;
      let totalInvested = 0;
      let weightedEntry = 0;
      let current = 0;
      let pnlDol = 0;
      let pnlPct = 0;
      let dailyChangeP = null;

      if (!isPending && positions.length > 0) {
        // FILLED POSITION ON ETORO
        totalUnits = positions.reduce((acc, p) => acc + Number(p.units || 0), 0);
        totalInvested = positions.reduce((acc, p) => acc + Number(p.invested || 0), 0);
        weightedEntry = totalUnits > 0
          ? positions.reduce((acc, p) => acc + (Number(p.open_rate || p.openRate || 0) * Number(p.units || 0)), 0) / totalUnits
          : Number(primaryPos?.open_rate || primaryPos?.openRate || s.entry || 100);

        // Prezzo Attuale (Current Market Price):
        // 1. Priorità assoluta al prezzo di mercato in tempo reale da WebSocket / live quote (livePriceVal)
        // 2. Fallback su primaryPos.current_rate SOLO se autenticamente distinto da open_rate
        // 3. Fallback sul prezzo originale dello screening o su weightedEntry
        const hasDistinctBrokerRate = primaryPos?.current_rate && primaryPos?.open_rate && Math.abs(Number(primaryPos.current_rate) - Number(primaryPos.open_rate)) > 0.0001;
        const rawCurrent = (livePriceVal && livePriceVal > 0)
          ? livePriceVal
          : (hasDistinctBrokerRate ? primaryPos.current_rate : (s.current_price || s.price || primaryPos?.current_rate || weightedEntry));
        current = Number.isFinite(Number(rawCurrent)) ? Number(rawCurrent) : weightedEntry;
        dailyChangeP = (typeof liveData === 'object' && liveData?.change_p !== undefined)
          ? Number(liveData.change_p)
          : (primaryPos?.daily_change_p !== undefined ? Number(primaryPos.daily_change_p) : null);

        // P&L non realizzato dinamico: calcolato in tempo reale su Prezzo Attuale vs Entry iniziale d'acquisto
        if (weightedEntry > 0 && current > 0 && totalUnits > 0) {
          pnlDol = (current - weightedEntry) * totalUnits;
          pnlPct = ((current - weightedEntry) / weightedEntry) * 100;
        } else {
          pnlDol = positions.reduce((acc, p) => acc + Number(p.pnl || 0), 0);
          pnlPct = totalInvested > 0 ? (pnlDol / totalInvested) * 100 : Number(primaryPos?.pnl_percent || 0);
        }
      } else {
        // PENDING SUBMITTED ORDER ON ETORO (Awaiting entry zone fill)
        totalUnits = orders.reduce((acc, o) => acc + Number(o.units || 0), 0);
        const orderEntry = orders[0]?.limit_price || orders[0]?.rate || s.entry || s.entry_price || s.entry_zone || 100;
        weightedEntry = Number(orderEntry);
        totalInvested = totalUnits > 0 ? totalUnits * weightedEntry : Number(s.allocated_amount || 2000);

        // Sanity check on live price scale: only use live quote if within 35% of entry
        if (livePriceVal && Math.abs(livePriceVal - weightedEntry) / weightedEntry <= 0.35) {
          current = livePriceVal;
        } else {
          current = weightedEntry;
        }
        dailyChangeP = (typeof liveData === 'object' && liveData?.change_p !== undefined) ? Number(liveData.change_p) : null;
        pnlDol = 0.0;
        pnlPct = 0.0;
      }

      // Targets and Stops from real eToro positions or executed orders
      const tps = positions
        .map(p => Number(p.take_profit || p.takeProfitRate || 0))
        .concat(orders.map(o => Number(o.take_profit || o.take_profit_rate || o.takeProfitRate || 0)))
        .filter(v => v > 0)
        .sort((a, b) => a - b);
      
      const sls = positions
        .map(p => Number(p.stop_loss || p.stopLossRate || 0))
        .concat(orders.map(o => Number(o.stop_loss || o.stop_loss_rate || o.stopLossRate || 0)))
        .filter(v => v > 0);

      const t1 = Number(
        (tps.length > 0 ? tps[0] : null) ??
        s.target1 ?? s.target_price ?? (weightedEntry * 1.065)
      );

      const t2 = Number(
        (tps.length > 1 ? tps[tps.length - 1] : (tps.length === 1 ? tps[0] : null)) ??
        s.t2 ?? s.target2 ?? (t1 * 1.085)
      );

      const stopLoss = Number(
        (sls.length > 0 ? sls[0] : null) ??
        s.stop ?? s.stop_loss ?? (weightedEntry * 0.955)
      );

      // Status
      let status = 'A_MERCATO';
      if (isPending) {
        status = 'ORDINE_PENDING';
      } else {
        if (current >= t2 && t2 > 0) {
          status = 'TARGET_2_HIT';
        } else if (current >= t1 && t1 > 0) {
          status = 'TARGET_1_HIT';
        } else {
          status = 'A_MERCATO';
        }
      }

      const flashClass = safeFlashes[sym] || safeFlashes[`${sym}.US`] || '';

      // Data e ora di acquisto / sottomissione ordine
      const rawOpenTime = (
        primaryPos?.open_time ||
        primaryPos?.openTime ||
        primaryPos?.OpenDateTime ||
        primaryPos?.openDateTime ||
        primaryPos?.execution_time ||
        orders[0]?.request_time ||
        orders[0]?.requestTime ||
        orders[0]?.order_date ||
        orders[0]?.orderDate ||
        executionReceipt?.executed_at ||
        s.created_at ||
        null
      );
      const openTimeFmt = formatDateTime(rawOpenTime);

      items.push({
        symbol: sym,
        name: s.name || s.company_name || primaryPos?.name || orders[0]?.name || sym,
        sector: s.sector || 'Equities',
        entry_price: weightedEntry,
        current_price: current,
        open_time: rawOpenTime,
        open_time_fmt: openTimeFmt,
        units: totalUnits,
        invested: totalInvested,
        pnl_dol: pnlDol,
        pnl_pct: pnlPct,
        target_1: t1,
        target_2: t2,
        stop_loss: stopLoss,
        trend_profile: s.trend_profile || 'NO_SUPER_TREND',
        super_trend_score: s.super_trend_score || 0,
        super_trend_reasons: s.super_trend_reasons || [],
        status: status,
        isPendingOrder: isPending,
        flashClass: flashClass,
        daily_change_p: dailyChangeP,
        tranchesCount: positions.length || orders.length || 1,
        rawStock: s,
        rawPositions: positions,
      });
    });

    return items;
  }, [stocks, executionReceipt, etoroPositions, etoroOrders, safeLivePrices, safeFlashes, closedSymbols]);

  // 3. Identify truly CLOSED positions from this run (only if verified in official closed trades history)
  const closedSessionPositions = useMemo(() => {
    if (!Array.isArray(closedTrades) || closedTrades.length === 0) {
      return [];
    }
    const targetSyms = new Set();
    if (executionReceipt?.orders && Array.isArray(executionReceipt.orders)) {
      executionReceipt.orders.forEach((o) => {
        const sym = (o.symbol || o.Symbol || '').replace('.US', '').trim().toUpperCase();
        if (sym) targetSyms.add(sym);
      });
    }
    // Also include symbols from this run's portfolio recommendations (stocks)!
    (stocks || []).forEach((s) => {
      const sym = (s.symbol || s.code || '').replace('.US', '').trim().toUpperCase();
      if (sym) targetSyms.add(sym);
    });
    // Also include any symbols from closedTrades directly so no closed trade is omitted
    (closedTrades || []).forEach((t) => {
      const raw = t?.symbol || t?.Symbol || t?.symbolName || t?.market?.symbol || '';
      const sym = String(raw).replace('.US', '').trim().toUpperCase();
      if (sym) targetSyms.add(sym);
    });

    const items = [];
    targetSyms.forEach((sym) => {
      const matchingStock = (stocks || []).find(
        (s) => (s.symbol || s.code || '').replace('.US', '').trim().toUpperCase() === sym
      ) || {};
      const sEntry = Number(matchingStock.entry_zone || matchingStock.entry || matchingStock.price || 0);
      const sStop = Number(matchingStock.stop_loss || matchingStock.stop || 0);
      const sT1 = Number(matchingStock.target_price || matchingStock.target1 || matchingStock.t1 || 0);
      const sT2 = Number(matchingStock.target_price_2 || matchingStock.target2 || matchingStock.t2 || 0);

      // Find matching trades from official eToro closed trades history
      const matchingHistory = closedTrades.filter((t) => {
        const rawSym = (t?.symbol || t?.Symbol || t?.symbolName || t?.market?.symbol || '').replace('.US', '').trim().toUpperCase();
        if (rawSym === sym) return true;

        // Also match by order_id from executionReceipt
        const tOrdId = t?.order_id || t?.orderId || t?.OrderID;
        if (tOrdId && executionReceipt?.orders) {
          const matchOrd = executionReceipt.orders.find(o => (o.order_id === tOrdId || o.orderId === tOrdId) && (o.symbol || '').replace('.US', '').trim().toUpperCase() === sym);
          if (matchOrd) return true;
        }

        // Also match by entry/stop/target rates against matchingStock
        const op = Number(t?.open_rate ?? t?.openRate ?? 0);
        const sl = Number(t?.stop_loss ?? t?.stopLossRate ?? 0);
        const tp = Number(t?.take_profit ?? t?.takeProfitRate ?? 0);
        if (sEntry > 0 && op > 0 && Math.abs(op - sEntry) / sEntry < 0.02) return true;
        if (sStop > 0 && sl > 0 && Math.abs(sl - sStop) / sStop < 0.02) return true;
        if (tp > 0 && ((sT1 > 0 && Math.abs(tp - sT1) / sT1 < 0.02) || (sT2 > 0 && Math.abs(tp - sT2) / sT2 < 0.02))) return true;

        return false;
      });

      if (matchingHistory.length > 0) {
        const matchingStock = (stocks || []).find(
          (s) => (s.symbol || s.code || '').replace('.US', '').trim().toUpperCase() === sym
        ) || {};

        const totalRealizedPnl = matchingHistory.reduce((acc, t) => acc + Number(t.net_profit ?? t.netProfit ?? t.profit ?? t.Profit ?? 0), 0);
        const totalInvested = matchingHistory.reduce((acc, t) => acc + Number(t.investment ?? t.Investment ?? t.initialInvestment ?? (Number(t.open_rate || t.openRate || 0) * Number(t.units || t.Units || 1))), 0);
        const units = matchingHistory.reduce((acc, t) => acc + Number(t.units ?? t.Units ?? 0), 0);
        const exitRate = Number(matchingHistory[0].close_rate ?? matchingHistory[0].closeRate ?? matchingHistory[0].CloseRate ?? 0);
        const entryRate = Number(matchingHistory[0].open_rate ?? matchingHistory[0].openRate ?? matchingHistory[0].OpenRate ?? matchingStock.entry ?? 0);
        const closeTime = matchingHistory[0].close_time || matchingHistory[0].closeDateTime || matchingHistory[0].CloseDateTime || matchingHistory[0].CloseTime || '';
        const pnlPct = totalInvested > 0 ? (totalRealizedPnl / totalInvested) * 100 : 0;

        items.push({
          symbol: sym,
          name: matchingStock.name || matchingHistory[0]?.name || matchingHistory[0]?.InstrumentDisplayName || sym,
          sector: matchingStock.sector || 'Equities',
          entry_price: entryRate,
          exit_price: exitRate,
          units: units,
          invested: totalInvested,
          realized_pnl: totalRealizedPnl,
          realized_pct: pnlPct,
          close_time: closeTime,
          reason: totalRealizedPnl >= 0 ? 'TARGET_REACHED' : 'STOP_LOSS_REACHED',
          details: matchingHistory,
        });
      }
    });

    return items;
  }, [executionReceipt, closedTrades, stocks]);

  // Aggregate stats
  const activeInvested = activeMarketPositions.reduce((acc, p) => acc + (p.invested || 0), 0);
  const activePnlDol = activeMarketPositions.reduce((acc, p) => acc + (p.pnl_dol || 0), 0);
  const activePnlPct = activeInvested > 0 ? (activePnlDol / activeInvested) * 100 : 0;

  const closedRealizedPnl = closedSessionPositions.reduce((acc, p) => acc + (p.realized_pnl || 0), 0);
  const netSessionPnl = activePnlDol + closedRealizedPnl;
  const isSessionNetWin = netSessionPnl >= 0;

  const executedTime = executionReceipt?.executed_at
    ? executionReceipt.executed_at.replace('T', ' ').slice(0, 19)
    : 'SESSIONE ATTIVA';

  const handleSelectPosition = (p) => {
    if (!onSelectStock) return;
    const enriched = {
      ...(p.rawStock || {}),
      symbol: p.symbol,
      code: p.symbol,
      name: p.name,
      sector: p.sector,
      current_price: p.current_price,
      price: p.current_price,
      last_price: p.current_price,
      entry_price: p.entry_price,
      entry_zone: p.entry_price,
      entry: p.entry_price,
      open_time: p.open_time,
      open_time_fmt: p.open_time_fmt,
      target_1: p.target_1,
      target1: p.target_1,
      target_price: p.target_1,
      target_2: p.target_2,
      target2: p.target_2,
      target_price_2: p.target_2,
      stop_loss: p.stop_loss,
      stop: p.stop_loss,
      trend_profile: p.trend_profile || 'NO_SUPER_TREND',
      super_trend_score: p.super_trend_score || 0,
      super_trend_reasons: p.super_trend_reasons || [],
      units: p.units,
      invested: p.invested,
    };
    onSelectStock(enriched);
  };

  // --------------------------------------------------------------------------
  // CLOSED_ONLY VIEW (SUB-TAB 2: POSIZIONI CHIUSE DELLA SESSIONE)
  // --------------------------------------------------------------------------
  if (viewMode === 'CLOSED_ONLY') {
    return (
      <section 
        className="live-market-positions-panel glass-panel"
        style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(15, 23, 42, 0.75) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '16px',
          padding: '22px 24px',
          marginBottom: '28px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}
        aria-label="Posizioni Chiuse della Sessione eToro"
      >
        {/* Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <span 
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#fca5a5',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                }}
              >
                <XCircle size={13} className="text-red-400" />
                <span>POSIZIONI CHIUSE DELLA SESSIONE</span>
              </span>

              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: 'var(--text-muted)',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                fontFamily: 'JetBrains Mono, monospace'
              }}>
                <span>{closedSessionPositions.length} TRADE REGISTRATI</span>
              </span>
            </div>

            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
              Storico ufficiale dei trade eseguiti e chiusi su eToro • Prezzo d'ingresso, prezzo di uscita e P&L netto realizzato in dollari e percentuale
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>P&L Realizzato Totale</div>
              <div 
                style={{ 
                  fontSize: '18px', 
                  fontWeight: 800, 
                  fontFamily: 'JetBrains Mono, monospace',
                  color: closedRealizedPnl >= 0 ? '#34d399' : '#f87171',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  justifyContent: 'flex-end'
                }}
              >
                {closedRealizedPnl >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span>{closedRealizedPnl >= 0 ? `+$${Number(closedRealizedPnl || 0).toFixed(2)}` : `-$${Math.abs(Number(closedRealizedPnl || 0)).toFixed(2)}`}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {closedSessionPositions.length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              background: 'rgba(15, 23, 42, 0.4)',
              borderRadius: '12px',
              border: '1px dashed rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>📋</div>
            <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', margin: '0 0 6px 0' }}>
              Nessuna Posizione Chiusa in Questa Sessione
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, maxWidth: '600px', marginInline: 'auto', lineHeight: '1.6' }}>
              Tutti i titoli aperti sono attualmente a mercato nel 1° sotto-tab ("Titoli a Mercato"), protetti dal Break-Even Guardian e dal Profit Ratchet dinamico.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {closedSessionPositions.map((c, i) => (
              <div 
                key={`${c.symbol}_closed_${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '10px',
                  padding: '14px 18px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span 
                    style={{
                      background: Number(c.realized_pnl || 0) >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      border: `1px solid ${Number(c.realized_pnl || 0) >= 0 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                      color: Number(c.realized_pnl || 0) >= 0 ? '#34d399' : '#f87171',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 800,
                      fontFamily: 'JetBrains Mono, monospace'
                    }}
                  >
                    {c.symbol}
                  </span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Chiusura broker registrata{c.close_time ? ` (${c.close_time.replace('T', ' ').slice(0, 16)})` : ''} • Causale: {c.reason === 'TARGET_REACHED' ? '🎯 Target Centrato' : '🛡️ Stop Loss / Chiusura'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Entry ➔ Uscita</div>
                    <div style={{ fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: '#e2e8f0' }}>
                      ${Number(c.entry_price || 0).toFixed(2)} ➔ <span style={{ color: Number(c.realized_pnl || 0) >= 0 ? '#34d399' : '#f87171', fontWeight: 700 }}>${Number(c.exit_price || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Quote Chiuse</div>
                    <div style={{ fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: '#ffffff' }}>
                      {Number(c.units || 0).toFixed(1)} az. (${Number(c.invested || 0).toFixed(0)})
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', minWidth: '120px' }}>
                    <div style={{ fontSize: '10px', color: Number(c.realized_pnl || 0) >= 0 ? '#6ee7b7' : '#fca5a5', textTransform: 'uppercase', fontWeight: 700 }}>P&L Realizzato</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: Number(c.realized_pnl || 0) >= 0 ? '#34d399' : '#f87171', fontFamily: 'JetBrains Mono, monospace' }}>
                      {Number(c.realized_pnl || 0) >= 0 ? `+$${Number(c.realized_pnl || 0).toFixed(2)}` : `-$${Math.abs(Number(c.realized_pnl || 0)).toFixed(2)}`}
                      <span style={{ fontSize: '11px', opacity: 0.85, marginLeft: '4px' }}>
                        ({Number(c.realized_pct || 0) >= 0 ? `+${Number(c.realized_pct || 0).toFixed(2)}%` : `${Number(c.realized_pct || 0).toFixed(2)}%`})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <section 
      className="live-market-positions-panel glass-panel"
      style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 182, 212, 0.05) 50%, rgba(15, 23, 42, 0.6) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.35)',
        borderRadius: '16px',
        padding: '22px 24px',
        marginBottom: '28px',
        boxShadow: '0 8px 32px rgba(16, 185, 129, 0.08), 0 0 1px rgba(255, 255, 255, 0.1) inset',
      }}
      aria-label="Posizioni a Mercato su eToro Demo"
    >
      {/* Header Banner */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <span 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(6, 182, 212, 0.2))',
                border: '1px solid rgba(16, 185, 129, 0.5)',
                color: '#34d399',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                boxShadow: '0 0 12px rgba(16, 185, 129, 0.25)'
              }}
            >
              <Zap size={13} className="text-emerald-400" />
              <span>⚡ ORDINI INVIATI A ETORO (DEMO)</span>
            </span>

            {/* Live Trading Session Badge */}
            {(() => {
              const isExt = Boolean(currentSession?.isExtended || currentSession?.is_extended);
              return (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: isExt 
                    ? 'rgba(168, 85, 247, 0.15)' 
                    : 'rgba(16, 185, 129, 0.15)',
                  border: `1px solid ${isExt ? 'rgba(168, 85, 247, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                  color: isExt ? '#c084fc' : '#34d399',
                  padding: '4px 11px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 700,
                  fontFamily: 'JetBrains Mono, monospace'
                }}>
                  {isExt ? <Moon size={12} /> : <Sun size={12} />}
                  <span>{currentSession?.name || 'SESSIONE MERCATO'}</span>
                </span>
              );
            })()}

            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'var(--text-muted)',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', display: 'inline-block' }}></span>
              <span>{activeMarketPositions.length} TITOLI ATTIVI ({Array.isArray(etoroPositions) ? etoroPositions.length : activeMarketPositions.length} POSIZIONI BROKER)</span>
            </span>
          </div>

          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
            Monitoraggio streaming real-time • Strategia Adattiva eToro • Protezione Stop Loss attiva anche in sessione after-hours
          </p>
        </div>

        {/* Aggregate KPI Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Capitale Attivo</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', fontFamily: 'JetBrains Mono, monospace' }}>
              ${Number(activeInvested).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>P&L Non Realizzato</div>
            <div 
              style={{ 
                fontSize: '17px', 
                fontWeight: 800, 
                fontFamily: 'JetBrains Mono, monospace',
                color: activePnlDol >= 0 ? '#34d399' : '#f87171',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                justifyContent: 'flex-end'
              }}
            >
              {activePnlDol >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
              <span>{activePnlDol >= 0 ? `+$${Number(activePnlDol || 0).toFixed(2)}` : `-$${Math.abs(Number(activePnlDol || 0)).toFixed(2)}`}</span>
              <span style={{ fontSize: '12px', opacity: 0.85 }}>({activePnlDol >= 0 ? `+${Number(activePnlPct || 0).toFixed(2)}%` : `${Number(activePnlPct || 0).toFixed(2)}%`})</span>
            </div>
          </div>

          {closedSessionPositions.length > 0 && (
            <div style={{ textAlign: 'right', borderLeft: '1px solid rgba(255, 255, 255, 0.1)', paddingLeft: '16px' }}>
              <div style={{ fontSize: '11px', color: closedRealizedPnl >= 0 ? '#34d399' : '#f87171', textTransform: 'uppercase', fontWeight: 700 }}>P&L Realizzato (Chiuso)</div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: closedRealizedPnl >= 0 ? '#34d399' : '#f87171', fontFamily: 'JetBrains Mono, monospace' }}>
                {closedRealizedPnl >= 0 ? `+$${Number(closedRealizedPnl || 0).toFixed(2)}` : `-$${Math.abs(Number(closedRealizedPnl || 0)).toFixed(2)}`}
              </div>
            </div>
          )}

          <div style={{ textAlign: 'right', borderLeft: '1px solid rgba(255, 255, 255, 0.1)', paddingLeft: '16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Esecuzione</div>
            <div style={{ fontSize: '12px', color: 'var(--cyan-primary)', fontFamily: 'JetBrains Mono, monospace', marginTop: '2px' }}>
              {executedTime}
            </div>
          </div>
        </div>
      </div>

      {/* Content: If 0 active positions, display a clean flat desk status card */}
      {activeMarketPositions.length === 0 ? (
        <div
          style={{
            padding: '36px 24px',
            textAlign: 'center',
            background: 'rgba(15, 23, 42, 0.4)',
            borderRadius: '12px',
            border: '1px dashed rgba(56, 189, 248, 0.25)',
            marginBottom: closedSessionPositions.length > 0 ? '20px' : '0',
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>🟢</div>
          <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', margin: '0 0 6px 0' }}>
            Nessuna Posizione Attualmente Aperta a Mercato
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, maxWidth: '600px', marginInline: 'auto', lineHeight: '1.6' }}>
            Il desk quantitativo è sincronizzato con eToro via API Demo (#33932108) • 100% Liquidità libera pronta per l'orchestrazione o nuove allocazioni.
          </p>
        </div>
      ) : (
        <>
          {/* View Mode Toggle: Tabella Espansa vs Griglia Card */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ fontSize: '13px', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Titoli A Mercato su eToro ({activeMarketPositions.length})
              </strong>
            </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isCockpit && onOpenCloseModal && activeMarketPositions.length > 0 && (
            <button
              type="button"
              onClick={onOpenCloseModal}
              className="hover:scale-[1.02] active:scale-[0.98]"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                color: '#fff',
                fontWeight: '700',
                fontSize: '11px',
                padding: '5px 12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(239, 68, 68, 0.3)',
                transition: 'all 0.2s ease',
              }}
              title="Chiudi le posizioni a mercato o cancella gli ordini pendenti su eToro"
            >
              <span>🔴</span>
              <span>Vendi Posizioni Run ({activeMarketPositions.length})</span>
            </button>
          )}

          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '2px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              type="button"
              className={`status-pill-btn ${displayMode === 'TABLE' ? 'active' : ''}`}
              onClick={() => setDisplayMode('TABLE')}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', fontSize: '11px', borderRadius: '6px' }}
            >
              <List size={13} />
              <span>Tabella Espansa</span>
            </button>
            <button
              type="button"
              className={`status-pill-btn ${displayMode === 'CARDS' ? 'active' : ''}`}
              onClick={() => setDisplayMode('CARDS')}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', fontSize: '11px', borderRadius: '6px' }}
            >
              <Layers size={13} />
              <span>Griglia Card</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: TABELLA ESPANSA (Matching Trade Post-Mortem Explorer) */}
      {displayMode === 'TABLE' && (
        <div className="post-mortem-scroll-container" style={{ borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.25)', background: 'rgba(15, 23, 42, 0.7)', marginBottom: closedSessionPositions.length > 0 ? '20px' : '0' }}>
          <table className="post-mortem-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>TICKER</th>
                <th>STRATEGIA / ORDINE</th>
                <th>DATA/ORA ACQUISTO</th>
                <th>ENTRY (S1)</th>
                <th>TARGET 1 / 2</th>
                <th>STOP LOSS (-4.5%)</th>
                <th>PREZZO ATT.</th>
                <th>QUOTE (INVESTITO)</th>
                <th>P&L NON REALIZZATO</th>
                <th>STATO MONITORAGGIO</th>
                <th>{isCockpit ? 'AZIONI' : 'GRAFICO CANDLESTICK'}</th>
              </tr>
            </thead>
            <tbody>
              {activeMarketPositions.map((p, idx) => {
                const isWin = Number(p.pnl_dol || 0) >= 0;
                return (
                  <tr key={`${p.symbol}_tbl_${idx}`} className="trade-row" style={{ background: 'rgba(16, 185, 129, 0.04)' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong className="trade-ticker font-mono" style={{ fontSize: '14px', color: '#60a5fa' }}>{p.symbol}</strong>
                        {p.trend_profile === 'SUPER_TREND' ? (
                          <span title="SUPER TREND: Alpha Runner senza Take Profit" style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.4)', padding: '1px 5px', borderRadius: '4px', fontSize: '9px', fontWeight: 800 }}>
                            🚀 RUNNER
                          </span>
                        ) : (
                          <span title="SWING T2: Take Profit ancorato a Target 2" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)', padding: '1px 5px', borderRadius: '4px', fontSize: '9px', fontWeight: 700 }}>
                            🎯 T2
                          </span>
                        )}
                        <span style={{
                          background: p.isPendingOrder ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.2)',
                          color: p.isPendingOrder ? '#38bdf8' : '#34d399',
                          border: `1px solid ${p.isPendingOrder ? 'rgba(56, 189, 248, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                          padding: '2px 7px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 800,
                        }}>
                          {p.isPendingOrder 
                            ? `⏳ ORDINE LIMITE${p.tranchesCount > 1 ? ` (${p.tranchesCount} TR.)` : ''}` 
                            : `⚡ A MERCATO${p.tranchesCount > 1 ? ` (${p.tranchesCount} TR.)` : ''}`}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {p.name} {p.sector ? `• ${p.sector}` : ''}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: '#e2e8f0', fontFamily: 'JetBrains Mono, monospace' }}>
                        {p.isPendingOrder 
                          ? (p.trend_profile === 'SUPER_TREND' ? 'Limit Order (Alpha Runner)' : 'Limit Order (In Attesa S1)')
                          : (p.trend_profile === 'SUPER_TREND' ? 'Alpha Runner (No TP • Trailing)' : 'Swing (Take Profit T2)')}
                      </span>
                    </td>
                    <td className="font-mono" style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#cbd5e1' }}>
                        <Clock size={12} style={{ color: p.isPendingOrder ? '#38bdf8' : '#34d399', opacity: 0.85, flexShrink: 0 }} />
                        <span>{p.open_time_fmt || 'N/D'}</span>
                      </div>
                      {p.isPendingOrder && (
                        <div style={{ fontSize: '10px', color: '#38bdf8', opacity: 0.8, marginTop: '1px' }}>Ordine Limite</div>
                      )}
                    </td>
                    <td className="font-mono">${Number(p.entry_price || 0).toFixed(2)}</td>
                    <td className="font-mono text-success">${Number(p.target_1 || 0).toFixed(2)} / ${Number(p.target_2 || 0).toFixed(2)}</td>
                    <td className="font-mono text-danger">${Number(p.stop_loss || 0).toFixed(2)}</td>
                    <td className={`font-mono font-bold current-price ${p.flashClass}`} style={{ fontSize: '14px' }}>
                      ${Number(p.current_price || 0).toFixed(2)}
                      {p.daily_change_p !== null && p.daily_change_p !== undefined && (
                        <div style={{ fontSize: '11px', fontWeight: 600, color: p.daily_change_p >= 0 ? '#34d399' : '#f87171' }}>
                          {p.daily_change_p >= 0 ? `+${p.daily_change_p.toFixed(2)}%` : `${p.daily_change_p.toFixed(2)}%`}
                        </div>
                      )}
                    </td>
                    <td className="font-mono">
                      <strong style={{ color: '#ffffff' }}>{Number(p.units || 0).toFixed(2)} az.</strong>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>(${Number(p.invested || 0).toFixed(0)})</div>
                    </td>
                    <td>
                      {p.isPendingOrder ? (
                        <div>
                          <div className="font-mono font-bold" style={{ fontSize: '13px', color: '#94a3b8' }}>$0.00</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>In attesa tocco S1</div>
                        </div>
                      ) : (
                        <>
                          <div className={`font-mono font-bold ${isWin ? 'text-success' : 'text-danger'}`} style={{ fontSize: '13px' }}>
                            {isWin ? `+$${Number(p.pnl_dol || 0).toFixed(2)}` : `-$${Math.abs(Number(p.pnl_dol || 0)).toFixed(2)}`}
                          </div>
                          <div className={`font-mono ${isWin ? 'text-success' : 'text-danger'}`} style={{ fontSize: '11px' }}>
                            {isWin ? `+${Number(p.pnl_pct || 0).toFixed(2)}%` : `${Number(p.pnl_pct || 0).toFixed(2)}%`}
                          </div>
                        </>
                      )}
                    </td>
                    <td>
                      {(() => {
                        const hSig = getHarvestSignal(p);
                        const bClass = hSig?.signal_badge === 'UNCAPPED_RUNNER' ? 'badge-runner' :
                          hSig?.signal_badge === 'TIGHTENED_SL' ? 'badge-tighten' :
                          hSig?.signal_badge === 'HOLD_RUNNER' ? 'badge-hold' :
                          hSig?.signal_badge === 'SOFT_HARVEST' ? 'badge-soft' :
                          hSig?.signal_badge === 'TIME_DECAY_EXIT' ? 'badge-decay' :
                          hSig?.signal_badge === 'STAGNATION_HARVEST' ? 'badge-stagnation' :
                          hSig?.signal_badge === 'EARNINGS_EXIT' ? 'badge-earnings' : 'badge-neutral';
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {hSig && (
                              <span className={`harvest-badge ${bClass}`} title={hSig.notes || 'Intervento Alpha Harvest attivo'}>
                                {hSig.signal_badge.replace(/_/g, ' ')}
                              </span>
                            )}
                            {p.status === 'ORDINE_PENDING' && (
                              <span className="trade-status-badge" style={{ background: 'rgba(56, 189, 248, 0.15)', borderColor: '#38bdf8', color: '#38bdf8' }}>
                                ⏳ Ordine Limite Attivo • In Attesa S1
                              </span>
                            )}
                            {p.status === 'TARGET_1_HIT' && (
                              <span className="trade-status-badge badge-t1">✓ T1 HIT • Break-Even</span>
                            )}
                            {p.status === 'TARGET_2_HIT' && (
                              <span className="trade-status-badge badge-t2">🚀 T2 HIT • Profitto Esteso</span>
                            )}
                            {p.status === 'STOPPED_OUT' && (
                              <span className="trade-status-badge badge-stop">❌ STOPPED OUT</span>
                            )}
                            {p.status === 'A_MERCATO' && (
                              <span className="trade-status-badge badge-t1" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: '#10b981', color: '#34d399' }}>
                                ⚡ In Corso • Stop -4.5%
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          className="inspect-btn glass-button"
                          onClick={() => handleSelectPosition(p)}
                          title="Visualizza Candlestick e livelli operativi esatti"
                        >
                          <Eye size={13} />
                          <span>Grafico</span>
                        </button>
                        {isCockpit && onOpenCloseModal && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenCloseModal();
                            }}
                            className="hover:scale-[1.03] active:scale-[0.97]"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: 'rgba(239, 68, 68, 0.2)',
                              border: '1px solid rgba(239, 68, 68, 0.45)',
                              color: '#f87171',
                              padding: '5px 9px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            title={`Chiudi la posizione o cancella gli ordini per ${p.symbol}`}
                          >
                            <span>🔴</span>
                            <span>Vendi</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW 2: GRID OF CARDS */}
      {displayMode === 'CARDS' && (
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', 
            gap: '14px',
            marginBottom: closedSessionPositions.length > 0 ? '20px' : '0'
          }}
        >
          {activeMarketPositions.map((p, idx) => {
            const isWin = Number(p.pnl_dol || 0) >= 0;
            return (
              <div
                key={`${p.symbol}_card_${idx}`}
                className="glass-panel hover:scale-[1.01] transition-all duration-200"
                style={{
                  padding: '16px 18px',
                  borderRadius: '12px',
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  cursor: onSelectStock ? 'pointer' : 'default',
                }}
                onClick={() => handleSelectPosition(p)}
                title={onSelectStock ? "Clicca per aprire il grafico Candlestick interattivo e i livelli" : undefined}
              >
                {/* Card Header: Ticker, Badges, Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '17px', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: '#60a5fa' }}>
                        {p.symbol}
                      </strong>
                      {p.trend_profile === 'SUPER_TREND' ? (
                        <span style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.4)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>
                          🚀 SUPER TREND
                        </span>
                      ) : (
                        <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
                          🎯 SWING T2
                        </span>
                      )}
                      <span 
                        style={{
                          background: p.isPendingOrder ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.2)',
                          color: p.isPendingOrder ? '#38bdf8' : '#34d399',
                          border: `1px solid ${p.isPendingOrder ? 'rgba(56, 189, 248, 0.45)' : 'rgba(16, 185, 129, 0.45)'}`,
                          padding: '2px 7px',
                          borderRadius: '6px',
                          fontSize: '10px',
                          fontWeight: 800,
                          letterSpacing: '0.4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: p.isPendingOrder ? '#38bdf8' : '#10b981' }}></span>
                        {p.isPendingOrder 
                          ? `ORDINE LIMITE${p.tranchesCount > 1 ? ` (${p.tranchesCount} TR.)` : ''}` 
                          : `A MERCATO${p.tranchesCount > 1 ? ` (${p.tranchesCount} TR.)` : ''}`}
                      </span>
                      {(() => {
                        const hSig = getHarvestSignal(p);
                        if (!hSig) return null;
                        const bClass = hSig.signal_badge === 'UNCAPPED_RUNNER' ? 'badge-runner' :
                          hSig.signal_badge === 'TIGHTENED_SL' ? 'badge-tighten' :
                          hSig.signal_badge === 'HOLD_RUNNER' ? 'badge-hold' :
                          hSig.signal_badge === 'SOFT_HARVEST' ? 'badge-soft' :
                          hSig.signal_badge === 'TIME_DECAY_EXIT' ? 'badge-decay' :
                          hSig.signal_badge === 'STAGNATION_HARVEST' ? 'badge-stagnation' :
                          hSig.signal_badge === 'EARNINGS_EXIT' ? 'badge-earnings' : 'badge-neutral';
                        return (
                          <span className={`harvest-badge ${bClass}`} title={hSig.notes || 'Intervento Alpha Harvest attivo'}>
                            {hSig.signal_badge.replace(/_/g, ' ')}
                          </span>
                        );
                      })()}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {p.name} {p.sector ? `• ${p.sector}` : ''}
                    </div>
                  </div>

                  {/* Right: Real-Time P&L */}
                  <div style={{ textAlign: 'right' }}>
                    {p.isPendingOrder ? (
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: '#94a3b8' }}>
                          $0.00
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                          In attesa tocco S1
                        </div>
                      </div>
                    ) : (
                      <>
                        <div 
                          style={{ 
                            fontSize: '15px', 
                            fontWeight: 800, 
                            fontFamily: 'JetBrains Mono, monospace',
                            color: isWin ? '#34d399' : '#f87171' 
                          }}
                        >
                          {isWin ? `+$${Number(p.pnl_dol || 0).toFixed(2)}` : `-$${Math.abs(Number(p.pnl_dol || 0)).toFixed(2)}`}
                        </div>
                        <div 
                          style={{ 
                            fontSize: '12px', 
                            fontWeight: 700, 
                            fontFamily: 'JetBrains Mono, monospace',
                            color: isWin ? '#34d399' : '#f87171' 
                          }}
                        >
                          {isWin ? `+${Number(p.pnl_pct || 0).toFixed(2)}%` : `${Number(p.pnl_pct || 0).toFixed(2)}%`}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Price Flow: Entry -> Live */}
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Entry Price (S1)</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', fontFamily: 'JetBrains Mono, monospace' }}>
                      ${Number(p.entry_price || 0).toFixed(2)}
                    </div>
                    {p.open_time_fmt && p.open_time_fmt !== 'N/D' && (
                      <div style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px', fontFamily: 'JetBrains Mono, monospace' }}>
                        <Clock size={10} style={{ color: p.isPendingOrder ? '#38bdf8' : '#34d399', flexShrink: 0 }} />
                        <span>{p.open_time_fmt}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ color: 'var(--text-dim)', fontSize: '14px' }}>➔</div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Prezzo Attuale</div>
                    <div 
                      className={`current-price font-mono font-bold ${p.flashClass}`}
                      style={{ 
                        fontSize: '14px', 
                        color: '#ffffff', 
                        fontFamily: 'JetBrains Mono, monospace',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      ${Number(p.current_price || 0).toFixed(2)}
                    </div>
                    {p.daily_change_p !== null && p.daily_change_p !== undefined && (
                      <div style={{ fontSize: '11px', fontWeight: 600, color: p.daily_change_p >= 0 ? '#34d399' : '#f87171' }}>
                        {p.daily_change_p >= 0 ? `+${p.daily_change_p.toFixed(2)}%` : `${p.daily_change_p.toFixed(2)}%`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Sizing & Risk/Reward Targets */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <div>
                    <span style={{ color: 'var(--text-dim)' }}>Quote: </span>
                    <strong style={{ color: '#ffffff', fontFamily: 'JetBrains Mono, monospace' }}>{Number(p.units || 0).toFixed(2)}</strong>
                    <span style={{ color: 'var(--text-dim)', marginLeft: '4px' }}>(${Number(p.invested || 0).toFixed(0)})</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Stop S1: </span>
                    <strong style={{ color: '#f87171', fontFamily: 'JetBrains Mono, monospace' }}>${Number(p.stop_loss || 0).toFixed(2)}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)' }}>Target 1: </span>
                    <strong style={{ color: '#34d399', fontFamily: 'JetBrains Mono, monospace' }}>${Number(p.target_1 || 0).toFixed(2)}</strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Target 2: </span>
                    <strong style={{ color: '#38bdf8', fontFamily: 'JetBrains Mono, monospace' }}>${Number(p.target_2 || 0).toFixed(2)}</strong>
                  </div>
                </div>

                {/* Status Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '8px', fontSize: '10px' }}>
                  <span style={{ color: 'var(--text-dim)' }}>
                    Broker Sync: eToro Live Demo
                  </span>
                  {p.status === 'ORDINE_PENDING' && (
                    <span style={{ color: '#38bdf8', fontWeight: 600 }}>⏳ Ordine Limite Attivo • In Attesa S1</span>
                  )}
                  {p.status === 'TARGET_1_HIT' && (
                    <span style={{ color: '#34d399', fontWeight: 700 }}>✓ T1 HIT • Break-Even Attivo</span>
                  )}
                  {p.status === 'TARGET_2_HIT' && (
                    <span style={{ color: '#38bdf8', fontWeight: 700 }}>🚀 T2 HIT • Profitto Esteso</span>
                  )}
                  {p.status === 'STOPPED_OUT' && (
                    <span style={{ color: '#f87171', fontWeight: 700 }}>❌ STOPPED OUT</span>
                  )}
                  {p.status === 'A_MERCATO' && (
                    <span style={{ color: '#6ee7b7', fontWeight: 600 }}>In Corso • Stop a -4.5%</span>
                  )}
                </div>

                {/* Cockpit Card Actions */}
                {isCockpit && onOpenCloseModal && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '2px' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCloseModal();
                      }}
                      className="hover:scale-[1.02] active:scale-[0.98]"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#f87171',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      title={`Vendi le quote o cancella gli ordini per ${p.symbol}`}
                    >
                      <span>🔴</span>
                      <span>Vendi Posizione</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* Dedicated Section for Closed / After-Hours Realized Positions (e.g., VRTX) */}
      {viewMode !== 'ACTIVE_ONLY' && closedSessionPositions.length > 0 && (
        <div 
          style={{
            background: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginTop: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <XCircle size={16} className="text-red-400" />
              <strong style={{ fontSize: '13px', fontWeight: 800, color: '#fca5a5', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Posizioni Chiuse della Sessione (Extended Trading / Realizzate)
              </strong>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
              Protezione Rischio Attiva • Cap Perdita ≤ 1.0%
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {closedSessionPositions.map((c, i) => (
              <div 
                key={`${c.symbol}_closed_${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span 
                    style={{
                      background: Number(c.realized_pnl || 0) >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      border: `1px solid ${Number(c.realized_pnl || 0) >= 0 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                      color: Number(c.realized_pnl || 0) >= 0 ? '#34d399' : '#f87171',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 800,
                      fontFamily: 'JetBrains Mono, monospace'
                    }}
                  >
                    {c.symbol}
                  </span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Chiusura broker registrata{c.close_time ? ` (${c.close_time.replace('T', ' ').slice(0, 16)})` : ''}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Entry ➔ Uscita</div>
                    <div style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#e2e8f0' }}>
                      ${Number(c.entry_price || 0).toFixed(2)} ➔ <span style={{ color: Number(c.realized_pnl || 0) >= 0 ? '#34d399' : '#f87171', fontWeight: 700 }}>${Number(c.exit_price || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Quote Chiuse</div>
                    <div style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#ffffff' }}>
                      {Number(c.units || 0).toFixed(1)} az. (${Number(c.invested || 0).toFixed(0)})
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', minWidth: '100px' }}>
                    <div style={{ fontSize: '10px', color: Number(c.realized_pnl || 0) >= 0 ? '#6ee7b7' : '#fca5a5', textTransform: 'uppercase', fontWeight: 700 }}>P&L Realizzato</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: Number(c.realized_pnl || 0) >= 0 ? '#34d399' : '#f87171', fontFamily: 'JetBrains Mono, monospace' }}>
                      {Number(c.realized_pnl || 0) >= 0 ? `+$${Number(c.realized_pnl || 0).toFixed(2)}` : `-$${Math.abs(Number(c.realized_pnl || 0)).toFixed(2)}`}
                      <span style={{ fontSize: '11px', opacity: 0.85, marginLeft: '4px' }}>
                        ({Number(c.realized_pct || 0) >= 0 ? `+${Number(c.realized_pct || 0).toFixed(2)}%` : `${Number(c.realized_pct || 0).toFixed(2)}%`})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <Info size={13} className="text-cyan-400" />
            <span>
              <strong>Chiusure di Posizione:</strong> Posizioni liquidate dal broker su target di profitto (T1/T2) o stop loss quantitativo.
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
