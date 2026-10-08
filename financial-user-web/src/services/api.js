/**
 * API Service Client for Financial Cockpit Backend Bridge
 */

const API_BASE = '/api';

export const api = {
  /**
   * Run full system health diagnostics across all 27 financial tools.
   */
  async getHealthDiagnostics() {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
      return await res.json();
    } catch (err) {
      console.error('System health check error:', err);
      throw err;
    }
  },

  /**
   * Fetch current market regime (VIX, 10Y Yield, Risk status).
   */
  async getMarketRegime() {
    try {
      const res = await fetch(`${API_BASE}/market/regime`);
      if (!res.ok) throw new Error('Failed to get market regime');
      return await res.json();
    } catch (err) {
      console.error('Market regime fetch error:', err);
      throw err;
    }
  },

  /**
   * Start 7-node quantitative screening DAG.
   * Returns immediately with {run_id, status:'RUNNING'}.
   * Poll getWorkflowRunStatus(run_id) for completion.
   */
  async runWorkflow(params = {}) {
    const res = await fetch(`${API_BASE}/workflow/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        capital: params.capital || 10000,
        top_n: params.topN || 5,
        risk_pct: params.riskPct || 0.01,
        symbols_limit: params.symbolsLimit || 50,
        strategy_focus: params.strategyFocus || 'ALL',
      }),
    });
    if (!res.ok) throw new Error(`Workflow run failed: ${res.statusText}`);
    return await res.json();
  },

  /**
   * Poll the status of a running workflow by run_id.
   */
  async getWorkflowRunStatus(runId) {
    const res = await fetch(`${API_BASE}/workflow/runs/${encodeURIComponent(runId)}`);
    if (!res.ok) throw new Error(`Status poll failed: ${res.statusText}`);
    return await res.json();
  },

  /**
   * Fetch recent workflow runs history (last 10 runs).
   */
  async getWorkflowRuns(limit = 10) {
    try {
      const res = await fetch(`${API_BASE}/workflow/runs?limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch workflow runs');
      return await res.json();
    } catch (err) {
      console.warn('Error loading workflow runs history:', err);
      return { runs: [] };
    }
  },

  /**
   * Poll workflow execution status or get run details by run_id.
   */
  async getWorkflowStatus(runId) {
    const res = await fetch(`${API_BASE}/workflow/runs/${runId}`);
    if (!res.ok) throw new Error(`Status check failed: ${res.statusText}`);
    return await res.json();
  },

  /**
   * Get latest completed workflow run results.
   */
  async getLatestRun() {
    const res = await fetch(`${API_BASE}/workflow/latest`);
    if (!res.ok) return null;
    return await res.json();
  },

  /**
   * Quant Audit: Fetch audited runs.
   */
  async getQuantAuditRuns(regime = 'ALL') {
    const res = await fetch(`${API_BASE}/quant-audit/runs?regime=${encodeURIComponent(regime)}`);
    if (!res.ok) throw new Error('Failed to fetch quant audit runs');
    return await res.json();
  },

  /**
   * Quant Audit: Fresh evaluation against market reality.
   */
  async evaluateQuantAudit(forceRefresh = true) {
    const res = await fetch(`${API_BASE}/quant-audit/evaluate?force_refresh=${forceRefresh}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to evaluate quant audit');
    return await res.json();
  },

  /**
   * Quant Audit: High-level KPIs.
   */
  async getQuantAuditKpis(regime = 'ALL') {
    const res = await fetch(`${API_BASE}/quant-audit/kpis?regime=${encodeURIComponent(regime)}`);
    if (!res.ok) throw new Error('Failed to fetch quant audit KPIs');
    return await res.json();
  },

  /**
   * Quant Audit: 7-Node DAG Attribution.
   */
  async getNodeAttribution(regime = 'ALL') {
    const res = await fetch(`${API_BASE}/quant-audit/node-attribution?regime=${encodeURIComponent(regime)}`);
    if (!res.ok) throw new Error('Failed to fetch node attribution');
    return await res.json();
  },

  /**
   * Quant Audit: Shadow Audit on discarded candidates (#6-#15).
   */
  async getShadowAudit() {
    const res = await fetch(`${API_BASE}/quant-audit/shadow-audit`);
    if (!res.ok) throw new Error('Failed to fetch shadow audit');
    return await res.json();
  },

  /**
   * Quant Audit: Tuning recommendations.
   */
  async getTuningRecommendations() {
    const res = await fetch(`${API_BASE}/quant-audit/tuning-recommendations`);
    if (!res.ok) throw new Error('Failed to fetch tuning recommendations');
    return await res.json();
  },

  /**
   * Quant Audit: Simulate What-If tuning impact on equity curve.
   */
  async simulateTuning(params = {}) {
    const res = await fetch(`${API_BASE}/quant-audit/simulate-tuning`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Failed to simulate tuning');
    return await res.json();
  },

  /**
   * Quant Audit: Apply hyperparameter calibrations (1-Click Apply).
   */
  async applyTuning(payload) {
    const res = await fetch(`${API_BASE}/quant-audit/apply-tuning`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to apply tuning');
    return await res.json();
  },

  /**
   * Quant Audit: Active DAG config and version history.
   */
  async getDagConfig() {
    const res = await fetch(`${API_BASE}/quant-audit/config`);
    if (!res.ok) throw new Error('Failed to fetch DAG config');
    return await res.json();
  },

  /**
   * FintechDataHub: Fetch paginated news stream with live quote context and sentiment.
   */
  async getHubStream(params = {}) {
    const qParams = new URLSearchParams();
    if (params.ticker) qParams.set('ticker', params.ticker);
    if (params.sector) qParams.set('sector', params.sector);
    if (params.catalyst) qParams.set('catalyst', params.catalyst);
    if (params.sentiment) qParams.set('sentiment', params.sentiment);
    if (params.q) qParams.set('q', params.q);
    if (params.page) qParams.set('page', params.page);
    if (params.limit) qParams.set('limit', params.limit);
    if (params.forceRefresh) qParams.set('force_refresh', 'true');

    const res = await fetch(`${API_BASE}/hub/stream?${qParams.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch news stream');
    return await res.json();
  },

  /**
   * FintechDataHub: Fetch trending tickers by news velocity & buzz.
   */
  async getHubTrending() {
    const res = await fetch(`${API_BASE}/hub/trending`);
    if (!res.ok) throw new Error('Failed to fetch trending buzz');
    return await res.json();
  },

  /**
   * FintechDataHub: Fetch aggregated sector sentiment heatmap.
   */
  async getHubSectorPulse() {
    const res = await fetch(`${API_BASE}/hub/sector-pulse`);
    if (!res.ok) throw new Error('Failed to fetch sector pulse');
    return await res.json();
  },

  /**
   * FintechDataHub: Fetch unified institutional catalysts (SEC Form 4, Congress, Macro).
   */
  async getHubCatalysts() {
    const res = await fetch(`${API_BASE}/hub/catalysts`);
    if (!res.ok) throw new Error('Failed to fetch institutional catalysts');
    return await res.json();
  },

  /**
   * FintechDataHub: Fetch 1-year price-sentiment correlation for a ticker.
   */
  async getHubCorrelation(ticker, timeframe = '1Y') {
    const res = await fetch(`${API_BASE}/hub/correlation/${encodeURIComponent(ticker)}?timeframe=${encodeURIComponent(timeframe)}`);
    if (!res.ok) throw new Error('Failed to fetch price-sentiment correlation');
    return await res.json();
  },

  /**
   * FintechDataHub: Fetch major market indices with sparklines.
   */
  async getMarketIndices() {
    try {
      const res = await fetch(`${API_BASE}/market/indices`);
      if (!res.ok) throw new Error('Failed to fetch market indices');
      return await res.json();
    } catch (err) {
      console.error('Error fetching market indices:', err);
      return { indices: [], market_status: 'CLOSED', error: err.message };
    }
  },

  /**
   * Fetch historical daily candlestick and indicator data for a symbol and period.
   */
  async getStockHistory(symbol, period = '6mo') {
    const res = await fetch(`${API_BASE}/stock/${encodeURIComponent(symbol)}/history?period=${encodeURIComponent(period)}`);
    if (!res.ok) throw new Error('Failed to fetch stock history');
    return await res.json();
  },

  /**
   * Fetch lightweight sparklines and quotes for multiple symbols in a single batch call.
   */
  async getBatchSparklines(symbols, period = '1d', interval = '5m') {
    const res = await fetch(`${API_BASE}/market/batch-sparklines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols, period, interval }),
    });
    if (!res.ok) throw new Error('Failed to fetch batch sparklines');
    return await res.json();
  },

  /**
   * FintechDataHub: Invalidate cache and trigger fresh data fetch.
   */
  async refreshHubNews() {
    const res = await fetch(`${API_BASE}/hub/refresh`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to refresh hub data');
    return await res.json();
  },

  /**
   * eToro Automated Trading: Run pre-flight liquidity and candidate checks.
   */
  async getEToroPreflight(runId, mode = 'demo') {
    const res = await fetch(`${API_BASE}/etoro/preflight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ run_id: runId, mode }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Preflight check failed');
    }
    return await res.json();
  },

  /**
   * eToro Automated Trading: Execute MIT limit orders for selected candidates.
   */
  async executeEToroOrders(runId, selectedSymbols = null, strategy = 'adaptive', mode = 'demo') {
    const payload = {
      run_id: runId,
      mode,
      strategy,
      selected_symbols: selectedSymbols,
    };
    const res = await fetch(`${API_BASE}/etoro/execute-run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Execution failed');
    }
    return await res.json();
  },

  /**
   * eToro Automated Trading: Retrieve past execution receipts for a run.
   */
  async getEToroRunOrders(runId) {
    const res = await fetch(`${API_BASE}/etoro/orders/${encodeURIComponent(runId)}`);
    if (!res.ok) throw new Error('Failed to fetch eToro orders');
    return await res.json();
  },

  /**
   * eToro Automated Trading: Retrieve all executed DAG runs on eToro Demo with full orders.
   */
  async getEToroExecutedRuns() {
    try {
      const res = await fetch(`${API_BASE}/etoro/executed-runs`);
      if (!res.ok) return { runs: [], count: 0 };
      return await res.json();
    } catch (err) {
      console.warn('Could not fetch executed eToro runs:', err);
      return { runs: [], count: 0 };
    }
  },

  /**
   * eToro Automated Trading: Delete execution data of a specific run from Firestore.
   */
  async deleteEToroExecutedRun(runId) {
    const res = await fetch(`${API_BASE}/etoro/executed-runs/${encodeURIComponent(runId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      // Fallback to POST
      const res2 = await fetch(`${API_BASE}/etoro/executed-runs/${encodeURIComponent(runId)}/delete`, {
        method: 'POST',
      });
      if (!res2.ok) throw new Error('Errore durante la rimozione del run eseguito');
      return await res2.json();
    }
    return await res.json();
  },

  /**
   * eToro Automated Trading: Clear all executed runs from Firestore.
   */
  async clearAllEToroExecutedRuns() {
    const res = await fetch(`${API_BASE}/etoro/executed-runs`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const res2 = await fetch(`${API_BASE}/etoro/clear-executed-runs`, {
        method: 'POST',
      });
      if (!res2.ok) throw new Error('Errore durante la cancellazione dei run eseguiti');
      return await res2.json();
    }
    return await res.json();
  },

  /**
   * eToro Automated Trading: Retrieve live open positions currently active on eToro.
   */
  async getEToroPositions(mode = 'demo') {
    try {
      const res = await fetch(`${API_BASE}/etoro/positions?mode=${encodeURIComponent(mode)}`);
      if (!res.ok) return { positions: [], total: 0, symbols: [] };
      return await res.json();
    } catch (err) {
      console.warn('Could not fetch active eToro positions:', err);
      return { positions: [], total: 0, symbols: [] };
    }
  },

  /**
   * eToro Automated Trading: Retrieve closed trades history (realized P&L, after-hours stops, etc.).
   */
  async getEToroTradeHistory(mode = 'demo', page = 1, pageSize = 50) {
    try {
      const res = await fetch(`${API_BASE}/etoro/history?mode=${encodeURIComponent(mode)}&page=${page}&page_size=${pageSize}`);
      if (!res.ok) return { trades: [], total: 0 };
      return await res.json();
    } catch (err) {
      console.warn('Could not fetch eToro trade history:', err);
      return { trades: [], total: 0 };
    }
  },

  /**
   * eToro Automated Trading: Retrieve live open positions and pending orders matching a specific Run.
   */
  async getRunActiveBrokerItems(runId, mode = 'demo') {
    const res = await fetch(`${API_BASE}/etoro/run-active-items/${encodeURIComponent(runId)}?account=${encodeURIComponent(mode)}`);
    if (!res.ok) throw new Error('Failed to fetch active broker items for run');
    return await res.json();
  },

  /**
   * eToro Automated Trading: Close positions at market price and cancel pending orders for a Run.
   */
  async closeRunPositions(payload) {
    const res = await fetch(`${API_BASE}/etoro/close-run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Failed to close positions on eToro');
    }
    return await res.json();
  },

  /**
   * Alpha Harvest Agent: Trigger portfolio exit scan.
   */
  async triggerHarvestScan(account = 'demo') {
    const res = await fetch(`${API_BASE}/harvest/scan-portfolio?account=${encodeURIComponent(account)}`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Errore durante la scansione Alpha Harvest');
    }
    return await res.json();
  },

  /**
   * Alpha Harvest Agent: Get active harvest signals by position ID.
   */
  async getHarvestActiveSignals() {
    try {
      const res = await fetch(`${API_BASE}/harvest/active-signals`);
      if (!res.ok) return { active_signals: {}, count: 0 };
      return await res.json();
    } catch (err) {
      console.warn('Could not fetch harvest active signals:', err);
      return { active_signals: {}, count: 0 };
    }
  },

  /**
   * Alpha Harvest Agent: Get recent clinical reviews.
   */
  async getHarvestReviews(limit = 50) {
    try {
      const res = await fetch(`${API_BASE}/harvest/reviews?limit=${limit}`);
      if (!res.ok) return { reviews: [], total: 0 };
      return await res.json();
    } catch (err) {
      console.warn('Could not fetch harvest reviews:', err);
      return { reviews: [], total: 0 };
    }
  },

  /**
   * Alpha Harvest Agent: Get institutional KPI metrics.
   */
  async getHarvestKPIs() {
    try {
      const res = await fetch(`${API_BASE}/harvest/kpis`);
      if (!res.ok) return { total_harvested_capital_usd: 0, protected_locked_profit_usd: 0, extra_alpha_usd: 0, total_reviews: 0 };
      return await res.json();
    } catch (err) {
      console.warn('Could not fetch harvest KPIs:', err);
      return { total_harvested_capital_usd: 0, protected_locked_profit_usd: 0, extra_alpha_usd: 0, total_reviews: 0 };
    }
  },

  /**
   * Alpha Harvest Agent: Get pending reinvestment proposals.
   */
  async getHarvestProposals() {
    try {
      const res = await fetch(`${API_BASE}/harvest/reinvestment-proposals`);
      if (!res.ok) return { proposals: [], total: 0 };
      return await res.json();
    } catch (err) {
      console.warn('Could not fetch reinvestment proposals:', err);
      return { proposals: [], total: 0 };
    }
  },

  /**
   * Alpha Harvest Agent: Trader response to reinvestment proposal (APPROVE/REJECT).
   */
  async respondToHarvestProposal(proposalId, decision, notes = '') {
    const res = await fetch(`${API_BASE}/harvest/reinvestment-proposals/${encodeURIComponent(proposalId)}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, notes }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Errore durante l invio della decisione');
    }
    return await res.json();
  },

  /**
   * Alpha Harvest Agent: Clear / reset pending proposals.
   */
  async clearHarvestProposals() {
    const res = await fetch(`${API_BASE}/harvest/reinvestment-proposals/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Errore durante la pulizia delle proposte');
    }
    return await res.json();
  },
};



