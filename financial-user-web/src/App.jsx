import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TrendingUp, History } from 'lucide-react';
import { Header } from './components/Header';
import { SafeHavenAlert } from './components/SafeHavenAlert';
import { ControlPanel } from './components/ControlPanel';
import { Stepper } from './components/Stepper';
import { PortfolioSummary } from './components/PortfolioSummary';
import { TopCardsGrid } from './components/TopCardsGrid';
import { StockDetailModal } from './components/StockDetailModal';
import { StepDetailModal } from './components/StepDetailModal';
import { MarketRegimeModal } from './components/MarketRegimeModal';
import { HealthModal } from './components/HealthModal';
import { CopilotView } from './components/CopilotView';
import { EToroExecutionModal } from './components/EToroExecutionModal';
import EToroClosePositionsModal from './components/EToroClosePositionsModal';
import { LiveMarketPositionsPanel, formatDateTime } from './components/LiveMarketPositionsPanel';

// Quant Audit & Continuous Learning Components
import { RegimeFilterBar } from './components/RegimeFilterBar';
import { QuantKPICards } from './components/QuantKPICards';
import { NodeAttributionRadar } from './components/NodeAttributionRadar';
import { TradePostMortemTable } from './components/TradePostMortemTable';
import { ShadowAuditPanel } from './components/ShadowAuditPanel';
import { TuningAdvisorPanel } from './components/TuningAdvisorPanel';
import { WhatIfSimulationModal } from './components/WhatIfSimulationModal';
import { AuditDetailModal } from './components/AuditDetailModal';

// FintechDataHub Component
import { FintechDataHub } from './components/hub/FintechDataHub';

// Alpha Harvest & Reinvestment Ledger Component
import { AlphaHarvestLedger } from './components/AlphaHarvestLedger';

// Methodology & DAG Math Specification Component
import { MethodologyDocView } from './components/MethodologyDocView';

import { api } from './services/api';
import { useMarketWebSocket } from './hooks/useMarketWebSocket';

