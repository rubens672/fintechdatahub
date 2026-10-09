import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

// Row 1: Raggruppamento ordinato: 1. Indici Benchmark Ufficiali USA -> 2. Titoli di Stato -> 3. Volatilità -> 4. Materie Prime & Altri
const ROW1_INSTITUTIONAL_CONFIG = [
  // 1. Indici Benchmark USA Ufficiali
  { symbol: '^DJI', label: 'Dow Jones', tag: '^DJI', badge: 'BENCHMARK', group: 'benchmark' },
  { symbol: '^GSPC', label: 'S&P 500', tag: '^GSPC', badge: 'BENCHMARK', group: 'benchmark' },
  { symbol: '^IXIC', label: 'Nasdaq Comp', tag: '^IXIC', badge: 'BENCHMARK', group: 'benchmark' },
  { symbol: '^RUT', label: 'Russell 2000', tag: '^RUT', badge: 'BENCHMARK', group: 'benchmark' },
  // 2. Titoli di Stato & Tassi Treasury
  { symbol: '^TNX', label: '10Y Treasury Yield', tag: '^TNX', badge: 'TASSI', group: 'bonds' },
  { symbol: 'TLT', label: '20Y+ Treasury Bond', tag: 'TLT', badge: 'GOV BOND', group: 'bonds' },
  { symbol: 'SHY', label: '1-3Y Treasury Bond', tag: 'SHY', badge: 'SHORT BOND', group: 'bonds' },
  // 3. Volatilità
  { symbol: '^VIX', label: 'VIX Volatility', tag: '^VIX', badge: 'VOLATILITÀ', group: 'vix' },
  // 4. Materie Prime & Altri Asset
  { symbol: 'GLD', label: 'Gold SPDR', tag: 'GC=F', badge: 'ORO', group: 'commodity' },
  { symbol: 'SLV', label: 'Silver Trust', tag: 'SI=F', badge: 'ARGENTO', group: 'commodity' },
  { symbol: 'USO', label: 'Crude Oil WTI', tag: 'CL=F', badge: 'PETROLIO', group: 'commodity' },
  { symbol: 'UNG', label: 'US Natural Gas', tag: 'NG=F', badge: 'GAS', group: 'commodity' },
  { symbol: 'CPER', label: 'Copper Fund', tag: 'HG=F', badge: 'RAME', group: 'commodity' },
  { symbol: 'BTC-USD', label: 'Bitcoin USD', tag: 'BTC-USD', badge: 'CRYPTO', group: 'commodity' },
];

// Row 2: I Maggiori Titoli Azionari della Borsa (Mega-Cap & Leaders)
const ROW2_EQUITIES_CONFIG = [
  { symbol: 'TSLA', label: 'Tesla Inc', tag: 'TSLA', badge: 'EV / AUTO', group: 'equity' },
  { symbol: 'AAPL', label: 'Apple Inc', tag: 'AAPL', badge: 'TECH', group: 'equity' },
  { symbol: 'MSFT', label: 'Microsoft Corp', tag: 'MSFT', badge: 'CLOUD', group: 'equity' },
  { symbol: 'NVDA', label: 'Nvidia Corp', tag: 'NVDA', badge: 'AI / CHIPS', group: 'equity' },
  { symbol: 'ORCL', label: 'Oracle Corp', tag: 'ORCL', badge: 'DATABASE', group: 'equity' },
  { symbol: 'AMZN', label: 'Amazon.com', tag: 'AMZN', badge: 'ECOMM', group: 'equity' },
  { symbol: 'GOOGL', label: 'Alphabet Inc', tag: 'GOOGL', badge: 'AI / WEB', group: 'equity' },
  { symbol: 'META', label: 'Meta Platforms', tag: 'META', badge: 'SOCIAL', group: 'equity' },
  { symbol: 'AVGO', label: 'Broadcom Inc', tag: 'AVGO', badge: 'CHIPS', group: 'equity' },
  { symbol: 'AMD', label: 'Advanced Micro', tag: 'AMD', badge: 'CHIPS', group: 'equity' },
  { symbol: 'PLTR', label: 'Palantir Tech', tag: 'PLTR', badge: 'AI / DATA', group: 'equity' },
  { symbol: 'CRM', label: 'Salesforce Inc', tag: 'CRM', badge: 'SAAS', group: 'equity' },
  { symbol: 'NFLX', label: 'Netflix Inc', tag: 'NFLX', badge: 'MEDIA', group: 'equity' },
  { symbol: 'JPM', label: 'JPMorgan Chase', tag: 'JPM', badge: 'BANKING', group: 'equity' },
  { symbol: 'LLY', label: 'Eli Lilly', tag: 'LLY', badge: 'PHARMA', group: 'equity' },
  { symbol: 'BRK-B', label: 'Berkshire Hathaway', tag: 'BRK.B', badge: 'VALUE', group: 'equity' },
];

