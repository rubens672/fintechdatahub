import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useMarketWebSocket
 * 
 * High-frequency real-time WebSocket hook connecting to FastAPI `/ws/market`.
 * Emulates a Bloomberg Terminal streaming data feed (Zero-Polling).
 * 
 * Features:
 * - Single persistent WebSocket connection with auto-reconnect & exponential backoff.
 * - Auto protocol detection (ws:// vs wss://) and dev port mapping.
 * - Dynamic symbol subscription (watches active portfolio + eToro tranches).
 * - Real-time green/red tick flash transient state (750ms decay).
 * - Heartbeat keep-alive ping every 25 seconds.
 */
export function useMarketWebSocket({ symbols = [], initialPrices = {}, isCockpit = false } = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [livePrices, setLivePrices] = useState({});
  const [livePositions, setLivePositions] = useState([]);
  const [tickFlashes, setTickFlashes] = useState({});
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(null);

  const [marketSession, setMarketSession] = useState(null);

  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const flashTimeoutsRef = useRef({});
  const backoffRef = useRef(1000);
  const symbolsRef = useRef(symbols);
  const initialPricesRef = useRef(initialPrices);

  // Keep symbols and initial prices ref up to date and subscribe
  useEffect(() => {
    symbolsRef.current = symbols;
    initialPricesRef.current = initialPrices;
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && symbols.length > 0) {
      socketRef.current.send(JSON.stringify({
        action: 'subscribe',
        symbols,
        initial_prices: initialPrices || {},
      }));
    }
  }, [symbols, initialPrices]);

  // Compute WebSocket URL
  const getWsUrl = useCallback(() => {
    const loc = window.location;
    const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // In local Vite dev server (ports 5173/5174), connect directly to backend port
    let host = loc.host;
    if (loc.port === '5173') {
      host = `${loc.hostname}:8001`; // Cockpit backend
    } else if (loc.port === '5174') {
      host = `${loc.hostname}:8002`; // User portal backend
    } else if (isCockpit && !loc.port) {
      // Deployed or custom
      host = loc.host;
    }

    return `${protocol}//${host}/ws/market`;
  }, [isCockpit]);

  // Trigger transient flash on price change
  const triggerTickFlashes = useCallback((ticks) => {
    const newFlashes = {};

    Object.entries(ticks).forEach(([sym, tick]) => {
      // Do not flash if market is closed or direction is FLAT
      if (tick.market_status === 'CLOSED' || !tick.direction || tick.direction === 'FLAT') {
        return;
      }

      const dir = tick.direction;
      if (dir === 'UP') {
        newFlashes[sym] = 'tick-flash-green';
      } else if (dir === 'DOWN') {
        newFlashes[sym] = 'tick-flash-red';
      }

      // Clear existing timeout for this symbol
      if (flashTimeoutsRef.current[sym]) {
        clearTimeout(flashTimeoutsRef.current[sym]);
      }

      // Set timeout to clear flash after 750ms
      flashTimeoutsRef.current[sym] = setTimeout(() => {
        setTickFlashes((prev) => {
          if (!prev[sym]) return prev;
          const next = { ...prev };
          delete next[sym];
          return next;
        });
      }, 750);
    });

    if (Object.keys(newFlashes).length > 0) {
      setTickFlashes((prev) => ({ ...prev, ...newFlashes }));
    }
  }, []);

  // Helper to normalize any incoming price tick or dictionary
  const normalizePriceMap = useCallback((rawMap) => {
    if (!rawMap || typeof rawMap !== 'object') return {};
    const normalized = {};
    Object.entries(rawMap).forEach(([rawSym, val]) => {
      const clean = rawSym.replace('.US', '').trim().toUpperCase();
      let tickObj;
      if (typeof val === 'number') {
        tickObj = {
          symbol: clean,
          price: Number(val),
          change_p: 0.0,
          direction: 'FLAT',
          market_status: 'OPEN',
          timestamp: Date.now() / 1000,
        };
      } else if (val && typeof val === 'object') {
        tickObj = {
          symbol: clean,
          price: Number(val.price ?? val.rate ?? val.current_price ?? 0),
          change_p: Number(val.change_p ?? val.change_percent ?? 0.0),
          direction: val.direction || 'FLAT',
          market_status: val.market_status || 'OPEN',
          market_session: val.market_session || null,
          timestamp: val.timestamp || Date.now() / 1000,
        };
      }
      if (tickObj && tickObj.price > 0) {
        normalized[clean] = tickObj;
        normalized[`${clean}.US`] = tickObj;
      }
    });
    return normalized;
  }, []);

  // Proactively seed livePrices with valid candidate reference prices so there is zero dummy-price lag
  useEffect(() => {
    if (initialPrices && typeof initialPrices === 'object' && Object.keys(initialPrices).length > 0) {
      const seeded = normalizePriceMap(initialPrices);
      setLivePrices((prev) => {
        const next = { ...prev };
        let changed = false;
        Object.entries(seeded).forEach(([sym, tick]) => {
          if (!next[sym] || next[sym].price === 150.0 || next[sym].price <= 0) {
            next[sym] = tick;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [initialPrices, normalizePriceMap]);

  const connect = useCallback(() => {
    // If already open or connecting, do not duplicate
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const wsUrl = getWsUrl();
    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        backoffRef.current = 1000; // Reset backoff

        // Subscribe to currently requested symbols with candidate reference prices
        if (symbolsRef.current && symbolsRef.current.length > 0) {
          ws.send(JSON.stringify({
            action: 'subscribe',
            symbols: symbolsRef.current,
            initial_prices: initialPricesRef.current || {},
          }));
        }

        // Setup ping interval
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'ping' }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const type = msg.type;

          if (msg.market_session) {
            setMarketSession(msg.market_session);
          }

          if (type === 'INIT' || type === 'CONNECTION_ESTABLISHED') {
            const rawPrices = msg.initial_prices || msg.prices;
            if (rawPrices) {
              const normPrices = normalizePriceMap(rawPrices);
              setLivePrices((prev) => ({ ...prev, ...normPrices }));
            }
            const pos = msg.initial_positions || msg.positions;
            if (pos && Array.isArray(pos)) {
              setLivePositions(pos);
              const posPrices = {};
              pos.forEach((p) => {
                const sym = (p.symbol || p.symbolName || '').replace('.US', '').toUpperCase().trim();
                const rate = Number(p.current_rate || p.currentRate || p.open_rate || p.openRate || 0);
                const chgP = p.daily_change_p !== undefined ? Number(p.daily_change_p) : (p.pnl_percent !== undefined ? Number(p.pnl_percent) : 0);
                if (sym && rate > 0) {
                  const tickObj = {
                    symbol: sym,
                    price: rate,
                    change_p: chgP,
                    direction: 'FLAT',
                    timestamp: msg.timestamp || Date.now() / 1000,
                  };
                  posPrices[sym] = tickObj;
                  posPrices[`${sym}.US`] = tickObj;
                }
              });
              if (Object.keys(posPrices).length > 0) {
                setLivePrices((prev) => ({ ...prev, ...posPrices }));
              }
            }
            setLastUpdateTimestamp(msg.timestamp || Date.now() / 1000);
          } else if (type === 'TICKS' || type === 'PRICE_TICKS') {
            const rawTicks = msg.data || msg.ticks;
            if (rawTicks) {
              const normTicks = normalizePriceMap(rawTicks);
              setLivePrices((prev) => ({ ...prev, ...normTicks }));
              triggerTickFlashes(normTicks);
            }
            setLastUpdateTimestamp(msg.timestamp || Date.now() / 1000);
          } else if (type === 'POSITIONS' || type === 'ETORO_POSITIONS') {
            const posData = msg.data;
            const posList = Array.isArray(posData) ? posData : (posData?.positions || []);
            if (Array.isArray(posList)) {
              setLivePositions(posList);
              const posPrices = {};
              posList.forEach((p) => {
                const sym = (p.symbol || p.symbolName || '').replace('.US', '').toUpperCase().trim();
                const rate = Number(p.current_rate || p.currentRate || p.open_rate || p.openRate || 0);
                const chgP = p.daily_change_p !== undefined ? Number(p.daily_change_p) : (p.pnl_percent !== undefined ? Number(p.pnl_percent) : 0);
                if (sym && rate > 0) {
                  const tickObj = {
                    symbol: sym,
                    price: rate,
                    change_p: chgP,
                    direction: 'FLAT',
                    timestamp: msg.timestamp || Date.now() / 1000,
                  };
                  posPrices[sym] = tickObj;
                  posPrices[`${sym}.US`] = tickObj;
                }
              });
              if (Object.keys(posPrices).length > 0) {
                setLivePrices((prev) => ({ ...prev, ...posPrices }));
              }
            }
          }
        } catch (err) {
          // ignore malformed frame
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

        // Exponential backoff reconnect
        const delay = Math.min(backoffRef.current, 10000);
        backoffRef.current = Math.min(backoffRef.current * 1.5, 10000);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      setIsConnected(false);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  }, [getWsUrl, triggerTickFlashes, normalizePriceMap]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      Object.values(flashTimeoutsRef.current).forEach((t) => clearTimeout(t));
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [connect]);

  // Robust REST polling fallback (3.5s interval) ensuring prices NEVER stall even if WebSocket reconnects
  useEffect(() => {
    let isMounted = true;
    const fetchTicks = async () => {
      try {
        const res = await fetch('/api/market/ticks');
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.ticks && typeof json.ticks === 'object') {
            const normTicks = normalizePriceMap(json.ticks);
            setLivePrices((prev) => ({ ...prev, ...normTicks }));
            triggerTickFlashes(normTicks);
            if (json.positions && Array.isArray(json.positions)) {
              setLivePositions(json.positions);
            }
            if (json.market_session) {
              setMarketSession(json.market_session);
            }
            setLastUpdateTimestamp(json.timestamp || Date.now() / 1000);
          }
        }
      } catch (e) {
        // Silent fallback resilience
      }
    };

    fetchTicks();
    const intervalId = setInterval(fetchTicks, 3500);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [normalizePriceMap, triggerTickFlashes]);

  return {
    isConnected,
    livePrices,
    livePositions,
    tickFlashes,
    marketSession,
    lastUpdateTimestamp,
  };
}