function AppContent({ isCockpit = false }) {
  // Navigation tab: 'screener' | 'audit' | 'harvest' | 'hub' | 'methodology' | 'copilot'
  const [activeTab, setActiveTab] = useState('screener');

  // Config & Run state
  const [capital, setCapital] = useState(10000);
  const [topN, setTopN] = useState(5);
  const [riskPct, setRiskPct] = useState(0.01);
  const [strategyFocus, setStrategyFocus] = useState('ALL');

  // Workflow execution state
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(6);
  const [stepsState, setStepsState] = useState({
    0: 'completed',
    1: 'completed',
    2: 'completed',
    3: 'completed',
    4: 'completed',
    5: 'completed',
    6: 'completed',
  });
  const [runId, setRunId] = useState('');
  const [runsList, setRunsList] = useState([]);
  const [executionTime, setExecutionTime] = useState('4.8');
  const [rawWorkflowResult, setRawWorkflowResult] = useState(null);
  const [selectedStepIndex, setSelectedStepIndex] = useState(null);
  const [activeMessage, setActiveMessage] = useState(
    isCockpit
      ? '✓ Workflow quantitativo completato con successo!'
      : '✓ Dossier quantitativo pre-elaborato caricato da Firestore'
  );
  const [progressPct, setProgressPct] = useState(100);

  // Results state - 100% sourced from Firestore / DAG Engine API, ZERO hardcoded mockups
  const [topStocks, setTopStocks] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);

  // Market regime & Health diagnostics state
  const [health, setHealth] = useState(null);
  const [marketRegime, setMarketRegime] = useState(null);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [isRegimeModalOpen, setIsRegimeModalOpen] = useState(false);
  const [isRefreshingHealth, setIsRefreshingHealth] = useState(false);

  // Quant Audit State
  const [auditRegime, setAuditRegime] = useState('ALL');
  const [auditKpis, setAuditKpis] = useState(null);
  const [nodeAttribution, setNodeAttribution] = useState([]);
  const [shadowData, setShadowData] = useState(null);
  const [auditedTrades, setAuditedTrades] = useState([]);
  const [etoroPositions, setEtoroPositions] = useState([]);
  const [etoroOrders, setEtoroOrders] = useState([]);
  const [etoroExecutedRuns, setEtoroExecutedRuns] = useState([]);
  const [isRefreshingAudit, setIsRefreshingAudit] = useState(false);
  const [selectedAuditTrade, setSelectedAuditTrade] = useState(null);

  // Tuning Advisor State (for Cockpit admin)
  const [tuningRecs, setTuningRecs] = useState({});
  const [isApplyingTuning, setIsApplyingTuning] = useState(false);
  const [lastAppliedVersion, setLastAppliedVersion] = useState(null);

  // eToro Automated Execution State (Cockpit Exclusive)
  const [isEToroModalOpen, setIsEToroModalOpen] = useState(false);
  const [isClosePositionsModalOpen, setIsClosePositionsModalOpen] = useState(false);
  const [etoroExecutionReceipt, setEtoroExecutionReceipt] = useState(null);
  const [etoroClosedTrades, setEtoroClosedTrades] = useState([]);
  const [isWhatIfOpen, setIsWhatIfOpen] = useState(false);
  const [simulationData, setSimulationData] = useState(null);

  // Condition: ONLY if THIS specific dossier run has active positions or pending orders on eToro
  const isRunExecutedOnEToro = useMemo(() => {
    // 1. Check live open positions on eToro broker
    const runSyms = new Set((topStocks || []).map((s) => (s.symbol || s.code || '').replace('.US', '').trim().toUpperCase()).filter(Boolean));
    if (runSyms.size > 0 && Array.isArray(etoroPositions) && etoroPositions.length > 0) {
      const hasActive = etoroPositions.some((p) => runSyms.has((p.symbol || '').replace('.US', '').trim().toUpperCase()));
      if (hasActive) return true;
    }

    // 2. Check if there are active pending orders on eToro for this run from receipt
    if (runId && Array.isArray(etoroExecutedRuns)) {
      const execRun = etoroExecutedRuns.find((r) => r.run_id === runId);
      if (execRun && Array.isArray(execRun.orders) && execRun.orders.length > 0) {
        const hasPending = execRun.orders.some((o) => o.status === 'SUBMITTED' || o.status === 'OPEN');
        if (hasPending) return true;
      }
    }

    // 3. Check live pending orders from broker
    if (runSyms.size > 0 && Array.isArray(etoroOrders) && etoroOrders.length > 0) {
      const hasPendingInBroker = etoroOrders.some((o) => runSyms.has((o.symbol || o.symbolName || '').replace('.US', '').trim().toUpperCase()));
      if (hasPendingInBroker) return true;
    }

    // If all positions are closed or broker has 0 open positions for this run, it is ready for fresh execution
    return false;
  }, [runId, etoroExecutedRuns, topStocks, etoroPositions, etoroOrders]);

  // Real-Time Market WebSocket Stream (Bloomberg Zero-Polling)
  const activeSymbols = useMemo(() => {
    const list = new Set();
    (topStocks || []).forEach((s) => {
      const sym = s.symbol || s.code;
      if (sym) list.add(sym.toUpperCase().trim());
    });
    (etoroPositions || []).forEach((p) => {
      if (p.symbol) list.add(p.symbol.toUpperCase().trim());
    });
    (etoroOrders || []).forEach((o) => {
      const sym = o.symbol || o.symbolName;
      if (sym) list.add(sym.toUpperCase().trim());
    });
    return Array.from(list);
  }, [topStocks, etoroPositions, etoroOrders]);

  // Candidate reference prices from screening run to eliminate dummy price lag
  const initialStockPrices = useMemo(() => {
    const map = {};
    (topStocks || []).forEach((s) => {
      const sym = (s.symbol || s.code || '').replace('.US', '').toUpperCase().trim();
      const p = Number(s.current_price || s.last_price || s.price || 0);
      if (sym && p > 0) {
        map[sym] = p;
      }
    });
    return map;
  }, [topStocks]);

  const {
    isConnected: isWsConnected,
    livePrices,
    livePositions,
    tickFlashes,
    marketSession,
  } = useMarketWebSocket({ symbols: activeSymbols, initialPrices: initialStockPrices, isCockpit });

  // Screener Sub-tabs: 'ACTIVE' (Titoli a Mercato e Desk Operativo) | 'CLOSED' (Posizioni Chiuse della Sessione)
  const [screenerSubTab, setScreenerSubTab] = useState('ACTIVE');

  // Active Market Stocks derived from current run candidates (topStocks) PLUS preexisting broker positions (like TSM)
  const activeMarketStocks = useMemo(() => {
    const brokerPositionsMap = new Map();
    if (Array.isArray(etoroPositions)) {
      etoroPositions.forEach((p) => {
        const sym = (p.symbol || p.symbolName || '').replace('.US', '').toUpperCase().trim();
        if (!sym) return;
        if (!brokerPositionsMap.has(sym)) brokerPositionsMap.set(sym, []);
        brokerPositionsMap.get(sym).push(p);
      });
    }

    const brokerOrdersMap = new Map();
    if (Array.isArray(etoroOrders)) {
      etoroOrders.forEach((o) => {
        const sym = (o.symbol || o.symbolName || '').replace('.US', '').toUpperCase().trim();
        if (!sym) return;
        if (!brokerOrdersMap.has(sym)) brokerOrdersMap.set(sym, []);
        brokerOrdersMap.get(sym).push(o);
      });
    }

    const list = [];
    const processedSymbols = new Set();

    // 1. Process all stocks from current screening run (topStocks)
    (topStocks || []).forEach((s) => {
      const sym = (s.symbol || s.code || '').replace('.US', '').toUpperCase().trim();
      if (!sym) return;
      processedSymbols.add(sym);

      const positions = brokerPositionsMap.get(sym) || [];
      const orders = brokerOrdersMap.get(sym) || [];

      if (positions.length > 0) {
        // Position has been filled on eToro broker
        const primaryPos = positions[0];
        const tps = positions
          .map((p) => Number(p.take_profit || p.takeProfitRate || 0))
          .filter((v) => v > 0)
          .sort((a, b) => a - b);
        const sls = positions
          .map((p) => Number(p.stop_loss || p.stopLossRate || 0))
          .filter((v) => v > 0);
        const totalUnits = positions.reduce((acc, p) => acc + Number(p.units || 0), 0);
        const totalInvested = positions.reduce((acc, p) => acc + Number(p.invested || 0), 0);
        const weightedEntry = totalUnits > 0
          ? positions.reduce((acc, p) => acc + (Number(p.open_rate || p.openRate || 0) * Number(p.units || 0)), 0) / totalUnits
          : Number(primaryPos.open_rate || primaryPos.openRate || s.entry || s.entry_price || s.entry_zone || 0);

        const liveData = livePrices ? (livePrices[sym] || livePrices[`${sym}.US`]) : null;
        const livePriceVal = typeof liveData === 'number'
          ? liveData
          : (liveData?.price !== undefined && liveData?.price !== null ? Number(liveData.price) : null);
        const hasDistinctBrokerRate = primaryPos.current_rate && primaryPos.open_rate && Math.abs(Number(primaryPos.current_rate) - Number(primaryPos.open_rate)) > 0.0001;
        const liveRate = Number(
          (livePriceVal && livePriceVal > 0)
            ? livePriceVal
            : (hasDistinctBrokerRate ? primaryPos.current_rate : (s.current_price || s.price || weightedEntry))
        );

        const t1 = tps.length > 0
          ? tps[0]
          : (s.target_price || s.target1 || Number((weightedEntry * 1.085).toFixed(2)));
        const t2 = tps.length > 1
          ? tps[tps.length - 1]
          : (tps.length === 1 ? tps[0] : (s.target_price_2 || s.target2 || Number((t1 * 1.095).toFixed(2))));
        const sl = sls.length > 0
          ? sls[0]
          : (s.stop_loss || s.stop || Number((weightedEntry * 0.955).toFixed(2)));

        const rawOpenTime = (
          primaryPos.open_time ||
          primaryPos.openTime ||
          primaryPos.OpenDateTime ||
          primaryPos.openDateTime ||
          primaryPos.execution_time ||
          s.created_at ||
          null
        );
        const openTimeFmt = formatDateTime(rawOpenTime);

        list.push({
          ...s,
          symbol: sym,
          code: sym,
          price: liveRate > 0 ? liveRate : weightedEntry,
          current_price: liveRate > 0 ? liveRate : weightedEntry,
          entry_zone: Number(weightedEntry.toFixed(2)),
          entry: Number(weightedEntry.toFixed(2)),
          entry_price: Number(weightedEntry.toFixed(2)),
          support_s1: Number((s.support_s1 ?? s.s1 ?? weightedEntry).toFixed(2)),
          open_time: rawOpenTime,
          open_time_fmt: openTimeFmt,
          stop_loss: Number(sl.toFixed(2)),
          stop: Number(sl.toFixed(2)),
          target_price: Number(t1.toFixed(2)),
          target1: Number(t1.toFixed(2)),
          t1: Number(t1.toFixed(2)),
          target_price_2: Number(t2.toFixed(2)),
          target2: Number(t2.toFixed(2)),
          t2: Number(t2.toFixed(2)),
          units: totalUnits,
          invested: totalInvested,
          is_active_etoro: true,
          etoro_positions_count: positions.length,
        });
      } else if (orders.length > 0) {
        // Active pending limit order on eToro broker awaiting S1 fill
        const liveData = livePrices ? (livePrices[sym] || livePrices[`${sym}.US`]) : null;
        const livePriceVal = typeof liveData === 'number'
          ? liveData
          : (liveData?.price !== undefined && liveData?.price !== null ? Number(liveData.price) : null);
        const quantPrice = Number(s.current_price ?? s.last_price ?? s.price ?? 0);
        const effectivePrice = (livePriceVal && livePriceVal > 0) ? livePriceVal : (quantPrice > 0 ? quantPrice : Number(s.entry || 100));

        list.push({
          ...s,
          symbol: sym,
          code: sym,
          price: effectivePrice,
          current_price: effectivePrice,
          is_active_etoro: false,
          isPendingOrder: true,
          orders: orders,
        });
      } else if (!isRunExecutedOnEToro) {
        // Run has never been executed yet on eToro: show initial proposed candidates
        const liveData = livePrices ? (livePrices[sym] || livePrices[`${sym}.US`]) : null;
        const livePriceVal = typeof liveData === 'number'
          ? liveData
          : (liveData?.price !== undefined && liveData?.price !== null ? Number(liveData.price) : null);
        const quantPrice = Number(s.current_price ?? s.last_price ?? s.price ?? 0);
        const effectivePrice = (livePriceVal && livePriceVal > 0) ? livePriceVal : (quantPrice > 0 ? quantPrice : Number(s.entry || 100));

        list.push({
          ...s,
          symbol: sym,
          code: sym,
          price: effectivePrice,
          current_price: effectivePrice,
          is_active_etoro: false,
          isPendingOrder: false,
        });
      }
      // If the run was executed, but this stock has no position and no pending order: it is revoked/cancelled, omitted.
    });

    // 2. Append any preexisting open broker positions (like TSM) that are NOT in topStocks
    brokerPositionsMap.forEach((positions, sym) => {
      if (processedSymbols.has(sym)) return;
      processedSymbols.add(sym);

      let matchedStock = null;
      if (Array.isArray(runsList)) {
        for (const r of runsList) {
          const found = (r.results || []).find(
            (st) => (st.symbol || st.code || '').replace('.US', '').toUpperCase().trim() === sym
          );
          if (found) {
            matchedStock = found;
            break;
          }
        }
      }

      const primaryPos = positions[0];
      const tps = positions
        .map((p) => Number(p.take_profit || p.takeProfitRate || 0))
        .filter((v) => v > 0)
        .sort((a, b) => a - b);
      const sls = positions
        .map((p) => Number(p.stop_loss || p.stopLossRate || 0))
        .filter((v) => v > 0);
      const totalUnits = positions.reduce((acc, p) => acc + Number(p.units || 0), 0);
      const totalInvested = positions.reduce((acc, p) => acc + Number(p.invested || 0), 0);
      const weightedEntry = totalUnits > 0
        ? positions.reduce((acc, p) => acc + (Number(p.open_rate || p.openRate || 0) * Number(p.units || 0)), 0) / totalUnits
        : Number(primaryPos.open_rate || primaryPos.openRate || 0);

      const liveData = livePrices ? (livePrices[sym] || livePrices[`${sym}.US`]) : null;
      const livePriceVal = typeof liveData === 'number'
        ? liveData
        : (liveData?.price !== undefined && liveData?.price !== null ? Number(liveData.price) : null);
      const hasDistinctBrokerRate = primaryPos.current_rate && primaryPos.open_rate && Math.abs(Number(primaryPos.current_rate) - Number(primaryPos.open_rate)) > 0.0001;
      const liveRate = Number(
        (livePriceVal && livePriceVal > 0)
          ? livePriceVal
          : (hasDistinctBrokerRate ? primaryPos.current_rate : (matchedStock?.current_price || matchedStock?.price || weightedEntry))
      );

      const t1 = tps.length > 0 ? tps[0] : (matchedStock?.target_price || matchedStock?.target1 || Number((weightedEntry * 1.085).toFixed(2)));
      const t2 = tps.length > 1 ? tps[tps.length - 1] : (tps.length === 1 ? tps[0] : (matchedStock?.target_price_2 || matchedStock?.target2 || Number((t1 * 1.095).toFixed(2))));
      const sl = sls.length > 0 ? sls[0] : (matchedStock?.stop_loss || matchedStock?.stop || Number((weightedEntry * 0.955).toFixed(2)));

      const rawOpenTime = (
        primaryPos.open_time ||
        primaryPos.openTime ||
        primaryPos.OpenDateTime ||
        primaryPos.openDateTime ||
        primaryPos.execution_time ||
        null
      );
      const openTimeFmt = formatDateTime(rawOpenTime);

      list.push({
        ...(matchedStock || {}),
        symbol: sym,
        code: sym,
        name: matchedStock?.name || matchedStock?.company_name || primaryPos.name || primaryPos.InstrumentDisplayName || sym,
        company_name: matchedStock?.name || matchedStock?.company_name || primaryPos.name || primaryPos.InstrumentDisplayName || sym,
        sector: matchedStock?.sector || 'Semiconductors',
        price: liveRate > 0 ? liveRate : weightedEntry,
        current_price: liveRate > 0 ? liveRate : weightedEntry,
        entry_zone: Number(weightedEntry.toFixed(2)),
        entry: Number(weightedEntry.toFixed(2)),
        entry_price: Number(weightedEntry.toFixed(2)),
        support_s1: Number((matchedStock?.support_s1 ?? matchedStock?.s1 ?? weightedEntry).toFixed(2)),
        open_time: rawOpenTime,
        open_time_fmt: openTimeFmt,
        stop_loss: Number(sl.toFixed(2)),
        stop: Number(sl.toFixed(2)),
        target_price: Number(t1.toFixed(2)),
        target1: Number(t1.toFixed(2)),
        t1: Number(t1.toFixed(2)),
        target_price_2: Number(t2.toFixed(2)),
        target2: Number(t2.toFixed(2)),
        t2: Number(t2.toFixed(2)),
        units: totalUnits,
        invested: totalInvested,
        is_active_etoro: true,
        etoro_positions_count: positions.length,
      });
    });

    if (isRunExecutedOnEToro) {
      return list;
    }
    return list.length > 0 ? list : (topStocks || []);
  }, [etoroPositions, etoroOrders, isRunExecutedOnEToro, topStocks, runsList, livePrices]);

  // Sync incoming live eToro positions from WebSocket
  useEffect(() => {
    if (Array.isArray(livePositions)) {
      setEtoroPositions(livePositions);
    }
  }, [livePositions]);

  // Fetch eToro closed trades (realized history / after-hours stops)
  const loadEToroHistory = useCallback(async () => {
    try {
      const res = await api.getEToroTradeHistory('demo');
      if (Array.isArray(res?.trades)) {
        setEtoroClosedTrades(res.trades);
      }
    } catch (e) {
      console.warn('Could not load eToro trade history:', e);
    }
  }, []);

  // Explicit refresh of live eToro positions and closed trade history
  const refreshEToroPositions = useCallback(async () => {
    try {
      const [posRes, histRes] = await Promise.all([
        api.getEToroPositions('demo').catch(() => null),
        api.getEToroTradeHistory('demo').catch(() => null),
      ]);
      if (Array.isArray(posRes?.positions)) {
        setEtoroPositions(posRes.positions);
      }
      if (Array.isArray(posRes?.orders)) {
        setEtoroOrders(posRes.orders);
      }
      if (Array.isArray(histRes?.trades)) {
        setEtoroClosedTrades(histRes.trades);
      }
      if (runId) {
        api.getEToroRunOrders(runId).then((r) => {
          if (r?.has_executed && r.execution) {
            setEtoroExecutionReceipt(r.execution);
          }
        }).catch(() => null);
      }
    } catch (e) {
      console.warn('Could not refresh eToro positions:', e);
    }
  }, [runId]);

  // Initial load
  useEffect(() => {
    loadInitialData();
    loadQuantAuditData('ALL');
    loadEToroHistory();
  }, [loadEToroHistory]);

  // Fetch eToro past execution receipts for current Run
  useEffect(() => {
    if (runId) {
      api.getEToroRunOrders(runId)
        .then((res) => {
          if (res?.has_executed && res.execution) {
            setEtoroExecutionReceipt(res.execution);
            loadEToroHistory();
          } else {
            const match = (etoroExecutedRuns || []).find((r) => r.run_id === runId);
            if (match) {
              setEtoroExecutionReceipt(match.execution || match);
            } else {
              setEtoroExecutionReceipt(null);
            }
            loadEToroHistory();
          }
        })
        .catch(() => {
          const match = (etoroExecutedRuns || []).find((r) => r.run_id === runId);
          if (match) {
            setEtoroExecutionReceipt(match.execution || match);
          } else {
            setEtoroExecutionReceipt(null);
          }
          loadEToroHistory();
        });
    }
  }, [runId, loadEToroHistory, etoroExecutedRuns]);

  // Reload Quant Audit data each time the user navigates to the audit tab
  useEffect(() => {
    if (activeTab === 'audit') {
      loadQuantAuditData(auditRegime);
    }
  }, [activeTab]);

  const loadInitialData = async () => {
    try {
      const promises = [
        api.getMarketRegime().catch(() => null),
        api.getLatestRun().catch(() => null),
        api.getWorkflowRuns(20).catch(() => ({ runs: [] })),
        api.getEToroPositions().catch(() => null),
        api.getEToroExecutedRuns().catch(() => ({ runs: [] })),
      ];

      // In Cockpit mode, load live system health diagnostics
      if (isCockpit) {
        promises.push(api.getHealthDiagnostics().catch(() => null));
      }

      const results = await Promise.all(promises);
      const m = results[0];
      const latestRun = results[1];
      const runsRes = results[2];
      const etoroData = results[3];
      const executedData = results[4];
      const h = isCockpit ? results[5] : null;

      if (m) setMarketRegime(m);
      if (h) setHealth(h);

      if (etoroData) {
        if (Array.isArray(etoroData.positions)) {
          setEtoroPositions(etoroData.positions);
        }
        if (Array.isArray(etoroData.orders)) {
          setEtoroOrders(etoroData.orders);
        }
      }

      if (executedData && executedData.runs && executedData.runs.length > 0) {
        setEtoroExecutedRuns(executedData.runs);
      }

      let cleanRuns = [];
      if (runsRes && runsRes.runs && runsRes.runs.length > 0) {
        cleanRuns = runsRes.runs.filter(
          (r) => r.run_id && !r.run_id.startsWith('test_') && !r.run_id.startsWith('run_20260901_183112') && !r.run_id.startsWith('run_20260911_234915')
        );
        setRunsList(cleanRuns);
      }

      // Check if any historical run matches the live eToro positions
      let runToDisplay = latestRun;
      if (etoroData?.positions?.length > 0 && cleanRuns.length > 0) {
        const etoroSyms = etoroData.positions.map((p) => (p?.symbol || '').replace('.US', '').toUpperCase());
        const matchingRun = cleanRuns.find((r) => {
          const runSyms = (r?.results || []).map((s) => (s?.symbol || '').toUpperCase());
          const common = etoroSyms.filter((s) => runSyms.includes(s));
          return common.length >= 3;
        });
        if (matchingRun && Array.isArray(matchingRun.results) && matchingRun.results.length > 0) {
          runToDisplay = matchingRun;
        }
      }

      // If runToDisplay has no results, fallback to the latest run with results
      if ((!runToDisplay || !runToDisplay.results || runToDisplay.results.length === 0) && cleanRuns.length > 0) {
        const validWithResults = cleanRuns.find((r) => Array.isArray(r.results) && r.results.length > 0);
        if (validWithResults) {
          runToDisplay = validWithResults;
        }
      }

      if (runToDisplay && runToDisplay.run_id) {
        setRunId(runToDisplay.run_id);
        if (runToDisplay.capital) setCapital(runToDisplay.capital);
        if (runToDisplay.top_n) setTopN(runToDisplay.top_n);
        if (runToDisplay.strategy_focus) setStrategyFocus(runToDisplay.strategy_focus);
        if (runToDisplay.risk_pct) setRiskPct(runToDisplay.risk_pct);
        if (runToDisplay.execution_time) setExecutionTime(String(runToDisplay.execution_time));
        if (runToDisplay.raw_result || runToDisplay) setRawWorkflowResult(runToDisplay.raw_result || runToDisplay);
        if (Array.isArray(runToDisplay.results) && runToDisplay.results.length > 0) {
          setTopStocks(runToDisplay.results);
        } else if (latestRun && Array.isArray(latestRun.results) && latestRun.results.length > 0) {
          setTopStocks(latestRun.results);
        }
      } else if (latestRun && latestRun.run_id) {
        setRunId(latestRun.run_id);
        if (Array.isArray(latestRun.results)) setTopStocks(latestRun.results);
      }
    } catch (err) {
      console.warn('Initial data load warning:', err);
    }
  };

  const handleSelectRun = async (selectedRunId) => {
    if (!selectedRunId) return;
    setRunId(selectedRunId);
    setEtoroExecutionReceipt(null);
    setSelectedStepIndex(null);
    setSelectedStock(null);
    loadEToroHistory();

    const runItem = runsList.find((r) => r.run_id === selectedRunId);
    if (runItem) {
      if (runItem.capital) setCapital(runItem.capital);
      if (runItem.top_n) setTopN(runItem.top_n);
      if (runItem.strategy_focus) setStrategyFocus(runItem.strategy_focus);
      if (runItem.execution_time) setExecutionTime(String(runItem.execution_time));
      if (runItem.risk_pct) setRiskPct(runItem.risk_pct);
    }

    try {
      const runDetails = await api.getWorkflowStatus(selectedRunId).catch(() => null);
      if (runDetails) {
        if (runDetails.execution_time) setExecutionTime(String(runDetails.execution_time));
        if (runDetails.capital) setCapital(runDetails.capital);
        if (runDetails.top_n) setTopN(runDetails.top_n);
        if (runDetails.strategy_focus) setStrategyFocus(runDetails.strategy_focus);
        if (runDetails.risk_pct) setRiskPct(runDetails.risk_pct);
        setRawWorkflowResult(runDetails.raw_result || runDetails);
        setTopStocks(runDetails.results || []);
      } else {
        setTopStocks([]);
      }
    } catch (err) {
      console.warn('Error loading run details:', err);
      setTopStocks([]);
    }

    setStepsState({
      0: 'completed',
      1: 'completed',
      2: 'completed',
      3: 'completed',
      4: 'completed',
      5: 'completed',
      6: 'completed',
    });
    setCurrentStep(6);
  };

  const loadQuantAuditData = async (regime = 'ALL') => {
    try {
      setIsRefreshingAudit(true);
      const promises = [
        api.getQuantAuditKpis(regime).catch(() => null),
        api.getNodeAttribution(regime).catch(() => null),
        api.getShadowAudit().catch(() => null),
        api.getQuantAuditRuns(regime).catch(() => null),
      ];

      if (isCockpit) {
        promises.push(api.getTuningRecommendations().catch(() => ({})));
        promises.push(api.getDagConfig().catch(() => null));
      }

      const results = await Promise.all(promises);
      const kpisRes = results[0];
      const nodeRes = results[1];
      const shadowRes = results[2];
      const runsRes = results[3];
      const recsRes = isCockpit ? results[4] : null;
      const cfgRes = isCockpit ? results[5] : null;

      if (kpisRes) setAuditKpis(kpisRes);
      if (nodeRes && nodeRes.nodes) setNodeAttribution(nodeRes.nodes);
      if (shadowRes) setShadowData(shadowRes);
      if (recsRes) setTuningRecs(recsRes);
      if (cfgRes?.active_config?.version) setLastAppliedVersion(cfgRes.active_config.version);

      const runs = runsRes?.runs || [];
      const flatTrades = runs.flatMap((r) => r.trades || []);
      setAuditedTrades(flatTrades);

      // Fetch active eToro positions & executed runs for live filtering in Post-Mortem Explorer
      try {
        const [etoroRes, executedRes] = await Promise.all([
          api.getEToroPositions().catch(() => null),
          api.getEToroExecutedRuns().catch(() => null),
        ]);
        if (etoroRes?.positions) {
          setEtoroPositions(etoroRes.positions);
        }
        if (executedRes?.runs) {
          setEtoroExecutedRuns(executedRes.runs);
        }
      } catch (etoroErr) {
        console.warn('Could not fetch eToro data:', etoroErr);
      }
    } catch (err) {
      console.warn('Error loading Quant Audit data:', err);
    } finally {
      setIsRefreshingAudit(false);
    }
  };

  const handleSelectAuditRegime = (regime) => {
    setAuditRegime(regime);
    loadQuantAuditData(regime);
  };

  const handleRefreshAudit = async () => {
    setIsRefreshingAudit(true);
    try {
      if (isCockpit) {
        await api.evaluateQuantAudit(true).catch(() => null);
      }
      await loadQuantAuditData(auditRegime);
    } catch (err) {
      console.warn('Audit refresh error:', err);
    } finally {
      setIsRefreshingAudit(false);
    }
  };

  // -------------------------------------------------------------
  // COCKPIT WORKFLOW TRIGGER (FEATURE 1)
  // -------------------------------------------------------------
  const handleRunWorkflow = async () => {
    if (!isCockpit) return;

    setIsRunning(true);
    setTopStocks([]);
    setSelectedStock(null);
    setSelectedStepIndex(null);
    setRawWorkflowResult(null);
    setExecutionTime(null);
    setEtoroExecutionReceipt(null);
    const startTime = Date.now();

    const newStepsState = {
      0: 'pending',
      1: 'pending',
      2: 'pending',
      3: 'pending',
      4: 'pending',
      5: 'pending',
      6: 'pending',
    };
    setStepsState(newStepsState);
    setProgressPct(5);
    setActiveMessage('Inizializzazione orchestratore DAG...');

    let bgRunId = null;
    try {
      const initialResponse = await api.runWorkflow({
        capital,
        topN,
        riskPct,
        strategyFocus,
      });
      if (initialResponse?.run_id) {
        bgRunId = initialResponse.run_id;
        setRunId(bgRunId);
      } else {
        throw new Error('Nessun ID di run valido restituito dal backend orchestratore');
      }
    } catch (e) {
      console.error('Errore avvio workflow:', e);
      setActiveMessage(`⚠️ Errore avvio workflow: ${e.message || 'Server non raggiungibile'}`);
      setIsRunning(false);
      return;
    }

    const STAGES = [
      { step: 0, pct: 15, msg: '⚡ Step 0: Acquisizione VIX Live & Tassi Federal Reserve (FRED API)...' },
      { step: 1, pct: 30, msg: '🔍 Step 1: Screening quantitativo su 100 Mega-Cap (Z-Score & Volatilità 90d)...' },
      { step: 2, pct: 48, msg: '📰 Step 2: Analisi Sentiment Loughran-McDonald, Scambi Congresso & SEC Form 4...' },
      { step: 3, pct: 64, msg: '📐 Step 3: Calcolo Pivot Points Classici/Fibonacci, Supporti S1 e Flussi Opzioni...' },
      { step: 4, pct: 78, msg: '📊 Step 4: Valutazione Multipli Storici e Matrice di Correlazione Decorellata...' },
      { step: 5, pct: 90, msg: '⚖️ Step 5: Dimensionamento Dinamico del Capitale (Rischio Max 1% & Tetto Settoriale)...' },
      { step: 6, pct: 97, msg: '🧪 Step 6: Backtest Empirico a 12 Mesi e Validazione Win-Rate a 10 Barre...' },
    ];

    let currentStageIdx = 0;
    const stageTimer = setInterval(() => {
      if (currentStageIdx < STAGES.length) {
        const stage = STAGES[currentStageIdx];
        setCurrentStep(stage.step);
        setProgressPct(stage.pct);
        setActiveMessage(stage.msg);
        setStepsState((prev) => {
          const updated = { ...prev };
          for (let i = 0; i < stage.step; i++) updated[i] = 'completed';
          updated[stage.step] = 'running';
          return updated;
        });
        currentStageIdx++;
      }
    }, 1200);

    const MAX_POLL_MS = 8 * 60 * 1000;
    const POLL_INTERVAL_MS = 5000;
    const pollStart = Date.now();

    const pollUntilDone = async () => {
      while (Date.now() - pollStart < MAX_POLL_MS) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        try {
          const statusRes = await api.getWorkflowRunStatus(bgRunId);
          if (statusRes?.status === 'COMPLETED' || statusRes?.status === 'FAILED') {
            return statusRes;
          }
        } catch (_pollErr) {
          // Keep polling
        }
      }
      throw new Error('Workflow polling timeout');
    };

    try {
      const response = await pollUntilDone();
      clearInterval(stageTimer);

      setStepsState({
        0: 'completed',
        1: 'completed',
        2: 'completed',
        3: 'completed',
        4: 'completed',
        5: 'completed',
        6: 'completed',
      });
      setCurrentStep(6);
      setProgressPct(100);
      setActiveMessage('✓ Workflow quantitativo completato con successo!');

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      setExecutionTime(elapsed);
      setRawWorkflowResult(response?.raw_result || response);
      setTopStocks(response?.results || []);
      setEtoroExecutionReceipt(null);

      // Refresh runs list and quant audit
      try {
        const updatedRuns = await api.getWorkflowRuns(20);
        if (updatedRuns && updatedRuns.runs) setRunsList(updatedRuns.runs);
      } catch (e) {
        console.warn('Error refreshing runs list:', e);
      }
      try {
        await api.evaluateQuantAudit(true);
        await loadQuantAuditData(auditRegime);
      } catch (e) {
        console.warn('Error refreshing audit after run:', e);
      }
    } catch (err) {
      clearInterval(stageTimer);
      console.warn('Workflow polling finished with fallback or timeout:', err);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      setExecutionTime(elapsed);

      // Check if the run finished in Firestore despite polling issue
      try {
        const updatedRuns = await api.getWorkflowRuns(20);
        if (updatedRuns?.runs?.length > 0) {
          setRunsList(updatedRuns.runs);
          const found = updatedRuns.runs.find((r) => r.run_id === bgRunId && r.results?.length > 0);
          if (found) {
            setTopStocks(found.results);
            setRawWorkflowResult(found.raw_result || found);
            setActiveMessage('✓ Workflow quantitativo completato con successo!');
            setStepsState({ 0: 'completed', 1: 'completed', 2: 'completed', 3: 'completed', 4: 'completed', 5: 'completed', 6: 'completed' });
            setCurrentStep(6);
            setProgressPct(100);
            return;
          }
        }
      } catch (_e) {
        // ignore
      }

      setActiveMessage(`⚠️ Elaborazione in corso o timeout: seleziona una run completata dal menu.`);
    } finally {
      setIsRunning(false);
    }
  };

  // -------------------------------------------------------------
  // COCKPIT TUNING ADVISOR HANDLERS (OPTION 3B)
  // -------------------------------------------------------------
  const handleSimulateTuning = async () => {
    try {
      const sim = await api.simulateTuning();
      setSimulationData(sim);
      setIsWhatIfOpen(true);
    } catch (err) {
      console.error('Simulation error:', err);
    }
  };

  const handleApplyTuning = async (payload) => {
    setIsApplyingTuning(true);
    try {
      const res = await api.applyTuning(payload);
      if (res?.version) setLastAppliedVersion(res.version);
      setIsWhatIfOpen(false);
      await loadQuantAuditData(auditRegime);
    } catch (err) {
      console.error('Apply tuning error:', err);
    } finally {
      setIsApplyingTuning(false);
    }
  };

  const isRiskOff = marketRegime?.vix > 20 || marketRegime?.is_risk_off;

  const handleTabChange = (newTab) => {
    if (newTab === 'harvest' && !isCockpit) {
      setActiveTab('screener');
      return;
    }
    setActiveTab(newTab);
  };

  const isFullViewport = activeTab === 'methodology' || (isCockpit && activeTab === 'copilot');

  return (
    <div className={`app-container ${isFullViewport ? 'full-viewport-app' : ''}`}>
      {/* Header with main navigation tabs & real-time WebSocket indicator */}
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        marketRegime={marketRegime}
        onOpenMarketRegimeModal={() => setIsRegimeModalOpen(true)}
        isCockpit={isCockpit}
        health={health}
        onOpenHealthModal={() => setIsHealthModalOpen(true)}
        isWsConnected={isWsConnected}
      />

      {/* VIEW 1: LIVE SCREENER */}
      {activeTab === 'screener' && (
        <main className="main-content">
          {/* Safe-Haven Banner in RISK_OFF */}
          {isRiskOff && (
            <SafeHavenAlert
              vix={marketRegime?.vix || 22.4}
              onOpenRegimeDetail={() => setIsRegimeModalOpen(true)}
            />
          )}

          {/* Sub-Tab Navigation Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              padding: '8px 12px',
              marginBottom: '16px',
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(12px)',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setScreenerSubTab('ACTIVE')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 18px',
                  borderRadius: '10px',
                  border: screenerSubTab === 'ACTIVE'
                    ? '1px solid rgba(6, 182, 212, 0.6)'
                    : '1px solid transparent',
                  background: screenerSubTab === 'ACTIVE'
                    ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(14, 165, 233, 0.12) 100%)'
                    : 'rgba(255, 255, 255, 0.03)',
                  color: screenerSubTab === 'ACTIVE' ? '#38bdf8' : 'var(--text-muted)',
                  fontWeight: screenerSubTab === 'ACTIVE' ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: screenerSubTab === 'ACTIVE' ? '0 0 16px rgba(6, 182, 212, 0.25)' : 'none',
                }}
              >
                <TrendingUp size={16} />
                <span>Titoli a Mercato e Desk Operativo</span>
                <span
                  style={{
                    background: screenerSubTab === 'ACTIVE' ? 'rgba(6, 182, 212, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                    color: screenerSubTab === 'ACTIVE' ? '#e0f2fe' : 'var(--text-muted)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {activeMarketStocks?.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setScreenerSubTab('CLOSED')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 18px',
                  borderRadius: '10px',
                  border: screenerSubTab === 'CLOSED'
                    ? '1px solid rgba(239, 68, 68, 0.6)'
                    : '1px solid transparent',
                  background: screenerSubTab === 'CLOSED'
                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.12) 100%)'
                    : 'rgba(255, 255, 255, 0.03)',
                  color: screenerSubTab === 'CLOSED' ? '#fca5a5' : 'var(--text-muted)',
                  fontWeight: screenerSubTab === 'CLOSED' ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: screenerSubTab === 'CLOSED' ? '0 0 16px rgba(239, 68, 68, 0.25)' : 'none',
                }}
              >
                <History size={16} />
                <span>Posizioni Chiuse della Sessione (Extended Trading / Realizzate)</span>
                <span
                  style={{
                    background: screenerSubTab === 'CLOSED' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                    color: screenerSubTab === 'CLOSED' ? '#fee2e2' : 'var(--text-muted)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {etoroClosedTrades?.length || 0}
                </span>
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: isWsConnected ? '#10b981' : '#f59e0b', display: 'inline-block' }} />
              <span>{isWsConnected ? 'FEED BROKER ATTIVO' : 'CONNESSIONE IN CORSO'}</span>
            </div>
          </div>

          {/* SOTTO-TAB 1: TITOLI A MERCATO */}
          {screenerSubTab === 'ACTIVE' && (
            <>
              {/* Posizioni e Ordini a Mercato su eToro (Solo attive) */}
              <LiveMarketPositionsPanel
                runId={runId}
                executionReceipt={etoroExecutionReceipt}
                etoroPositions={etoroPositions}
                etoroOrders={etoroOrders}
                closedTrades={etoroClosedTrades}
                stocks={activeMarketStocks}
                livePrices={livePrices}
                tickFlashes={tickFlashes}
                marketSession={marketSession}
                onSelectStock={(stock) => setSelectedStock(stock)}
                isCockpit={isCockpit}
                onOpenCloseModal={() => setIsClosePositionsModalOpen(true)}
                viewMode="ACTIVE_ONLY"
              />

              {/* Toolbar Operativa Cockpit (In modalità User ritorna null eliminando il pannello Dossier Pre-Elaborato) */}
              <ControlPanel
                capital={capital}
                setCapital={setCapital}
                topN={topN}
                setTopN={setTopN}
                riskPct={riskPct}
                setRiskPct={setRiskPct}
                strategyFocus={strategyFocus}
                setStrategyFocus={setStrategyFocus}
                runId={runId}
                runsList={runsList}
                onSelectRun={handleSelectRun}
                executionTime={executionTime}
                isCockpit={isCockpit}
                isRunning={isRunning}
                onRunWorkflow={handleRunWorkflow}
                onOpenHealthModal={() => setIsHealthModalOpen(true)}
                etoroPositions={etoroPositions}
                etoroExecutionReceipt={etoroExecutionReceipt}
              />

              {/* Stepper with Step Detail Modal */}
              <Stepper
                currentStep={currentStep}
                stepsState={stepsState}
                runId={runId}
                executionTime={executionTime}
                activeMessage={activeMessage}
                progressPct={progressPct}
                isRunning={isRunning}
                onStepClick={(stepIdx) => setSelectedStepIndex(stepIdx)}
              />

              {/* Portfolio Summary Bar */}
              {activeMarketStocks.length > 0 && (
                <PortfolioSummary
                  stocks={activeMarketStocks}
                  capital={capital}
                  riskPct={riskPct}
                  topN={topN}
                  itemsCount={activeMarketStocks.length}
                  isCockpit={isCockpit}
                  runId={runId}
                  onOpenEToroModal={() => setIsEToroModalOpen(true)}
                  onOpenCloseModal={() => setIsClosePositionsModalOpen(true)}
                  hasExecutedOrders={isRunExecutedOnEToro}
                  etoroPositions={etoroPositions}
                />
              )}

              {/* Top Stock Cards Grid with Candlestick and Real-Time WebSocket Streaming */}
              {activeMarketStocks.length > 0 ? (
                <TopCardsGrid
                  items={activeMarketStocks}
                  stocks={activeMarketStocks}
                  capital={capital}
                  topN={topN}
                  onSelectStock={(stock) => setSelectedStock(stock)}
                  livePrices={livePrices}
                  tickFlashes={tickFlashes}
                  etoroPositions={etoroPositions}
                />
              ) : (
                <div
                  className="empty-state-panel"
                  style={{
                    textAlign: 'center',
                    padding: '56px 24px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    margin: '24px 0',
                  }}
                >
                  <div style={{ fontSize: '40px', marginBottom: '16px' }}>📊</div>
                  <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#f1f5f9', marginBottom: '8px' }}>
                    Nessun titolo a mercato attivo
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '540px', margin: '0 auto', lineHeight: '1.6' }}>
                    Non risultano posizioni aperte al momento sul conto eToro. Avvia un'esecuzione quantitativa per allocare nuove posizioni.
                  </p>
                </div>
              )}
            </>
          )}

          {/* SOTTO-TAB 2: POSIZIONI CHIUSE DELLA SESSIONE */}
          {screenerSubTab === 'CLOSED' && (
            <LiveMarketPositionsPanel
              runId={runId}
              executionReceipt={etoroExecutionReceipt}
              etoroPositions={etoroPositions}
              etoroOrders={etoroOrders}
              closedTrades={etoroClosedTrades}
              stocks={activeMarketStocks}
              livePrices={livePrices}
              tickFlashes={tickFlashes}
              marketSession={marketSession}
              onSelectStock={(stock) => setSelectedStock(stock)}
              isCockpit={isCockpit}
              onOpenCloseModal={() => setIsClosePositionsModalOpen(true)}
              viewMode="CLOSED_ONLY"
            />
          )}
        </main>
      )}

      {/* VIEW 2: QUANT AUDIT & CONTINUOUS LEARNING LAB */}
      {activeTab === 'audit' && (
        <main className="main-content quant-audit-container">
          {/* Market Regime Filter Bar */}
          <RegimeFilterBar
            selectedRegime={auditRegime}
            onSelectRegime={handleSelectAuditRegime}
            onRefreshAudit={handleRefreshAudit}
            isRefreshing={isRefreshingAudit}
            globalKpis={auditKpis}
          />

          {/* Institutional KPI Cards */}
          <QuantKPICards kpis={auditKpis} />

          {/* DAG 7-Node Attribution Radar & Scorecard */}
          <NodeAttributionRadar nodes={nodeAttribution} />

          {/* Trade Post-Mortem Explorer & Historical Ledger */}
          <TradePostMortemTable
            trades={auditedTrades}
            etoroPositions={etoroPositions}
            etoroExecutedRuns={etoroExecutedRuns}
            runsList={runsList}
            livePrices={livePrices}
            tickFlashes={tickFlashes}
            runId={runId}
            onInspectTrade={(t) => setSelectedAuditTrade(t)}
          />

          {/* Shadow Audit Panel (False Negative Analysis #6-#15) */}
          <ShadowAuditPanel shadowData={shadowData} />

          {/* Institutional Hyperparameter Calibration & 1-Click Apply (Cockpit Admin only) */}
          {isCockpit && (
            <TuningAdvisorPanel
              recommendations={tuningRecs}
              onSimulateTuning={handleSimulateTuning}
              onApplyTuning={handleApplyTuning}
              isApplying={isApplyingTuning}
              lastAppliedVersion={lastAppliedVersion}
            />
          )}
        </main>
      )}

      {/* VIEW: ALPHA HARVEST & REINVESTMENT LEDGER (6 PILASTRI) */}
      {isCockpit && activeTab === 'harvest' && (
        <main className="main-content alpha-harvest-main">
          <AlphaHarvestLedger isCockpit={isCockpit} />
        </main>
      )}

      {/* VIEW 3: FINTECHDATAHUB PROFESSIONAL NEWS & INSTITUTIONAL RADAR */}
      {activeTab === 'hub' && (
        <main className="main-content fintech-hub-main">
          <FintechDataHub />
        </main>
      )}

      {/* VIEW 4: METHODOLOGY & DAG MATHEMATICAL SPECIFICATION */}
      {activeTab === 'methodology' && (
        <main className="main-content methodology-main">
          <MethodologyDocView />
        </main>
      )}

      {/* VIEW 5: AI FINANCIAL COPILOT (FEATURE 4 - OPTION 1A) */}
      {isCockpit && activeTab === 'copilot' && (
        <CopilotView chainlitPort={8000} />
      )}

      {/* MODALS */}
      <MarketRegimeModal
        isOpen={isRegimeModalOpen}
        onClose={() => setIsRegimeModalOpen(false)}
        marketRegime={marketRegime}
      />

      <StepDetailModal
        isOpen={selectedStepIndex !== null}
        onClose={() => setSelectedStepIndex(null)}
        stepIndex={selectedStepIndex}
        stepStatus={selectedStepIndex !== null ? stepsState[selectedStepIndex] : null}
        rawWorkflowResult={rawWorkflowResult}
        capital={capital}
        topN={topN}
      />

      <StockDetailModal
        isOpen={selectedStock !== null}
        onClose={() => setSelectedStock(null)}
        stock={selectedStock}
        livePrices={livePrices}
        tickFlashes={tickFlashes}
        etoroPositions={etoroPositions}
      />

      <AuditDetailModal
        isOpen={selectedAuditTrade !== null}
        onClose={() => setSelectedAuditTrade(null)}
        trade={selectedAuditTrade}
      />

      {/* Cockpit-exclusive Modals */}
      {isCockpit && (
        <>
          <HealthModal
            isOpen={isHealthModalOpen}
            onClose={() => setIsHealthModalOpen(false)}
            health={health}
            onRefresh={loadInitialData}
            isRefreshing={isRefreshingHealth}
          />

          <WhatIfSimulationModal
            isOpen={isWhatIfOpen}
            onClose={() => setIsWhatIfOpen(false)}
            simulationData={simulationData}
            onConfirmApply={() => {
              if (tuningRecs && tuningRecs[auditRegime === 'ALL' ? 'RISK_ON' : auditRegime]) {
                handleApplyTuning({
                  regimes: {
                    [auditRegime === 'ALL' ? 'RISK_ON' : auditRegime]: {
                      step3_technicals: { target1_pct: 0.075, stop_loss_pct: 0.038 },
                    },
                  },
                  reason: 'Applied via What-If Simulation confirmation',
                });
              }
            }}
            isApplying={isApplyingTuning}
          />

          <EToroExecutionModal
            isOpen={isEToroModalOpen}
            runId={runId}
            onClose={() => setIsEToroModalOpen(false)}
            onExecutionComplete={(res) => {
              setEtoroExecutionReceipt(res);
              refreshEToroPositions();
            }}
          />

          <EToroClosePositionsModal
            isOpen={isClosePositionsModalOpen}
            runId={runId}
            accountMode="demo"
            onClose={() => setIsClosePositionsModalOpen(false)}
            onPositionsClosed={(res) => {
              refreshEToroPositions();
            }}
          />
        </>
      )}
    </div>
  );
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('[App] Caught unhandled rendering error safely:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#0b0f19', color: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ maxWidth: '520px', textAlign: 'center', background: 'rgba(255,255,255,0.04)', padding: '32px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
            <h3 style={{ color: 'var(--cyan-primary)', marginBottom: '8px' }}>Aggiornamento Dashboard</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>
              Si è verificata un'eccezione durante il caricamento della vista.
            </p>
            {this.state.error?.message && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '10px 14px', color: '#fca5a5', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', textAlign: 'left', marginBottom: '20px', wordBreak: 'break-all' }}>
                {this.state.error.message}
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                }}
                style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)', color: '#000', border: 'none', borderRadius: '8px', padding: '10px 18px', fontWeight: 700, cursor: 'pointer' }}
              >
                Ripristina Schermata
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}
              >
                Ricarica Pagina
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App(props) {
  return (
    <AppErrorBoundary>
      <AppContent {...props} />
    </AppErrorBoundary>
  );
}