// Row 3: Raggruppamento ordinato: 1. Mercati Europei Ufficiali -> 2. Asia ed Emergenti Ufficiali -> 3. Valute / Forex
const ROW3_GLOBAL_CONFIG = [
  // 1. Indici Ufficiali Europa
  { symbol: '^STOXX50E', label: 'Euro Stoxx 50', tag: '^STOXX50E', badge: 'EUROPA', group: 'europe' },
  { symbol: '^GDAXI', label: 'DAX 40 Germania', tag: '^GDAXI', badge: 'GERMANIA', group: 'europe' },
  { symbol: 'FTSEMIB.MI', label: 'FTSE MIB Italia', tag: 'FTSEMIB.MI', badge: 'ITALIA', group: 'europe' },
  { symbol: '^FTSE', label: 'FTSE 100 UK', tag: '^FTSE', badge: 'UK', group: 'europe' },
  { symbol: '^FCHI', label: 'CAC 40 Francia', tag: '^FCHI', badge: 'FRANCIA', group: 'europe' },
  { symbol: '^IBEX', label: 'IBEX 35 Spagna', tag: '^IBEX', badge: 'SPAGNA', group: 'europe' },
  { symbol: '^SSMI', label: 'SMI Svizzera', tag: '^SSMI', badge: 'SVIZZERA', group: 'europe' },
  // 2. Indici Ufficiali Asia ed Emergenti
  { symbol: '^N225', label: 'Nikkei 225 Giappone', tag: '^N225', badge: 'GIAPPONE', group: 'asia' },
  { symbol: '^HSI', label: 'Hang Seng Hong Kong', tag: '^HSI', badge: 'CINA', group: 'asia' },
  { symbol: '^NSEI', label: 'Nifty 50 India', tag: '^NSEI', badge: 'INDIA', group: 'asia' },
  { symbol: '^STI', label: 'Straits Times SG', tag: '^STI', badge: 'SINGAPORE', group: 'asia' },
  { symbol: '^AXJO', label: 'ASX 200 Australia', tag: '^AXJO', badge: 'AUSTRALIA', group: 'asia' },
  // 3. Valute / Forex
  { symbol: 'EURUSD=X', label: 'EUR / USD', tag: 'EUR/USD', badge: 'FOREX', group: 'forex' },
  { symbol: 'GBPUSD=X', label: 'GBP / USD', tag: 'GBP/USD', badge: 'FOREX', group: 'forex' },
  { symbol: 'USDJPY=X', label: 'USD / JPY', tag: 'USD/JPY', badge: 'FOREX', group: 'forex' },
  { symbol: 'USDCHF=X', label: 'USD / CHF', tag: 'USD/CHF', badge: 'FOREX', group: 'forex' },
];

const SWR_CACHE_KEY = 'FINTECH_MARQUEE_PERSISTENT_CACHE_V2';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours persistent cache for instant initial render

const loadCachedMarquee = () => {
  try {
    const raw = localStorage.getItem(SWR_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Date.now() - (parsed.timestamp || 0) < CACHE_TTL_MS) {
        return parsed;
      }
    }
  } catch (e) {
    // localStorage not accessible
  }
  return null;
};

const saveRowToCache = (rowKey, data) => {
  try {
    const raw = localStorage.getItem(SWR_CACHE_KEY);
    const cached = raw ? JSON.parse(raw) : { timestamp: Date.now() };
    cached[rowKey] = data;
    cached.timestamp = Date.now();
    localStorage.setItem(SWR_CACHE_KEY, JSON.stringify(cached));
  } catch (e) {
    // ignore quota/disabled errors
  }
};

const buildInitialRow = (configList, cachedItems) => {
  if (cachedItems && Array.isArray(cachedItems) && cachedItems.length === configList.length) {
    return cachedItems.map((item) => ({
      ...item,
      isShimmer: false,
    }));
  }
  return configList.map((cfg) => ({
    symbol: cfg.tag || cfg.symbol,
    ticker: cfg.symbol,
    name: cfg.label,
    badge: cfg.badge,
    group: cfg.group,
    price: null,
    change: 0,
    change_p: 0,
    is_positive: true,
    sparkline: [],
    isShimmer: true,
  }));
};

export function YahooMarketMarquee({ onSelectSymbol, activeSymbol }) {
  const cached = React.useMemo(() => loadCachedMarquee(), []);

  const [row1Data, setRow1Data] = useState(() => buildInitialRow(ROW1_INSTITUTIONAL_CONFIG, cached?.row1));
  const [row2Data, setRow2Data] = useState(() => buildInitialRow(ROW2_EQUITIES_CONFIG, cached?.row2));
  const [row3Data, setRow3Data] = useState(() => buildInitialRow(ROW3_GLOBAL_CONFIG, cached?.row3));

  const rowsRef = React.useRef({ r1: row1Data, r2: row2Data, r3: row3Data });
  useEffect(() => {
    rowsRef.current = { r1: row1Data, r2: row2Data, r3: row3Data };
  }, [row1Data, row2Data, row3Data]);

  const fetchBatchRow = async (configList, rowKey, currentRow) => {
    const symbols = configList.map((c) => c.symbol);
    try {
      const res = await api.getBatchSparklines(symbols, '1d', '5m');
      const itemsMap = (res && res.items) || {};

      const updated = configList.map((cfg, idx) => {
        const live = itemsMap[cfg.symbol];
        const existing = currentRow && currentRow[idx];

        // 1. Live data with authentic sparkline
        if (live && live.sparkline && live.sparkline.length >= 2) {
          return {
            symbol: cfg.tag || cfg.symbol,
            ticker: cfg.symbol,
            name: cfg.label,
            badge: cfg.badge,
            group: cfg.group,
            price: live.price,
            change: live.change,
            change_p: live.change_p,
            is_positive: live.is_positive,
            sparkline: live.sparkline,
            isShimmer: false,
          };
        }

        // 2. Preserve existing valid card data if live response was delayed or partial
        if (existing && existing.sparkline && existing.sparkline.length >= 2 && existing.price) {
          return {
            ...existing,
            price: (live?.price !== undefined && live?.price !== null) ? live.price : existing.price,
            change: (live?.change !== undefined && live?.change !== null) ? live.change : existing.change,
            change_p: (live?.change_p !== undefined && live?.change_p !== null) ? live.change_p : existing.change_p,
            is_positive: (live?.change !== undefined && live?.change !== null) ? (live.change >= 0) : existing.is_positive,
            isShimmer: false,
          };
        }

        // 3. Fallback to basic live quote
        return {
          symbol: cfg.tag || cfg.symbol,
          ticker: cfg.symbol,
          name: cfg.label,
          badge: cfg.badge,
          group: cfg.group,
          price: live?.price ?? (existing?.price ?? null),
          change: live?.change ?? (existing?.change ?? 0),
          change_p: live?.change_p ?? (existing?.change_p ?? 0),
          is_positive: (live?.change ?? 0) >= 0,
          sparkline: (live?.sparkline && live.sparkline.length >= 2) ? live.sparkline : (existing?.sparkline || []),
          isShimmer: false,
        };
      });

      saveRowToCache(rowKey, updated);
      return updated;
    } catch (err) {
      console.warn(`Error loading batch sparklines for ${rowKey}:`, err);
      return null;
    }
  };

  const loadAllRows = () => {
    // Stagger row requests to prevent socket congestion and API rate-limiting
    fetchBatchRow(ROW1_INSTITUTIONAL_CONFIG, 'row1', rowsRef.current.r1).then((r1) => {
      if (r1) setRow1Data(r1);
    });

    const timer2 = setTimeout(() => {
      fetchBatchRow(ROW2_EQUITIES_CONFIG, 'row2', rowsRef.current.r2).then((r2) => {
        if (r2) setRow2Data(r2);
      });
    }, 450);

    const timer3 = setTimeout(() => {
      fetchBatchRow(ROW3_GLOBAL_CONFIG, 'row3', rowsRef.current.r3).then((r3) => {
        if (r3) setRow3Data(r3);
      });
    }, 900);

    return () => {
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  };

  useEffect(() => {
    loadAllRows();
    // 60-second refresh cycle for stable real-time updates without thrashing
    const interval = setInterval(loadAllRows, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (p) => {
    if (p === undefined || p === null) return '--';
    if (typeof p !== 'number') {
      const parsed = parseFloat(p);
      if (isNaN(parsed)) return '--';
      p = parsed;
    }
    if (p < 5.0) {
      return p.toFixed(4);
    }
    if (p >= 1000) {
      return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return p.toFixed(2);
  };

  const renderSparkline = (points, isPos, uniqueKey) => {
    if (!points || points.length < 2) return null;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const w = 60;
    const h = 19;

    const pts = points.map((p, i) => ({
      x: (i / (points.length - 1)) * w,
      y: h - ((p - min) / range) * (h - 4.5) - 2.2,
    }));

    // Build smooth cubic bezier curve
    let pathD = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cpx = (p0.x + p1.x) / 2;
      pathD += ` C ${cpx.toFixed(1)},${p0.y.toFixed(1)} ${cpx.toFixed(1)},${p1.y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
    }

    const strokeColor = isPos ? '#10b981' : '#ef4444';
    const fillArea = `${pathD} L ${w},${h} L 0,${h} Z`;
    const gradId = `spark-grad-${uniqueKey}-${isPos ? 'pos' : 'neg'}`;

    return (
      <svg width={w} height={h} className="marquee-sparkline-svg" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={fillArea} fill={`url(#${gradId})`} />
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="1.6" fill={strokeColor} />
      </svg>
    );
  };

  const renderMarqueeCard = (item, idx, rowPrefix, cardBaseClass, pillClass) => {
    if (item.isShimmer) {
      return (
        <div
          key={`${rowPrefix}-shimmer-${item.symbol}-${idx}`}
          className={`yahoo-index-card shimmer-card ${cardBaseClass}`}
        >
          <div className="index-card-info">
            <div className="index-top-line">
              <span className="index-symbol font-mono" style={{ opacity: 0.65 }}>{item.symbol}</span>
              <div className="marquee-shimmer-badge" />
            </div>
            <div className="marquee-shimmer-name" />
            <div className="index-price-line">
              <div className="marquee-shimmer-price" />
            </div>
          </div>
          <div className="index-card-spark">
            <div className="marquee-shimmer-spark" />
          </div>
        </div>
      );
    }

    const itemSym = String(item.symbol || item.ticker || '');
    const isSelected =
      activeSymbol === item.ticker ||
      activeSymbol === item.symbol ||
      (Boolean(activeSymbol) && itemSym && String(activeSymbol).toUpperCase().includes(itemSym.replace('^', '').toUpperCase()));
    const isPos = Boolean(item.is_positive);

    return (
      <div
        key={`${rowPrefix}-${item.symbol}-${idx}`}
        className={`yahoo-index-card ${cardBaseClass} ${item.group ? `group-${item.group}` : ''} ${isSelected ? 'active-index' : ''}`}
        onClick={() => onSelectSymbol && onSelectSymbol(item.ticker || item.symbol)}
        title={`Clicca per aprire il grafico di ${item.name}`}
      >
        <div className="index-card-info">
          <div className="index-top-line">
            <span className="index-symbol font-mono">{item.symbol}</span>
            {item.badge && <span className={`index-category-pill ${pillClass || `pill-${item.group}`}`}>{item.badge}</span>}
          </div>
          <span className="index-name">{item.name}</span>
          <div className="index-price-line">
            <span className="index-price font-mono">{formatPrice(item.price)}</span>
            <span className={`index-delta-badge font-mono ${isPos ? 'positive' : 'negative'}`}>
              {isPos ? '+' : ''}{typeof item.change_p === 'number' ? `${item.change_p.toFixed(2)}%` : `${item.change_p}%`}
            </span>
          </div>
        </div>

        <div className="index-card-spark">
          {renderSparkline(item.sparkline, isPos, `${rowPrefix}-${item.symbol}-${idx}`)}
        </div>
      </div>
    );
  };

  // Duplicate arrays for continuous infinite marquee loop
  const loop1 = [...row1Data, ...row1Data];
  const loop2 = [...row2Data, ...row2Data];
  const loop3 = [...row3Data, ...row3Data];

  return (
    <div className="yahoo-marquee-dual-wrapper glass-panel">
      {/* Row 1: 1. Benchmark -> 2. Titoli di Stato -> 3. Volatilità -> 4. Materie Prime & Altri */}
      <div className="yahoo-marquee-row">
        <div className="yahoo-marquee-header us-theme">
          <div className="yahoo-badge">
            <div className="badge-title-row">
              <span className="yahoo-live-dot inst-dot" />
              <span className="yahoo-brand-text inst-text">US INSTITUTIONAL</span>
            </div>
            <span className="yahoo-sub-text">BENCHMARKS / TASSI / COMMODITY</span>
          </div>
        </div>

        <div className="yahoo-marquee-track-container">
          <div className="yahoo-marquee-track auto-marquee-row1">
            {loop1.map((item, idx) => renderMarqueeCard(item, idx, 'r1', 'inst-card', `pill-${item.group}`))}
          </div>
        </div>
      </div>

      {/* Row 2: I Maggiori Titoli Azionari della Borsa (Mega-Cap Leaders) */}
      <div className="yahoo-marquee-row second-row">
        <div className="yahoo-marquee-header equity-theme">
          <div className="yahoo-badge">
            <div className="badge-title-row">
              <span className="yahoo-live-dot equity-dot" />
              <span className="yahoo-brand-text equity-text">TOP US EQUITIES</span>
            </div>
            <span className="yahoo-sub-text">MEGA-CAP LEADERS</span>
          </div>
        </div>

        <div className="yahoo-marquee-track-container">
          <div className="yahoo-marquee-track auto-marquee-row2">
            {loop2.map((item, idx) => renderMarqueeCard(item, idx, 'r2', 'equity-card', 'equity-pill'))}
          </div>
        </div>
      </div>

      {/* Row 3: 1. Europa -> 2. Asia ed Emergenti -> 3. Valute / Forex */}
      <div className="yahoo-marquee-row second-row">
        <div className="yahoo-marquee-header global-theme">
          <div className="yahoo-badge">
            <div className="badge-title-row">
              <span className="yahoo-live-dot global-dot" />
              <span className="yahoo-brand-text global-text">GLOBAL & FOREX</span>
            </div>
            <span className="yahoo-sub-text">EUROPE / ASIA / FX</span>
          </div>
        </div>

        <div className="yahoo-marquee-track-container">
          <div className="yahoo-marquee-track auto-marquee-row3">
            {loop3.map((item, idx) => renderMarqueeCard(item, idx, 'r3', 'global-card', `pill-${item.group}`))}
          </div>
        </div>
      </div>
    </div>
  );
}
